/** The four candidate looks, each built from the same Region. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BLOCKS, WATER_STRENGTH } from '../world/blocks';
import type { Region } from './region';
import { exposedBlocks, flatBlockMesh, surfaceNets, type Palette } from './meshers';

export interface StyleScene {
  scene: THREE.Scene;
  /** Optional custom render (post-processing). */
  render?: (renderer: THREE.WebGLRenderer, camera: THREE.Camera) => void;
  setup?: (renderer: THREE.WebGLRenderer) => void;
}

const hex = (h: number) => new THREE.Color(h);

function palette(colors: Record<string, [number, number?]>, fallback = 0x9a9a9a): Palette {
  return (id, face) => {
    const key = BLOCKS[id]?.key ?? 'stone';
    const k = key.startsWith('water') ? 'water' : key;
    const pair = colors[k];
    if (!pair) return hex(fallback);
    return hex(face === 'top' || pair[1] === undefined ? pair[0] : pair[1]);
  };
}

function lights(
  scene: THREE.Scene,
  sun: number,
  sky: number,
  ground: number,
  sunI = 2.2,
  hemiI = 1,
): THREE.DirectionalLight {
  const d = new THREE.DirectionalLight(sun, sunI);
  d.position.set(-30, 60, 25);
  scene.add(d, new THREE.HemisphereLight(sky, ground, hemiI));
  return d;
}

function centre(r: Region): THREE.Vector3 {
  return new THREE.Vector3(
    r.x0 + r.size / 2,
    r.surface(r.x0 + r.size / 2, r.z0 + r.size / 2),
    r.z0 + r.size / 2,
  );
}

// -------------------------------------------------------------------------------------------
// A. Ink & Wash: toon bands, ink outlines, paper grain (Sumi-e / ukiyo-e / comic line art).

const INK = palette({
  grass: [0x9db58a, 0x8f9572],
  dirt: [0x8a7a62],
  sand: [0xe6d6b0, 0xd9c79e],
  stone: [0xb8b4aa],
  cobblestone: [0xa9a59c],
  gravel: [0xaaa49a],
  snow: [0xf6f1e6, 0xe9e2d2],
  log: [0x6e5440],
  leaves: [0x78a37e],
  planks: [0xc9a57a],
  glass: [0xd9eaea],
  brick: [0xc0533a],
  water: [0x5d8fa8],
  bedrock: [0x55534f],
  coal_ore: [0xb8b4aa],
  iron_ore: [0xb8b4aa],
  crystal_ore: [0xb8b4aa],
});

export function inkStyle(r: Region): StyleScene {
  const scene = new THREE.Scene();
  scene.background = hex(0xf2e8d5);
  scene.fog = new THREE.Fog(0xf2e8d5, 40, 95);
  const steps = new Uint8Array([90, 175, 255]);
  const grad = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  const { solid, water } = flatBlockMesh(r, INK, false);
  scene.add(new THREE.Mesh(solid, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad })));
  scene.add(
    new THREE.Mesh(
      water,
      new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad, transparent: true, opacity: 0.85 }),
    ),
  );
  lights(scene, 0xfff3dc, 0xfff7ea, 0xb9a98c, 2.4, 0.9);
  // Rising sun.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshBasicMaterial({ color: 0xd8573c, fog: false }),
  );
  const c = centre(r);
  sun.position.set(c.x - 10, c.y + 26, c.z - 60);
  scene.add(sun);

  let colorRT: THREE.WebGLRenderTarget, normalRT: THREE.WebGLRenderTarget;
  const normalMat = new THREE.MeshNormalMaterial();
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null },
      tNormal: { value: null },
      tDepth: { value: null },
      res: { value: new THREE.Vector2() },
      near: { value: 0.1 },
      far: { value: 400 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tColor; uniform sampler2D tNormal; uniform sampler2D tDepth;
      uniform vec2 res; uniform float near; uniform float far; varying vec2 vUv;
      float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0*near*far)/(far+near - z*(far-near)); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 px = 1.0 / res;
        float d = lin(vUv);
        float dd = 0.0; float nd = 0.0;
        vec3 n = texture2D(tNormal, vUv).xyz;
        for (int i = 0; i < 4; i++) {
          vec2 o = i == 0 ? vec2(px.x,0.) : i == 1 ? vec2(-px.x,0.) : i == 2 ? vec2(0.,px.y) : vec2(0.,-px.y);
          dd += abs(lin(vUv + o) - d);
          nd += distance(texture2D(tNormal, vUv + o).xyz, n);
        }
        float edge = clamp(step(0.06 * d, dd) + step(0.5, nd), 0.0, 1.0);
        vec3 col = texture2D(tColor, vUv).rgb;
        float grain = hash(floor(vUv * res / 2.0)) * 0.06 - 0.03;
        col = mix(col + grain, vec3(0.16, 0.13, 0.12), edge * 0.85);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  return {
    scene,
    setup(renderer) {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      colorRT = new THREE.WebGLRenderTarget(size.x, size.y, {
        depthTexture: new THREE.DepthTexture(size.x, size.y),
      });
      normalRT = new THREE.WebGLRenderTarget(size.x, size.y);
      mat.uniforms.res.value.copy(size);
    },
    render(renderer, camera) {
      const cam = camera as THREE.PerspectiveCamera;
      mat.uniforms.near.value = cam.near;
      mat.uniforms.far.value = cam.far;
      renderer.setRenderTarget(colorRT);
      renderer.render(scene, camera);
      scene.overrideMaterial = normalMat;
      const bg = scene.background;
      scene.background = hex(0x000000);
      renderer.setRenderTarget(normalRT);
      renderer.render(scene, camera);
      scene.overrideMaterial = null;
      scene.background = bg;
      mat.uniforms.tColor.value = colorRT.texture;
      mat.uniforms.tNormal.value = normalRT.texture;
      mat.uniforms.tDepth.value = colorRT.depthTexture;
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);
    },
  };
}

// -------------------------------------------------------------------------------------------
// B. Smooth Earth: surface-nets terrain, faceted low-poly shading.

const EARTH = palette({
  grass: [0x7fb069, 0x9a7b5b],
  dirt: [0x9a7b5b],
  sand: [0xe8d29b],
  stone: [0x8e8c8a],
  cobblestone: [0x8e8c8a],
  gravel: [0x9b968e],
  snow: [0xf4f6f8],
  log: [0x7a5b40],
  leaves: [0x4f9a5a],
  planks: [0xc8975f],
  brick: [0xb85c44],
  bedrock: [0x555555],
  coal_ore: [0x8e8c8a],
  iron_ore: [0x8e8c8a],
  crystal_ore: [0x8e8c8a],
});

export function earthStyle(r: Region): StyleScene {
  const scene = new THREE.Scene();
  scene.background = hex(0xa7d3f2);
  scene.fog = new THREE.Fog(0xa7d3f2, 45, 110);
  const geo = surfaceNets(r, EARTH);
  scene.add(
    new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }),
    ),
  );
  // Water: one flat sheet at sea level over water columns.
  const { water } = flatBlockMesh(r, () => hex(0x3f8fc4), false);
  scene.add(
    new THREE.Mesh(
      water,
      new THREE.MeshPhongMaterial({ color: 0x3f8fc4, transparent: true, opacity: 0.78, shininess: 80 }),
    ),
  );
  lights(scene, 0xfff1d6, 0xcfe8ff, 0x6b5a46, 2.4, 1.1);
  return { scene };
}

// -------------------------------------------------------------------------------------------
// C. Toybox diorama: rounded blocks, plain colours, soft shadows.

const TOY = palette({
  grass: [0x8cc66b],
  dirt: [0xb98a5e],
  sand: [0xf1dca7],
  stone: [0xb3b6bb],
  cobblestone: [0xa5a8ad],
  gravel: [0xb0aaa2],
  snow: [0xffffff],
  log: [0x9c6b45],
  leaves: [0x5dbb6a],
  planks: [0xe0b07a],
  glass: [0xbfe6f2],
  brick: [0xe0705a],
  water: [0x5bb6e8],
  bedrock: [0x666666],
  coal_ore: [0xb3b6bb],
  iron_ore: [0xb3b6bb],
  crystal_ore: [0x9fe3f5],
});

export function toyStyle(r: Region): StyleScene {
  const scene = new THREE.Scene();
  scene.background = hex(0xfde9d9);
  scene.fog = new THREE.Fog(0xfde9d9, 50, 120);
  const box = new RoundedBoxGeometry(0.96, 0.96, 0.96, 3, 0.14);
  const waterBox = new THREE.BoxGeometry(1, 0.8, 1);
  for (const [id, positions] of exposedBlocks(r)) {
    const isW = WATER_STRENGTH[id] > 0;
    const color = TOY(id, 'top')!;
    const mat = isW
      ? new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.8, shininess: 90 })
      : new THREE.MeshStandardMaterial({
          color,
          roughness: 0.75,
          metalness: 0,
          transparent: id === BLOCKS.findIndex((b) => b.key === 'glass'),
          opacity: 0.6,
        });
    if (!(mat as THREE.MeshStandardMaterial).transparent) (mat as THREE.Material).opacity = 1;
    const mesh = new THREE.InstancedMesh(isW ? waterBox : box, mat, positions.length);
    const m = new THREE.Matrix4();
    positions.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y - (isW ? 0.1 : 0), p.z)));
    mesh.castShadow = !isW;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  const d = lights(scene, 0xfff0dd, 0xffffff, 0xc9a98a, 2.6, 0.9);
  const c = centre(r);
  d.position.set(c.x - 25, c.y + 45, c.z + 20);
  d.target.position.copy(c);
  scene.add(d.target);
  d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048);
  const sc = d.shadow.camera;
  sc.left = sc.bottom = -r.size * 0.7;
  sc.right = sc.top = r.size * 0.7;
  sc.near = 1;
  sc.far = 150;
  d.shadow.bias = -0.0008;
  d.shadow.radius = 4;
  return {
    scene,
    setup(renderer) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    },
  };
}

// -------------------------------------------------------------------------------------------
// D. Pastel flat: untextured faces, soft gradient sky, dreamy palette (Islanders / Monument Valley mood).

const PASTEL = palette({
  grass: [0xa8d8a0, 0xe0b8a0],
  dirt: [0xe0b8a0],
  sand: [0xfbe3c0, 0xf3d3ad],
  stone: [0xc9c3d8],
  cobblestone: [0xbdb6cf],
  gravel: [0xcfc5c9],
  snow: [0xffffff, 0xeef0ff],
  log: [0xb08a7a],
  leaves: [0x8fcfa8],
  planks: [0xf2c6a0],
  glass: [0xd8f0ff],
  brick: [0xf09a8a],
  water: [0x8fc8f0],
  bedrock: [0x8a85a0],
  coal_ore: [0xc9c3d8],
  iron_ore: [0xc9c3d8],
  crystal_ore: [0xc9c3d8],
});

export function pastelStyle(r: Region): StyleScene {
  const scene = new THREE.Scene();
  // Vertical gradient sky via a big inverted sphere.
  const skyGeo = new THREE.SphereGeometry(300, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: hex(0x9db8f0) }, bottom: { value: hex(0xffd6e0) } },
    vertexShader:
      'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.1, 0.6, h)), 1.0); }',
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.copy(centre(r));
  scene.add(sky);
  scene.fog = new THREE.Fog(0xf6d8e4, 35, 100);
  const { solid, water } = flatBlockMesh(r, PASTEL, true);
  scene.add(new THREE.Mesh(solid, new THREE.MeshBasicMaterial({ vertexColors: true })));
  scene.add(
    new THREE.Mesh(
      water,
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 }),
    ),
  );
  return { scene };
}
