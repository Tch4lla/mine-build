/** Picture frames hung on block faces, and photo blocks (cubes wrapped in a photo). */
import * as THREE from 'three';
import { photoTexture } from './photoTextures';
import { frameDimensions } from './importPhoto';
import { uid } from '../engine/rng';

export interface FrameData {
  id: string;
  photoId: string;
  /** Block the frame hangs on. */
  x: number;
  y: number;
  z: number;
  /** Face normal (points away from the block). */
  nx: number;
  ny: number;
  nz: number;
  /** Longest side in blocks. */
  size: number;
  /** Quarter turns for frames on floors/ceilings. */
  rot: number;
}

export interface PhotoBlockData {
  x: number;
  y: number;
  z: number;
  photoId: string;
}

interface FrameEntity {
  data: FrameData;
  group: THREE.Group;
  picture: THREE.Mesh;
}

const placeholder = new THREE.MeshLambertMaterial({ color: 0x9fb6c8 });
const frameWood = new THREE.MeshLambertMaterial({ color: 0x6b4421 });
const backing = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
const blockKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

export class PhotoEntities {
  readonly group = new THREE.Group();
  private readonly frames = new Map<string, FrameEntity>();
  private readonly blocks = new Map<string, { data: PhotoBlockData; mesh: THREE.Mesh }>();
  private readonly raycaster = new THREE.Raycaster();

  get frameList(): FrameData[] {
    return [...this.frames.values()].map((f) => f.data);
  }

  get photoBlockList(): PhotoBlockData[] {
    return [...this.blocks.values()].map((b) => b.data);
  }

  addFrame(d: Omit<FrameData, 'id'> & { id?: string }): FrameData {
    const data: FrameData = { ...d, id: d.id ?? uid() };
    const group = new THREE.Group();
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), placeholder);
    picture.position.z = 0.035;
    group.add(picture);
    const ent: FrameEntity = { data, group, picture };
    this.layoutFrame(ent, 1, 1);
    this.frames.set(data.id, ent);
    this.group.add(group);
    void photoTexture(data.photoId).then((tex) => {
      if (!tex || !this.frames.has(data.id)) return;
      picture.material = new THREE.MeshLambertMaterial({ map: tex.texture });
      this.layoutFrame(ent, tex.w, tex.h);
    });
    return data;
  }

  private layoutFrame(ent: FrameEntity, pw: number, ph: number): void {
    const { data, group, picture } = ent;
    const { w, h } = frameDimensions(pw, ph, data.size);
    // Rebuild border pieces.
    for (const c of [...group.children]) if (c !== picture) group.remove(c);
    picture.scale.set(w, h, 1);
    const t = Math.min(0.08, 0.04 * data.size + 0.02);
    const depth = 0.07;
    const piece = (pw2: number, ph2: number, x: number, y: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(pw2, ph2, depth), frameWood);
      m.position.set(x, y, depth / 2);
      group.add(m);
    };
    piece(w + 2 * t, t, 0, h / 2 + t / 2);
    piece(w + 2 * t, t, 0, -h / 2 - t / 2);
    piece(t, h, -w / 2 - t / 2, 0);
    piece(t, h, w / 2 + t / 2, 0);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), backing);
    back.position.z = 0.01;
    group.add(back);

    const n = new THREE.Vector3(data.nx, data.ny, data.nz);
    group.position.set(data.x + 0.5, data.y + 0.5, data.z + 0.5).addScaledVector(n, 0.5 + 0.002);
    const q = new THREE.Quaternion();
    if (data.ny === 0) q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(data.nx, data.nz));
    else {
      const yaw = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (data.rot * Math.PI) / 2,
      );
      const tilt = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        data.ny > 0 ? -Math.PI / 2 : Math.PI / 2,
      );
      q.copy(yaw).multiply(tilt);
    }
    group.quaternion.copy(q);
  }

  removeFrame(id: string): FrameData | undefined {
    const f = this.frames.get(id);
    if (!f) return undefined;
    this.group.remove(f.group);
    this.frames.delete(id);
    return f.data;
  }

  /** Frames hanging on the given block. */
  framesOn(x: number, y: number, z: number): FrameData[] {
    return this.frameList.filter((f) => f.x === x && f.y === y && f.z === z);
  }

  pickFrame(
    eye: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number,
  ): { frame: FrameData; distance: number } | null {
    this.raycaster.set(eye, dir);
    this.raycaster.far = maxDist;
    let best: { frame: FrameData; distance: number } | null = null;
    for (const f of this.frames.values()) {
      const hit = this.raycaster.intersectObject(f.group, true)[0];
      if (hit && (!best || hit.distance < best.distance)) best = { frame: f.data, distance: hit.distance };
    }
    return best;
  }

  addPhotoBlock(d: PhotoBlockData): void {
    this.removePhotoBlock(d.x, d.y, d.z);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.001, 1.001, 1.001), placeholder);
    mesh.position.set(d.x + 0.5, d.y + 0.5, d.z + 0.5);
    this.group.add(mesh);
    const k = blockKey(d.x, d.y, d.z);
    this.blocks.set(k, { data: { ...d }, mesh });
    void photoTexture(d.photoId).then((tex) => {
      if (tex && this.blocks.get(k)?.mesh === mesh)
        mesh.material = new THREE.MeshLambertMaterial({ map: tex.square });
    });
  }

  removePhotoBlock(x: number, y: number, z: number): PhotoBlockData | undefined {
    const k = blockKey(x, y, z);
    const b = this.blocks.get(k);
    if (!b) return undefined;
    this.group.remove(b.mesh);
    this.blocks.delete(k);
    return b.data;
  }

  photoBlockAt(x: number, y: number, z: number): PhotoBlockData | undefined {
    return this.blocks.get(blockKey(x, y, z))?.data;
  }

  /** Only draw photo entities near the player. */
  updateVisibility(center: THREE.Vector3, range: number): void {
    for (const f of this.frames.values()) f.group.visible = f.group.position.distanceTo(center) < range;
    for (const b of this.blocks.values()) b.mesh.visible = b.mesh.position.distanceTo(center) < range;
  }

  clear(): void {
    for (const id of [...this.frames.keys()]) this.removeFrame(id);
    for (const b of [...this.blocks.values()]) this.removePhotoBlock(b.data.x, b.data.y, b.data.z);
  }

  load(frames: FrameData[], blocks: PhotoBlockData[]): void {
    this.clear();
    for (const f of frames) this.addFrame(f);
    for (const b of blocks) this.addPhotoBlock(b);
  }

  referencedPhotos(): Set<string> {
    const s = new Set<string>();
    for (const f of this.frames.values()) s.add(f.data.photoId);
    for (const b of this.blocks.values()) s.add(b.data.photoId);
    return s;
  }
}
