/** Geometry builders for the style previews: flat-coloured block faces, and smooth surface nets. */
import * as THREE from 'three';
import { IS_SOLID, WATER_STRENGTH, GLASS } from '../world/blocks';
import { exposed, type Region } from './region';

export type Palette = (id: number, face: 'top' | 'side' | 'bottom') => THREE.Color | null;

const FACES: {
  n: [number, number, number];
  corners: [number, number, number][];
  kind: 'top' | 'side' | 'bottom';
  shade: number;
}[] = [
  {
    n: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    kind: 'side',
    shade: 0.86,
  },
  {
    n: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    kind: 'side',
    shade: 0.86,
  },
  {
    n: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    kind: 'top',
    shade: 1,
  },
  {
    n: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    kind: 'bottom',
    shade: 0.6,
  },
  {
    n: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    kind: 'side',
    shade: 0.74,
  },
  {
    n: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    kind: 'side',
    shade: 0.74,
  },
];

/** One quad per exposed face, coloured by the palette (no textures). Water goes in its own mesh. */
export function flatBlockMesh(
  r: Region,
  palette: Palette,
  bakeShade: boolean,
): { solid: THREE.BufferGeometry; water: THREE.BufferGeometry } {
  const out = {
    solid: { p: [] as number[], c: [] as number[] },
    water: { p: [] as number[], c: [] as number[] },
  };
  for (let y = r.minY; y <= r.maxY + 8; y++)
    for (let z = r.z0; z < r.z0 + r.size; z++)
      for (let x = r.x0; x < r.x0 + r.size; x++) {
        const id = r.get(x, y, z);
        const isW = WATER_STRENGTH[id] > 0;
        if (!IS_SOLID[id] && !isW) continue;
        for (const f of FACES) {
          const [nx, ny, nz] = f.n;
          if (isW) {
            if (ny !== 1 || WATER_STRENGTH[r.get(x, y + 1, z)]) continue;
          } else if (!exposed(r, x, y, z, nx, ny, nz)) continue;
          const col = palette(id, f.kind);
          if (!col) continue;
          const c = bakeShade ? col.clone().multiplyScalar(f.shade) : col;
          const tgt = isW ? out.water : out.solid;
          const v = f.corners.map(([cx, cy, cz]) => [x + cx, y + cy - (isW ? 0.12 : 0), z + cz]);
          for (const i of [0, 1, 2, 0, 2, 3]) {
            tgt.p.push(...v[i]);
            tgt.c.push(c.r, c.g, c.b);
          }
        }
      }
  const geo = (d: { p: number[]; c: number[] }) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3));
    g.computeVertexNormals();
    return g;
  };
  return { solid: geo(out.solid), water: geo(out.water) };
}

/** Positions of exposed solid blocks, grouped by block id (for instanced, rounded blocks). */
export function exposedBlocks(r: Region): Map<number, THREE.Vector3[]> {
  const out = new Map<number, THREE.Vector3[]>();
  for (let y = r.minY; y <= r.maxY + 8; y++)
    for (let z = r.z0; z < r.z0 + r.size; z++)
      for (let x = r.x0; x < r.x0 + r.size; x++) {
        const id = r.get(x, y, z);
        if (!IS_SOLID[id] && !WATER_STRENGTH[id]) continue;
        const show = WATER_STRENGTH[id]
          ? !WATER_STRENGTH[r.get(x, y + 1, z)]
          : FACES.some((f) => exposed(r, x, y, z, ...f.n));
        if (!show) continue;
        if (!out.has(id)) out.set(id, []);
        out.get(id)!.push(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
      }
  return out;
}

/**
 * Naive surface nets over a softened solidity field: one vertex per surface cell, joined into quads.
 * Produces smooth, rolling terrain from the same block data (the blocks still exist underneath).
 */
export function surfaceNets(r: Region, palette: Palette): THREE.BufferGeometry {
  const X0 = r.x0 - 1,
    Y0 = r.minY - 1,
    Z0 = r.z0 - 1;
  const NX = r.size + 2,
    NY = r.maxY + 10 - Y0,
    NZ = r.size + 2;
  const idx = (x: number, y: number, z: number) => x + NX * (z + NZ * y);
  const raw = new Float32Array(NX * NY * NZ);
  for (let y = 0; y < NY; y++)
    for (let z = 0; z < NZ; z++)
      for (let x = 0; x < NX; x++) {
        const id = r.get(X0 + x, Y0 + y, Z0 + z);
        raw[idx(x, y, z)] = IS_SOLID[id] && id !== GLASS ? 1 : 0;
      }
  // Light blur so terraces turn into slopes.
  const field = new Float32Array(raw.length);
  for (let y = 0; y < NY; y++)
    for (let z = 0; z < NZ; z++)
      for (let x = 0; x < NX; x++) {
        let s = 0,
          n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dz = -1; dz <= 1; dz++)
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx,
                yy = y + dy,
                zz = z + dz;
              if (xx < 0 || yy < 0 || zz < 0 || xx >= NX || yy >= NY || zz >= NZ) continue;
              const w = dx === 0 && dy === 0 && dz === 0 ? 4 : 1;
              s += raw[idx(xx, yy, zz)] * w;
              n += w;
            }
        field[idx(x, y, z)] = s / n;
      }
  const ISO = 0.5;
  const vertIndex = new Int32Array(NX * NY * NZ).fill(-1);
  const verts: number[] = [];
  const cols: number[] = [];
  const corner = (x: number, y: number, z: number) => field[idx(x, y, z)];
  for (let y = 0; y < NY - 1; y++)
    for (let z = 0; z < NZ - 1; z++)
      for (let x = 0; x < NX - 1; x++) {
        let inside = 0;
        const v: number[] = [];
        for (let i = 0; i < 8; i++) {
          const val = corner(x + (i & 1), y + ((i >> 2) & 1), z + ((i >> 1) & 1));
          v.push(val);
          if (val > ISO) inside++;
        }
        if (inside === 0 || inside === 8) continue;
        // Average the edge crossings.
        let px = 0,
          py = 0,
          pz = 0,
          n = 0;
        const edges = [
          [0, 1],
          [2, 3],
          [4, 5],
          [6, 7],
          [0, 2],
          [1, 3],
          [4, 6],
          [5, 7],
          [0, 4],
          [1, 5],
          [2, 6],
          [3, 7],
        ];
        for (const [a, b] of edges) {
          if (v[a] > ISO === v[b] > ISO) continue;
          const t = (ISO - v[a]) / (v[b] - v[a]);
          const ax = a & 1,
            ay = (a >> 2) & 1,
            az = (a >> 1) & 1;
          const bx = b & 1,
            by = (b >> 2) & 1,
            bz = (b >> 1) & 1;
          px += ax + (bx - ax) * t;
          py += ay + (by - ay) * t;
          pz += az + (bz - az) * t;
          n++;
        }
        vertIndex[idx(x, y, z)] = verts.length / 3;
        const wx = X0 + x + px / n + 0.5,
          wy = Y0 + y + py / n + 0.5,
          wz = Z0 + z + pz / n + 0.5;
        verts.push(wx, wy, wz);
        // Colour from the nearest solid block, preferring the one just below the surface.
        let id = 0;
        for (let dy = 0; dy <= 2 && !id; dy++) {
          const cand = r.get(Math.floor(wx), Math.floor(wy) - dy, Math.floor(wz));
          if (IS_SOLID[cand]) id = cand;
        }
        const exposedTop = id && !IS_SOLID[r.get(Math.floor(wx), Math.floor(wy) + 1, Math.floor(wz))];
        const c = palette(id || 3, exposedTop ? 'top' : 'side') ?? new THREE.Color(0x888888);
        cols.push(c.r, c.g, c.b);
      }
  const tris: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) tris.push(a, c, b, a, d, c);
    else tris.push(a, b, c, a, c, d);
  };
  for (let y = 1; y < NY - 1; y++)
    for (let z = 1; z < NZ - 1; z++)
      for (let x = 1; x < NX - 1; x++) {
        const s0 = corner(x, y, z) > ISO;
        // Edge along +x
        if (s0 !== corner(x + 1, y, z) > ISO)
          quad(
            vertIndex[idx(x, y - 1, z - 1)],
            vertIndex[idx(x, y, z - 1)],
            vertIndex[idx(x, y, z)],
            vertIndex[idx(x, y - 1, z)],
            !s0,
          );
        if (s0 !== corner(x, y + 1, z) > ISO)
          quad(
            vertIndex[idx(x - 1, y, z - 1)],
            vertIndex[idx(x - 1, y, z)],
            vertIndex[idx(x, y, z)],
            vertIndex[idx(x, y, z - 1)],
            !s0,
          );
        if (s0 !== corner(x, y, z + 1) > ISO)
          quad(
            vertIndex[idx(x - 1, y - 1, z)],
            vertIndex[idx(x, y - 1, z)],
            vertIndex[idx(x, y, z)],
            vertIndex[idx(x - 1, y, z)],
            !s0,
          );
      }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.setIndex(tris);
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}
