/**
 * Renders a 3D model as a Sōzō sprite with the game's own look: MeshToonMaterial bands (toonGradient)
 * and the InkPass outline, from a three-quarter camera, on a transparent background.
 *
 * Open /tools/sprite-library/render3d/?model=rabbit&size=512 in the dev server (&turn=degrees spins it).
 */
import * as THREE from 'three';
import { InkPass } from '../../../src/view/inkPass';
import { rabbit } from './rabbit';

const MODELS: Record<string, () => THREE.Object3D> = { rabbit };

const params = new URLSearchParams(location.search);
const size = Number(params.get('size') ?? 512);
const name = params.get('model') ?? 'rabbit';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(size, size);
renderer.setClearColor(0x000000, 0);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// Same lighting as a Sōzō day (view/sky.ts): warm sun from the upper left, paper-tinted hemisphere.
const sun = new THREE.DirectionalLight(0xfff2e0, 1.6);
sun.position.set(-2, 4, 3);
scene.add(sun, new THREE.HemisphereLight(0xfff6e6, 0xb3a184, 0.95), new THREE.AmbientLight(0xffffff, 0.3));

const model = MODELS[name]();
scene.add(model);

// Fit the model: three-quarter view (45° around, ~28° down), long lens so it reads like a game camera.
const box = new THREE.Box3().setFromObject(model);
const centre = box.getCenter(new THREE.Vector3());
const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
const dir = new THREE.Vector3(
  Math.sin(Math.PI / 4),
  Math.tan(THREE.MathUtils.degToRad(28)),
  Math.cos(Math.PI / 4),
).normalize();
const dist = (radius / Math.sin(THREE.MathUtils.degToRad(22 / 2))) * 1.08;
camera.position.copy(centre).addScaledVector(dir, dist);
camera.lookAt(centre);
camera.updateMatrixWorld();
camera.updateProjectionMatrix();

// Frame tightly: project the model's vertices at every turntable angle (so the framing stays fixed
// while the model spins), then zoom and shift so it fills ~86% of the sprite.
const pts: THREE.Vector3[] = [];
for (let deg = 0; deg < 360; deg += 30) {
  model.rotation.y = THREE.MathUtils.degToRad(deg);
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const pos = m.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 3)
      pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  });
}
model.rotation.y = THREE.MathUtils.degToRad(Number(params.get('turn') ?? 0));
for (let deg = 0; deg < 360; deg += 45) {
  const r = THREE.MathUtils.degToRad(deg);
  pts.push(new THREE.Vector3(Math.sin(r) * 0.65, 0, Math.cos(r) * 0.65)); // room for the shadow
}
let minX = Infinity,
  maxX = -Infinity,
  minY = Infinity,
  maxY = -Infinity;
for (const p of pts) {
  const v = p.clone().project(camera);
  minX = Math.min(minX, v.x);
  maxX = Math.max(maxX, v.x);
  minY = Math.min(minY, v.y);
  maxY = Math.max(maxY, v.y);
}
const fill = 0.86;
camera.zoom = (2 * fill) / Math.max(maxX - minX, maxY - minY);
camera.updateProjectionMatrix();
const cx = ((minX + maxX) / 2) * camera.zoom;
const cy = ((minY + maxY) / 2) * camera.zoom;
camera.setViewOffset(size, size, (cx * size) / 2, (-cy * size) / 2, size, size);

// Soft ground shadow, drawn first (not outlined).
const shadowScene = new THREE.Scene();
const sh = new THREE.Mesh(
  new THREE.CircleGeometry(0.5, 48),
  new THREE.MeshBasicMaterial({ color: 0x2a221d, transparent: true, opacity: 0.18, depthWrite: false }),
);
sh.rotation.x = -Math.PI / 2;
sh.scale.set(0.9, 1.3, 1);
sh.position.set(0, 0.001, -0.05);
const shadowPivot = new THREE.Group();
shadowPivot.add(sh);
shadowPivot.rotation.y = model.rotation.y; // the shadow turns with the model
shadowScene.add(shadowPivot);

const ink = new InkPass(size, size);
// Thicker lines than the world pass so they survive being shrunk to icon size.
const line = Number(params.get('line') ?? Math.max(1.5, size / 170));
(ink as unknown as { overlayMaterial: THREE.ShaderMaterial }).overlayMaterial.uniforms.texel.value.set(
  line / size,
  line / size,
);

renderer.clear();
renderer.render(shadowScene, camera);
ink.renderOverlay(renderer, scene, camera);
(window as unknown as { __done: boolean }).__done = true;
