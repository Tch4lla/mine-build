/**
 * Sprite library check: shows the exported library (src/generated, public/library) the way the game
 * will draw it, before it is wired into the world. Open /library.html in the dev server
 * (?view=pairs or ?view=close for preset cameras).
 *
 * - A 3D field of every library block, built from the flat face atlas with the game's toon material
 *   and InkPass outline. The front row pairs each core block's world art with its library look.
 * - Every 2D sprite (blocks, items, effects, particles) and 3D-rendered sprite as an icon grid.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createAtlasTexture, toonGradient } from '../engine/atlas';
import { InkPass } from '../view/inkPass';
import { BLOCKS } from '../world/blocks';
import { tileIndex, tileUV } from '../world/tiles';
import {
  LIB_ATLAS_COLS,
  LIB_ATLAS_ROWS,
  LIB_ATLAS_URL,
  LIB_BLOCKS,
  LIB_CREATURES,
  LIB_EFFECTS,
  LIB_FOOD,
  LIB_GEAR,
  LIB_MATERIALS,
  LIB_PARTICLES,
  LIB_POTIONS,
  LIB_STRUCTURES,
} from '../generated/library';
import { libArt, libSvg, loadLibraryArt, type LibArtKind } from '../library/art';
import type { LibBlock } from '../library/types';

type UV = [number, number, number, number];

function libTileUV(i: number): UV {
  const col = i % LIB_ATLAS_COLS;
  const row = Math.floor(i / LIB_ATLAS_COLS);
  const eps = 0.02 / 32;
  return [
    col / LIB_ATLAS_COLS + eps,
    1 - (row + 1) / LIB_ATLAS_ROWS + eps,
    (col + 1) / LIB_ATLAS_COLS - eps,
    1 - row / LIB_ATLAS_ROWS - eps,
  ];
}

/** A unit cube with its six faces mapped to atlas rectangles (+x, -x, +y, -y, +z, -z). */
function cube(faces: UV[]): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  faces.forEach(([u0, v0, u1, v1], f) => {
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, u0 + (u1 - u0) * uv.getX(idx), v0 + (v1 - v0) * uv.getY(idx));
    }
  });
  return g;
}

/** Two crossed quads (plants, torches and other non-box blocks). */
function crossed([u0, v0, u1, v1]: UV): THREE.BufferGeometry {
  const a = new THREE.PlaneGeometry(1, 1);
  const uv = a.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i));
  a.rotateY(Math.PI / 4);
  const b = a.clone().rotateY(Math.PI / 2);
  const g = new THREE.BufferGeometry();
  const merge = (name: string) =>
    new THREE.BufferAttribute(
      new Float32Array([...a.getAttribute(name).array, ...b.getAttribute(name).array]),
      a.getAttribute(name).itemSize,
    );
  g.setAttribute('position', merge('position'));
  g.setAttribute('normal', merge('normal'));
  g.setAttribute('uv', merge('uv'));
  const ia = Array.from(a.getIndex()!.array);
  g.setIndex([...ia, ...ia.map((i) => i + a.getAttribute('position').count)]);
  return g;
}

function libGeometry(b: LibBlock): THREE.BufferGeometry {
  const t = b.tiles;
  if ('sprite' in t) return crossed(libTileUV(t.sprite));
  const top = libTileUV(t.top);
  const side = libTileUV(t.side);
  return cube([side, side, top, libTileUV(t.bottom), side, side]);
}

// --- the 3D block field -------------------------------------------------------------------------

const host = document.getElementById('world')!;
const tip = document.getElementById('tip')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0xf3ead8);
renderer.autoClear = false;
host.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf3ead8, 60, 140);
const sun = new THREE.DirectionalLight(0xfff2e0, 1.6);
sun.position.set(-2, 4, 3);
scene.add(sun, new THREE.HemisphereLight(0xfff6e6, 0xb3a184, 0.9), new THREE.AmbientLight(0xffffff, 0.25));

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
const controls = new OrbitControls(camera, renderer.domElement);
const ink = new InkPass(1, 1);
ink.setFade(60, 140);

const libTexture = new THREE.TextureLoader().load(LIB_ATLAS_URL, () => (dirty = true));
libTexture.magFilter = libTexture.minFilter = THREE.NearestFilter;
libTexture.generateMipmaps = false;
libTexture.colorSpace = THREE.SRGBColorSpace;
const { texture: coreTexture } = createAtlasTexture();
const toon = (map: THREE.Texture, cutout: boolean) =>
  new THREE.MeshToonMaterial({
    map,
    gradientMap: toonGradient(),
    alphaTest: cutout ? 0.5 : 0,
    transparent: false,
    side: cutout ? THREE.DoubleSide : THREE.FrontSide,
  });
const libSolid = toon(libTexture, false);
const libCutout = toon(libTexture, true);
const coreMat = toon(coreTexture, true);

const pickable: THREE.Mesh[] = [];
function add(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, z: number, label: string) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, 0.5, z);
  m.userData.label = label;
  scene.add(m);
  pickable.push(m);
}

// Front row: world art | library art, for every core block that has a library look.
const pairs = LIB_BLOCKS.filter((b) => b.core);
pairs.forEach((b, i) => {
  const core = BLOCKS.find((c) => c.key === b.core)!;
  const t = core.tiles;
  const side = tileUV(tileIndex(t.side));
  const x = (i - pairs.length / 2) * 3;
  add(
    cube([side, side, tileUV(tileIndex(t.top)), tileUV(tileIndex(t.bottom)), side, side]),
    coreMat,
    x - 0.6,
    6,
    `${core.name} (world art)`,
  );
  add(libGeometry(b), 'sprite' in b.tiles ? libCutout : libSolid, x + 0.6, 6, `${b.name} (library art)`);
});

// All library blocks, one block of rows per category.
const PER_ROW = 40;
let z = 2;
const byCategory = new Map<string, LibBlock[]>();
for (const b of LIB_BLOCKS) byCategory.set(b.category, [...(byCategory.get(b.category) ?? []), b]);
for (const [category, blocks] of byCategory) {
  blocks.forEach((b, i) => {
    const x = ((i % PER_ROW) - PER_ROW / 2) * 1.5;
    const bz = z - Math.floor(i / PER_ROW) * 1.5;
    const cutout = 'sprite' in b.tiles || b.seeThrough;
    add(libGeometry(b), cutout ? libCutout : libSolid, x, bz, `${b.name} · ${category} · ${b.shape}`);
  });
  z -= Math.ceil(blocks.length / PER_ROW) * 1.5 + 2.5;
}
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(PER_ROW * 1.5 + 20, 10 - z + 10),
  new THREE.MeshToonMaterial({ color: 0xe6dcc6, gradientMap: toonGradient() }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, -0.01, (10 + z) / 2);
scene.add(floor);

// ?view=pairs looks along the world/library comparison row; ?view=close sits among the blocks.
const VIEWS: Record<string, [THREE.Vector3Tuple, THREE.Vector3Tuple]> = {
  overview: [
    [0, 16, 22],
    [0, 0, 0],
  ],
  pairs: [
    [-14, 4, 13],
    [-14, 0, 6],
  ],
  close: [
    [-18, 4.5, 6],
    [-18, 0, -1],
  ],
};
const [eye, look] = VIEWS[new URLSearchParams(location.search).get('view') ?? 'overview'] ?? VIEWS.overview;
camera.position.set(...eye);
controls.target.set(...look);
controls.update();

let dirty = true;
controls.addEventListener('change', () => (dirty = true));

function resize() {
  const w = host.clientWidth;
  const h = renderer.domElement.clientHeight || Math.round(innerHeight * 0.7);
  const pr = renderer.getPixelRatio();
  renderer.setSize(w, h, false);
  ink.setSize(Math.floor(w * pr), Math.floor(h * pr));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  dirty = true;
}
addEventListener('resize', resize);
resize();

const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('pointermove', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  const p = new THREE.Vector2(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    -((e.clientY - r.top) / r.height) * 2 + 1,
  );
  ray.setFromCamera(p, camera);
  const hit = ray.intersectObjects(pickable)[0];
  if (!hit) {
    tip.hidden = true;
    return;
  }
  tip.textContent = hit.object.userData.label;
  tip.hidden = false;
  tip.style.left = `${e.clientX - r.left + 14}px`;
  tip.style.top = `${e.clientY - r.top + 14}px`;
});

function frame() {
  if (dirty) {
    dirty = false;
    renderer.clear();
    ink.render(renderer, scene, camera);
  }
  requestAnimationFrame(frame);
}
frame();

// --- icon grids ------------------------------------------------------------------------------------

const icons = document.getElementById('icons')!;
function grid(title: string, entries: { name: string; src: string }[]) {
  const h = document.createElement('h2');
  h.textContent = `${title} (${entries.length})`;
  const g = document.createElement('div');
  g.className = 'icons';
  for (const e of entries) {
    const f = document.createElement('figure');
    f.title = e.name;
    const img = document.createElement('img');
    img.src = e.src;
    img.alt = e.name;
    img.loading = 'lazy';
    const c = document.createElement('figcaption');
    c.textContent = e.name;
    f.append(img, c);
    g.append(f);
  }
  icons.append(h, g);
}

void loadLibraryArt().then(() => {
  const svg = (kind: LibArtKind, id: string) =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(libSvg(libArt(kind, id) ?? ''))}`;
  const drawn = (kind: LibArtKind, list: readonly { id: string; name: string }[]) =>
    list.map((e) => ({ name: e.name, src: svg(kind, e.id) }));
  grid('Blocks', drawn('block', LIB_BLOCKS));
  grid('Materials', drawn('item', LIB_MATERIALS));
  grid('Tools & Gear', drawn('item', LIB_GEAR));
  grid('Food', drawn('item', LIB_FOOD));
  grid('Potions', drawn('item', LIB_POTIONS));
  grid('Effects', drawn('effect', LIB_EFFECTS));
  grid('Particles', drawn('particle', LIB_PARTICLES));
  grid(
    'Creatures & Vehicles (3D)',
    LIB_CREATURES.map((c) => ({ name: c.name, src: c.sprite })),
  );
  grid(
    'Structures (3D)',
    LIB_STRUCTURES.map((s) => ({ name: s.name, src: s.sprite })),
  );
  document.body.dataset.ready = 'true';
});
