/** Voxel DDA ray traversal (Amanatides & Woo). */

export interface VoxelHit {
  /** Block that was hit. */
  x: number;
  y: number;
  z: number;
  /** Face normal of the hit (points towards the ray origin). */
  nx: number;
  ny: number;
  nz: number;
  /** Distance along the ray to the hit point. */
  distance: number;
  id: number;
}

export function raycastVoxels(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  getBlock: (x: number, y: number, z: number) => number,
  isHittable: (id: number) => boolean,
): VoxelHit | null {
  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return null;
  dx /= len;
  dy /= len;
  dz /= len;

  let x = Math.floor(ox);
  let y = Math.floor(oy);
  let z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;
  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;
  const frac = (v: number, s: number) => (s > 0 ? Math.floor(v) + 1 - v : v - Math.floor(v));
  let tMaxX = stepX !== 0 ? frac(ox, stepX) * tDeltaX : Infinity;
  let tMaxY = stepY !== 0 ? frac(oy, stepY) * tDeltaY : Infinity;
  let tMaxZ = stepZ !== 0 ? frac(oz, stepZ) * tDeltaZ : Infinity;

  let nx = 0,
    ny = 0,
    nz = 0;
  let t = 0;
  // Starting inside a block counts as a hit with no normal.
  for (let i = 0; i < 1024 && t <= maxDist; i++) {
    const id = getBlock(x, y, z);
    if (isHittable(id)) return { x, y, z, nx, ny, nz, distance: t, id };
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
      nx = -stepX;
      ny = 0;
      nz = 0;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
      nx = 0;
      ny = -stepY;
      nz = 0;
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
      nx = 0;
      ny = 0;
      nz = -stepZ;
    }
  }
  return null;
}
