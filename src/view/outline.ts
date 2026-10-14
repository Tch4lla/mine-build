/** The targeting outline drawn around the block the player aims at. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Box } from '../world/shapes';

/**
 * The targeting outline for a block drawn with `boxes` (null: a full cube), in block space. Edges
 * between faces that lie flat against each other are left out, so stairs show their step and
 * fences their posts and rails, not a box around them. Cached, as few shapes recur.
 */
const outlines = new Map<string, THREE.BufferGeometry>();
const EMPTY = new THREE.BufferGeometry();
export function outlineGeometry(boxes: Box[] | null): THREE.BufferGeometry {
  const list = boxes ?? [[0, 0, 0, 1, 1, 1] as Box];
  if (!list.length) return EMPTY;
  const key = JSON.stringify(list);
  let g = outlines.get(key);
  if (!g) {
    const pad = 0.003;
    const parts = list.map((b) =>
      new THREE.BoxGeometry(b[3] - b[0] + 2 * pad, b[4] - b[1] + 2 * pad, b[5] - b[2] + 2 * pad).translate(
        (b[0] + b[3]) / 2,
        (b[1] + b[4]) / 2,
        (b[2] + b[5]) / 2,
      ),
    );
    g = new THREE.EdgesGeometry(mergeGeometries(parts), 1);
    outlines.set(key, g);
  }
  return g;
}
