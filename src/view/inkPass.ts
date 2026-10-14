/**
 * "Ink & Wash" post-process: renders the scene once into an offscreen target, then draws it to
 * the screen with ink outlines and a light paper grain.
 *
 * Outlines come from the depth buffer alone (no second normals pass): silhouettes where depth
 * jumps, and creases where the surface normal, reconstructed from depth, changes direction.
 * Lines fade with distance so far-off terrain stays calm.
 */
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform vec2 texel;
  uniform float near;
  uniform float far;
  uniform mat4 projInv;
  uniform vec3 ink;
  uniform float strength;
  uniform float fadeStart;
  uniform float fadeEnd;
  uniform float grain;
  varying vec2 vUv;

  float rawDepth(vec2 uv) { return texture2D(tDepth, uv).x; }
  float linearDepth(float d) {
    float z = d * 2.0 - 1.0;
    return (2.0 * near * far) / (far + near - z * (far - near));
  }
  vec3 viewPos(vec2 uv, float d) {
    vec4 p = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
    return p.xyz / p.w;
  }
  vec3 normalAt(vec2 uv) {
    float d = rawDepth(uv);
    vec3 p = viewPos(uv, d);
    vec3 px = viewPos(uv + vec2(texel.x, 0.0), rawDepth(uv + vec2(texel.x, 0.0)));
    vec3 py = viewPos(uv + vec2(0.0, texel.y), rawDepth(uv + vec2(0.0, texel.y)));
    return normalize(cross(px - p, py - p));
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec4 src = texture2D(tColor, vUv);
    vec3 col = src.rgb;
    float d0 = rawDepth(vUv);
    float z0 = linearDepth(d0);

    vec2 offs[4];
    offs[0] = vec2(texel.x, 0.0);
    offs[1] = vec2(-texel.x, 0.0);
    offs[2] = vec2(0.0, texel.y);
    offs[3] = vec2(0.0, -texel.y);
    vec3 n0 = d0 < 1.0 ? normalAt(vUv) : vec3(0.0);
    float depthJump = 0.0;
    float crease = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 uv = vUv + offs[i];
      float d = rawDepth(uv);
      float z = linearDepth(d);
      // Relative depth jump: silhouettes against the sky and in front of distant things.
      depthJump = max(depthJump, abs(z - z0) / max(min(z, z0), 0.001));
      if (d0 < 1.0 && d < 1.0) crease = max(crease, 1.0 - dot(n0, normalAt(uv)));
    }
    float edge = max(step(0.035, depthJump), step(0.25, crease));
    #ifdef OVERLAY
    // Held item: lines only where the item is (its silhouette against the empty background
    // included), blended over the finished frame.
    float a = max(src.a, edge * strength);
    gl_FragColor = vec4(mix(col, ink, edge * strength / max(a, 0.001)), a);
    #include <colorspace_fragment>
    return;
    #endif
    // Fade lines out with distance.
    edge *= 1.0 - smoothstep(fadeStart, fadeEnd, z0);
    col = mix(col, ink, edge * strength);

    // Paper grain (static, in screen space) and a soft vignette.
    // Grain scales with brightness so night scenes don't turn into static.
    float g = hash(floor(gl_FragCoord.xy / 2.0)) - 0.5;
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col += g * grain * (0.15 + luma);
    vec2 v = vUv - 0.5;
    col *= 1.0 - dot(v, v) * 0.35;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export class InkPass {
  enabled = true;
  private target: THREE.WebGLRenderTarget;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private overlayTarget: THREE.WebGLRenderTarget;
  private readonly material: THREE.ShaderMaterial;
  private readonly overlayMaterial: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly clearColor = new THREE.Color();

  constructor(width: number, height: number) {
    this.target = this.makeTarget(width, height);
    this.overlayTarget = this.makeTarget(width, height);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: null },
        tDepth: { value: null },
        texel: { value: new THREE.Vector2(1 / width, 1 / height) },
        near: { value: 0.05 },
        far: { value: 1000 },
        projInv: { value: new THREE.Matrix4() },
        ink: { value: new THREE.Color(0x2a221d) },
        strength: { value: 0.85 },
        fadeStart: { value: 30 },
        fadeEnd: { value: 80 },
        grain: { value: 0.045 },
      },
    });
    this.overlayMaterial = this.material.clone();
    this.overlayMaterial.defines = { OVERLAY: 1 };
    this.overlayMaterial.transparent = true;
    this.overlayMaterial.uniforms.ink.value = new THREE.Color(0x2a221d);
    this.overlayMaterial.uniforms.strength.value = 0.9;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  private makeTarget(w: number, h: number): THREE.WebGLRenderTarget {
    const depthTexture = new THREE.DepthTexture(w, h);
    depthTexture.type = THREE.UnsignedIntType;
    return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthTexture });
  }

  setSize(width: number, height: number): void {
    this.target.dispose();
    this.overlayTarget.dispose();
    this.target = this.makeTarget(width, height);
    this.overlayTarget = this.makeTarget(width, height);
    this.material.uniforms.texel.value.set(1 / width, 1 / height);
    this.overlayMaterial.uniforms.texel.value.set(1 / width, 1 / height);
  }

  /** Distance over which outlines fade out (follow the fog so distant lines dissolve into the wash). */
  setFade(start: number, end: number): void {
    this.material.uniforms.fadeStart.value = start;
    this.material.uniforms.fadeEnd.value = end;
  }

  /** Night-time: lighter lines so the ink doesn't swallow everything. */
  setInk(color: THREE.ColorRepresentation, strength: number): void {
    this.material.uniforms.ink.value.set(color);
    this.material.uniforms.strength.value = strength;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (!this.enabled) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, camera);
    this.composite(renderer, this.material, this.target, camera);
  }

  /**
   * Draws a scene (the first-person held item) over what is already on screen, outlined in ink.
   * No grain, vignette or distance fade: those were applied to the world underneath.
   */
  renderOverlay(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (!this.enabled) {
      renderer.setRenderTarget(null);
      renderer.clearDepth();
      renderer.render(scene, camera);
      return;
    }
    renderer.getClearColor(this.clearColor);
    const alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.overlayTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setClearColor(this.clearColor, alpha);
    this.composite(renderer, this.overlayMaterial, this.overlayTarget, camera);
  }

  private composite(
    renderer: THREE.WebGLRenderer,
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget,
    camera: THREE.PerspectiveCamera,
  ): void {
    const u = material.uniforms;
    u.tColor.value = target.texture;
    u.tDepth.value = target.depthTexture;
    u.near.value = camera.near;
    u.far.value = camera.far;
    u.projInv.value.copy(camera.projectionMatrixInverse);
    this.quad.material = material;
    renderer.setRenderTarget(null);
    renderer.render(this.quadScene, this.quadCamera);
  }

  dispose(): void {
    this.target.dispose();
    this.overlayTarget.dispose();
    this.material.dispose();
    this.overlayMaterial.dispose();
  }
}
