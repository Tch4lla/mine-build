/**
 * Block shapes: the boxes a block is drawn and collides with, from its shape, its state bits and
 * which neighbours it connects to. Pure (no DOM, no Three.js), shared by the chunk mesher and the
 * physics colliders.
 *
 * State bits (4 per cell, see chunk.ts):
 *   bits 0–1  facing: 0 north (-z), 1 east (+x), 2 south (+z), 3 west (-x); the way the player
 *             looked when placing it
 *   bit 2     top half (slab, upside-down stairs, upper trapdoor, the upper block of a door)
 *   bit 3     open (door, trapdoor, gate)
 */

export type BlockShape =
  | 'cube'
  | 'slab'
  | 'stairs'
  | 'wall'
  | 'fence'
  | 'fence_gate'
  | 'pane'
  | 'door'
  | 'trapdoor'
  /** One box (from the library drawing), turned to face the player: beds, shelves, chests... */
  | 'box'
  /** Two crossed sprite quads: plants, torches, lanterns... (drawn only, no collision). */
  | 'cross'
  /** One upright sprite quad across the block, turned to face the player: signs and banners. */
  | 'flat'
  /** Half of a two-block bed: the foot, or the head (TOP bit) one block further in its facing. */
  | 'bed';

/** [x0, y0, z0, x1, y1, z1] in block space (0–1; collision boxes may reach 1.5 high). */
export type Box = [number, number, number, number, number, number];

export interface ShapeBox {
  box: Box;
  /** Maps block y to texture v as v = vOffset + y * vScale (doors span two blocks). */
  vOffset?: number;
  vScale?: number;
  /** Draw this box with another atlas tile (a bed's pillow and legs). */
  tile?: string;
}

export const FACING = 3;
export const TOP = 4;
export const OPEN = 8;

export const facingOf = (state: number): number => state & FACING;

/** Facing from the player's yaw (yaw 0 looks north, towards -z). */
export function facingFromYaw(yaw: number): number {
  return ((Math.round(-yaw / (Math.PI / 2)) % 4) + 4) % 4;
}

/** Horizontal unit offsets for facings 0–3. */
export const FACING_DIR: readonly [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Neighbour connections for fences, walls and panes: bits n=1, e=2, s=4, w=8. */
export const CONNECT = { n: 1, e: 2, s: 4, w: 8 } as const;

/** Turns a box a quarter turn clockwise (seen from above) `turns` times about the block centre. */
export function rotateBox(b: Box, turns: number): Box {
  const [, y0, , , y1] = b;
  let [x0, , z0, x1, , z1] = b;
  for (let i = 0; i < (turns & 3); i++) {
    // (x, z) → (1 - z, x): north (z = 0) becomes east (x = 1).
    [x0, z0, x1, z1] = [1 - z1, x0, 1 - z0, x1];
  }
  return [x0, y0, z0, x1, y1, z1];
}

const px = (n: number) => n / 16;

/** Arms from the centre towards each connected side, for a post of half-width `hw`. */
function arms(conn: number, hw: number, y0: number, y1: number): Box[] {
  const out: Box[] = [];
  const a = 0.5 - hw;
  const b = 0.5 + hw;
  if (conn & CONNECT.n) out.push([a, y0, 0, b, y1, a]);
  if (conn & CONNECT.s) out.push([a, y0, b, b, y1, 1]);
  if (conn & CONNECT.w) out.push([0, y0, a, a, y1, b]);
  if (conn & CONNECT.e) out.push([b, y0, a, 1, y1, b]);
  return out;
}

export interface ShapeInput {
  shape: BlockShape;
  state: number;
  /** CONNECT bits (fences, walls, panes). */
  conn?: number;
  /** The library drawing's box, for 'box' shapes. */
  box?: Box | null;
}

/**
 * Boxes for drawing (`collision` false) or for collision (`collision` true): fences, walls and
 * closed gates collide 1.5 blocks high so they can't be jumped, open gates and doors let the
 * player through their opening, and 'cross' shapes never collide.
 */
export function shapeBoxes({ shape, state, conn = 0, box }: ShapeInput, collision = false): ShapeBox[] {
  const f = facingOf(state);
  const top = (state & TOP) !== 0;
  const open = (state & OPEN) !== 0;
  const wrap = (bs: Box[]): ShapeBox[] => bs.map((b) => ({ box: b }));
  switch (shape) {
    case 'cube':
      return wrap([[0, 0, 0, 1, 1, 1]]);
    case 'slab':
      return wrap([top ? [0, 0.5, 0, 1, 1, 1] : [0, 0, 0, 1, 0.5, 1]]);
    case 'stairs': {
      // Facing north: the step rises on the far (north) side.
      const base: Box = top ? [0, 0.5, 0, 1, 1, 1] : [0, 0, 0, 1, 0.5, 1];
      const step: Box = top ? [0, 0, 0, 1, 0.5, 0.5] : [0, 0.5, 0, 1, 1, 0.5];
      return wrap([base, rotateBox(step, f)]);
    }
    case 'fence': {
      const h = collision ? 1.5 : 1;
      const out: Box[] = [[px(6), 0, px(6), px(10), h, px(10)]];
      if (collision) out.push(...arms(conn, px(2), 0, h));
      else out.push(...arms(conn, px(1), px(6), px(9)), ...arms(conn, px(1), px(12), px(15)));
      return wrap(out);
    }
    case 'wall': {
      const h = collision ? 1.5 : 1;
      return wrap([[px(4), 0, px(4), px(12), h, px(12)], ...arms(conn, px(3), 0, collision ? h : px(13))]);
    }
    case 'pane': {
      // A lone pane stands across the block (east–west) rather than as a bare post.
      const c = conn || CONNECT.e | CONNECT.w;
      return wrap([[px(7), 0, px(7), px(9), 1, px(9)], ...arms(c, px(1), 0, 1)]);
    }
    case 'fence_gate': {
      const h = collision ? 1.5 : 1;
      if (collision && open) return [];
      // Facing north: posts at the east and west ends, rails across (east–west).
      const posts: Box[] = [
        [0, px(5), px(7), px(2), h, px(9)],
        [px(14), px(5), px(7), 1, h, px(9)],
      ];
      const rails: Box[] = open
        ? [
            [0, px(6), px(9), px(2), px(15), px(16)],
            [px(14), px(6), px(9), 1, px(15), px(16)],
          ]
        : [
            [px(2), px(6), px(7), px(14), px(9), px(9)],
            [px(2), px(12), px(7), px(14), px(15), px(9)],
            [px(7), px(9), px(7), px(9), px(12), px(9)],
          ];
      return wrap(
        (collision ? [[0, 0, px(7), 1, h, px(9)] as Box] : [...posts, ...rails]).map((b) => rotateBox(b, f)),
      );
    }
    case 'door': {
      // Facing north: a panel on the far side; open swings it against the west side.
      const panel: Box = open ? [0, 0, 0, px(3), 1, 1] : [0, 0, 0, 1, 1, px(3)];
      return [{ box: rotateBox(panel, f), vOffset: top ? 0.5 : 0, vScale: 0.5 }];
    }
    case 'trapdoor': {
      if (open) return wrap([rotateBox([0, 0, 0, 1, 1, px(3)], f)]);
      return wrap([top ? [0, px(13), 0, 1, 1, 1] : [0, 0, 0, 1, px(3), 1]]);
    }
    case 'box':
      return wrap([rotateBox(box ?? [0, 0, 0, 1, 1, 1], f)]);
    case 'bed': {
      // Facing north: the head is the northern block, its pillow against the north end.
      const out: ShapeBox[] = [{ box: [0, px(3), 0, 1, px(9), 1] }];
      const lz = top ? 0 : px(13);
      for (const lx of [0, px(13)])
        out.push({ box: [lx, 0, lz, lx + px(3), px(3), lz + px(3)], tile: 'planks' });
      if (top) out.push({ box: [px(2), px(9), px(1), px(14), px(12), px(6)], tile: 'wool' });
      if (collision) return [{ box: rotateBox([0, 0, 0, 1, px(9), 1], f) }];
      return out.map((b) => ({ ...b, box: rotateBox(b.box, f) }));
    }
    case 'cross':
    case 'flat':
      return [];
  }
}

/**
 * Blocks made of two cells (doors stand two high, beds lie two long): where the other half is,
 * relative to this one, or null for single-cell shapes. The TOP bit marks the upper door half and
 * the bed's head.
 */
export function partnerOffset(shape: BlockShape, state: number): [number, number, number] | null {
  const top = (state & TOP) !== 0;
  if (shape === 'door') return [0, top ? -1 : 1, 0];
  if (shape === 'bed') {
    const [dx, dz] = FACING_DIR[facingOf(state)];
    return top ? [0 - dx, 0, 0 - dz] : [dx, 0, dz];
  }
  return null;
}

/** Shapes that join up with neighbours, and which neighbours they join. */
export function connectGroup(shape: BlockShape): 'fence' | 'wall' | 'pane' | null {
  if (shape === 'fence' || shape === 'fence_gate') return 'fence';
  if (shape === 'wall') return 'wall';
  if (shape === 'pane') return 'pane';
  return null;
}
