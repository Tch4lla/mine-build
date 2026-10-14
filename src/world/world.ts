/** Loads, meshes, collides and unloads chunks around points of interest. */
import * as THREE from 'three';
import { AIR, FULL_SOLID, IS_SOLID } from './blocks';
import { CHUNK_HEIGHT, CHUNK_SIZE, ChunkData, chunkKey } from './chunk';
import { exposedSolidVoxels, meshChunk, shapeColliderBoxes, type MeshData } from './chunkMesher';
import { TerrainGenerator } from './terrain';
import { RAPIER, GROUPS, type Physics } from '../physics/physicsWorld';

interface ChunkEntry {
  data: ChunkData;
  solid?: THREE.Mesh;
  water?: THREE.Mesh;
  collider?: RAPIER.Collider;
  /** Triangle-mesh collider for solid blocks that aren't full cubes (slabs, stairs, fences...). */
  shapeCollider?: RAPIER.Collider;
  meshDirty: boolean;
  colliderDirty: boolean;
}

export type BlockChangeListener = (x: number, y: number, z: number, oldId: number, newId: number) => void;

export class World {
  readonly generator: TerrainGenerator;
  readonly group = new THREE.Group();
  renderDistance = 6;
  physicsDistance = 2;

  private readonly chunks = new Map<string, ChunkEntry>();
  /** Full block arrays of chunks the player has changed (loaded from or written to the save). */
  private readonly modified = new Map<string, Uint16Array>();
  private readonly dirtyModified = new Set<string>();
  private readonly listeners: BlockChangeListener[] = [];

  constructor(
    readonly seed: number,
    private readonly physics: Physics,
    private readonly solidMaterial: THREE.Material,
    private readonly waterMaterial: THREE.Material,
  ) {
    this.generator = new TerrainGenerator(seed);
    this.group.name = 'world';
  }

  onBlockChange(fn: BlockChangeListener): void {
    this.listeners.push(fn);
  }

  /** Seed the world with chunks changed in a previous session. */
  loadModifiedChunks(chunks: Map<string, Uint16Array>): void {
    for (const [k, v] of chunks) this.modified.set(k, v);
  }

  /** Chunks changed since the last call, for incremental saving. */
  takeDirtyModified(): Map<string, Uint16Array> {
    const out = new Map<string, Uint16Array>();
    for (const k of this.dirtyModified) {
      const entry = this.chunks.get(k);
      const data = entry ? entry.data.blocks : this.modified.get(k);
      if (data) out.set(k, data);
    }
    this.dirtyModified.clear();
    return out;
  }

  allModified(): Map<string, Uint16Array> {
    const out = new Map(this.modified);
    for (const k of this.modified.keys()) {
      const e = this.chunks.get(k);
      if (e) out.set(k, e.data.blocks);
    }
    return out;
  }

  getChunk(cx: number, cz: number): ChunkData | undefined {
    return this.chunks.get(chunkKey(cx, cz))?.data;
  }

  /** Loads (generates) a chunk's data synchronously if needed. */
  ensureChunk(cx: number, cz: number): ChunkEntry {
    const k = chunkKey(cx, cz);
    let e = this.chunks.get(k);
    if (!e) {
      const saved = this.modified.get(k);
      const data = saved ? new ChunkData(cx, cz, saved) : this.generator.generate(cx, cz);
      if (saved) this.modified.set(k, data.blocks);
      e = { data, meshDirty: true, colliderDirty: true };
      this.chunks.set(k, e);
      // Neighbours need remeshing so faces along the shared border are correct.
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const n = this.chunks.get(chunkKey(cx + dx, cz + dz));
        if (n) {
          n.meshDirty = true;
          n.colliderDirty = true;
        }
      }
    }
    return e;
  }

  getBlock(x: number, y: number, z: number): number {
    if (y < 0 || y >= CHUNK_HEIGHT) return AIR;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const e = this.chunks.get(chunkKey(cx, cz));
    if (!e) return AIR;
    return e.data.get(x - cx * CHUNK_SIZE, y, z - cz * CHUNK_SIZE);
  }

  /** The state bits of a block (facing, half, open...); 0 for most blocks. */
  getBlockState(x: number, y: number, z: number): number {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const e = this.chunks.get(chunkKey(cx, cz));
    if (!e) return 0;
    return e.data.getState(x - cx * CHUNK_SIZE, y, z - cz * CHUNK_SIZE);
  }

  isLoaded(x: number, z: number): boolean {
    return this.chunks.has(chunkKey(Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE)));
  }

  /** Sets a block (and its state, which defaults to 0). Returns false if nothing changed. */
  setBlock(x: number, y: number, z: number, id: number, state = 0): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const e = this.ensureChunk(cx, cz);
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    const old = e.data.get(lx, y, lz);
    if (old === id && e.data.getState(lx, y, lz) === state) return false;
    e.data.set(lx, y, lz, id, state);
    e.meshDirty = true;
    e.colliderDirty = true;
    const k = chunkKey(cx, cz);
    this.modified.set(k, e.data.blocks);
    this.dirtyModified.add(k);
    const touch = (ncx: number, ncz: number) => {
      const n = this.chunks.get(chunkKey(ncx, ncz));
      if (n) {
        n.meshDirty = true;
        n.colliderDirty = true;
      }
    };
    if (lx === 0) touch(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) touch(cx + 1, cz);
    if (lz === 0) touch(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) touch(cx, cz + 1);
    for (const fn of this.listeners) fn(x, y, z, old, id);
    return true;
  }

  /** Highest solid block at (x, z), or -1. Generates the chunk if needed. */
  surfaceY(x: number, z: number): number {
    this.ensureChunk(Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE));
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) if (IS_SOLID[this.getBlock(x, y, z)]) return y;
    return -1;
  }

  private sampler(cx: number, cz: number) {
    return (x: number, y: number, z: number): number => {
      let ncx = cx;
      let ncz = cz;
      if (x < 0) ncx--;
      else if (x >= CHUNK_SIZE) ncx++;
      if (z < 0) ncz--;
      else if (z >= CHUNK_SIZE) ncz++;
      const n = this.chunks.get(chunkKey(ncx, ncz));
      if (!n) return AIR;
      return n.data.get(x - (ncx - cx) * CHUNK_SIZE, y, z - (ncz - cz) * CHUNK_SIZE);
    };
  }

  /**
   * Incremental update: generates nearby chunk data, meshes a few chunks per call,
   * maintains physics colliders around `physicsCenters`, and unloads far chunks.
   */
  update(center: THREE.Vector3, physicsCenters: THREE.Vector3[], budget = { gen: 4, mesh: 3 }): void {
    const pcx = Math.floor(center.x / CHUNK_SIZE);
    const pcz = Math.floor(center.z / CHUNK_SIZE);
    const R = this.renderDistance;

    // 1. Generate data (one ring beyond the render distance, so border faces are known).
    let gen = 0;
    const ring: [number, number, number][] = [];
    for (let dz = -R - 1; dz <= R + 1; dz++)
      for (let dx = -R - 1; dx <= R + 1; dx++) ring.push([dx * dx + dz * dz, pcx + dx, pcz + dz]);
    ring.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cz] of ring) {
      if (gen >= budget.gen) break;
      if (!this.chunks.has(chunkKey(cx, cz))) {
        this.ensureChunk(cx, cz);
        gen++;
      }
    }

    // 2. Mesh dirty chunks inside the render distance whose neighbours are loaded.
    let meshed = 0;
    for (const [d2, cx, cz] of ring) {
      if (meshed >= budget.mesh) break;
      if (d2 > R * R + 1) continue;
      const e = this.chunks.get(chunkKey(cx, cz));
      if (!e || !e.meshDirty) continue;
      if (
        !this.chunks.has(chunkKey(cx + 1, cz)) ||
        !this.chunks.has(chunkKey(cx - 1, cz)) ||
        !this.chunks.has(chunkKey(cx, cz + 1)) ||
        !this.chunks.has(chunkKey(cx, cz - 1))
      )
        continue;
      this.remesh(e);
      meshed++;
    }

    // 3. Colliders near the physics centres.
    const wanted = new Set<string>();
    const P = this.physicsDistance;
    for (const c of [center, ...physicsCenters]) {
      const ccx = Math.floor(c.x / CHUNK_SIZE);
      const ccz = Math.floor(c.z / CHUNK_SIZE);
      for (let dz = -P; dz <= P; dz++)
        for (let dx = -P; dx <= P; dx++) wanted.add(chunkKey(ccx + dx, ccz + dz));
    }
    for (const [k, e] of this.chunks) {
      if (wanted.has(k)) {
        if (!e.collider || e.colliderDirty) this.rebuildCollider(e);
      } else if (e.collider || e.shapeCollider) {
        this.removeColliders(e);
        e.colliderDirty = true;
      }
    }

    // 4. Unload far chunks (keeping their data if modified).
    const U = R + 3;
    for (const [k, e] of this.chunks) {
      if (wanted.has(k)) continue;
      if (Math.abs(e.data.cx - pcx) > U || Math.abs(e.data.cz - pcz) > U) this.unload(k, e);
    }
  }

  /** Synchronously makes chunks around a point fully ready (data, meshes, colliders). */
  prepareArea(center: THREE.Vector3, radius = 2): void {
    const pcx = Math.floor(center.x / CHUNK_SIZE);
    const pcz = Math.floor(center.z / CHUNK_SIZE);
    for (let dz = -radius - 1; dz <= radius + 1; dz++)
      for (let dx = -radius - 1; dx <= radius + 1; dx++) this.ensureChunk(pcx + dx, pcz + dz);
    for (let dz = -radius; dz <= radius; dz++)
      for (let dx = -radius; dx <= radius; dx++) {
        const e = this.ensureChunk(pcx + dx, pcz + dz);
        if (e.meshDirty) this.remesh(e);
        if (Math.abs(dx) <= this.physicsDistance && Math.abs(dz) <= this.physicsDistance)
          this.rebuildCollider(e);
      }
  }

  /** Marks every loaded chunk for remeshing (after the block art changes). */
  remeshAll(): void {
    for (const e of this.chunks.values()) e.meshDirty = true;
  }

  /** Remesh any dirty chunk immediately (used right after the player edits blocks). */
  flushDirtyNear(center: THREE.Vector3): void {
    const pcx = Math.floor(center.x / CHUNK_SIZE);
    const pcz = Math.floor(center.z / CHUNK_SIZE);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const e = this.chunks.get(chunkKey(pcx + dx, pcz + dz));
        if (!e) continue;
        if (e.meshDirty) this.remesh(e);
        if (e.collider && e.colliderDirty) this.rebuildCollider(e);
      }
  }

  private toGeometry(m: MeshData): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));
    g.setAttribute('color', new THREE.BufferAttribute(m.colors, 3));
    g.setIndex(new THREE.BufferAttribute(m.indices, 1));
    g.computeBoundingSphere();
    return g;
  }

  private remesh(e: ChunkEntry): void {
    const { solid, water } = meshChunk(e.data, this.sampler(e.data.cx, e.data.cz));
    const place = (old: THREE.Mesh | undefined, m: MeshData, mat: THREE.Material, order: number) => {
      if (old) {
        old.geometry.dispose();
        this.group.remove(old);
      }
      if (m.indices.length === 0) return undefined;
      const mesh = new THREE.Mesh(this.toGeometry(m), mat);
      mesh.position.set(e.data.cx * CHUNK_SIZE, 0, e.data.cz * CHUNK_SIZE);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.renderOrder = order;
      this.group.add(mesh);
      return mesh;
    };
    e.solid = place(e.solid, solid, this.solidMaterial, 0);
    e.water = place(e.water, water, this.waterMaterial, 1);
    e.meshDirty = false;
  }

  private removeColliders(e: ChunkEntry): void {
    if (e.collider) this.physics.world.removeCollider(e.collider, false);
    if (e.shapeCollider) this.physics.world.removeCollider(e.shapeCollider, false);
    e.collider = undefined;
    e.shapeCollider = undefined;
  }

  private rebuildCollider(e: ChunkEntry): void {
    this.removeColliders(e);
    const sample = this.sampler(e.data.cx, e.data.cz);
    const boxes = shapeColliderBoxes(e.data, sample);
    if (boxes.length > 0) {
      const desc = RAPIER.ColliderDesc.trimesh(...boxesToTrimesh(boxes))
        .setTranslation(e.data.cx * CHUNK_SIZE, 0, e.data.cz * CHUNK_SIZE)
        .setCollisionGroups(GROUPS.terrain)
        .setFriction(0.9);
      e.shapeCollider = this.physics.world.createCollider(desc);
    }
    const voxels = exposedSolidVoxels(e.data, sample, (id) => FULL_SOLID[id] === 1);
    if (voxels.length > 0) {
      const desc = RAPIER.ColliderDesc.voxels(voxels, { x: 1, y: 1, z: 1 })
        .setTranslation(e.data.cx * CHUNK_SIZE, 0, e.data.cz * CHUNK_SIZE)
        .setCollisionGroups(GROUPS.terrain)
        .setFriction(0.9);
      e.collider = this.physics.world.createCollider(desc);
    }
    e.colliderDirty = false;
  }

  private unload(k: string, e: ChunkEntry): void {
    for (const m of [e.solid, e.water]) {
      if (m) {
        m.geometry.dispose();
        this.group.remove(m);
      }
    }
    this.removeColliders(e);
    this.chunks.delete(k);
  }

  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  dispose(): void {
    for (const [k, e] of [...this.chunks]) this.unload(k, e);
  }
}

/** Twelve triangles per box, for one trimesh collider holding every box of a chunk. */
function boxesToTrimesh(boxes: Float32Array): [Float32Array, Uint32Array] {
  const n = boxes.length / 6;
  const verts = new Float32Array(n * 8 * 3);
  const idx = new Uint32Array(n * 36);
  // Corner k has x from bit 0, y from bit 1, z from bit 2.
  const TRIS = [
    0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7,
    5,
  ];
  for (let i = 0; i < n; i++) {
    const o = i * 6;
    for (let k = 0; k < 8; k++) {
      verts[(i * 8 + k) * 3] = boxes[o + (k & 1 ? 3 : 0)];
      verts[(i * 8 + k) * 3 + 1] = boxes[o + (k & 2 ? 4 : 1)];
      verts[(i * 8 + k) * 3 + 2] = boxes[o + (k & 4 ? 5 : 2)];
    }
    for (let t = 0; t < 36; t++) idx[i * 36 + t] = i * 8 + TRIS[t];
  }
  return [verts, idx];
}
