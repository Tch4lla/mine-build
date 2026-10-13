/**
 * Style lab: renders the same patch of game terrain in several candidate art styles, side by side.
 * Open /style-lab.html in the dev server. Add ?view=ground for an eye-level camera.
 */
import * as THREE from 'three';
import { buildRegion } from './region';
import { earthStyle, inkStyle, pastelStyle, toyStyle, type StyleScene } from './styles';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'aerial';
const seed = Number(params.get('seed') ?? 12345);
const region = buildRegion(seed, -12, -8, 48);

const STYLES: [string, string, (r: typeof region) => StyleScene][] = [
  ['A · Ink & Wash', 'Toon bands, ink outlines, paper tones', inkStyle],
  ['B · Smooth Earth', 'Rolling low-poly terrain from the same voxels', earthStyle],
  ['C · Toybox', 'Rounded blocks, plain colours, soft shadows', toyStyle],
  ['D · Pastel Flat', 'Untextured faces, gradient sky, dreamy palette', pastelStyle],
];

const grid = document.getElementById('grid')!;
const cx = region.x0 + region.size / 2;
const cz = region.z0 + region.size / 2;
const ground = region.hut.y;

for (const [title, sub, make] of STYLES) {
  const cell = document.createElement('figure');
  const canvas = document.createElement('canvas');
  const cap = document.createElement('figcaption');
  cap.innerHTML = `<b>${title}</b><span>${sub}</span>`;
  cell.append(canvas, cap);
  grid.append(cell);

  const w = 760,
    h = 470;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const style = make(region);
  style.setup?.(renderer);
  const camera = new THREE.PerspectiveCamera(view === 'ground' ? 70 : 45, w / h, 0.1, 400);
  if (view === 'ground') {
    // Stand on the ground a few blocks in front of the hut's door, looking at it.
    const { x: hx, y: hy, z: hz } = region.hut;
    const px = hx + 6,
      pz = hz + 9;
    camera.position.set(px + 0.5, Math.max(region.surface(px, pz) + 1 + 1.62, hy + 1), pz + 0.5);
    camera.lookAt(hx + 0.5, hy + 1.6, hz + 0.5);
  } else {
    camera.position.set(cx + 30, ground + 30, cz + 34);
    camera.lookAt(cx, ground - 2, cz);
  }
  if (style.render) style.render(renderer, camera);
  else renderer.render(style.scene, camera);
}
document.body.dataset.ready = 'true';
