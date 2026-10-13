/**
 * 16x16 pixel-art sprites for non-block items, drawn with code. The same pixel grids are used
 * for inventory icons and extruded into 3D models for the first-person view and dropped items.
 */
import { item } from './items';

export const SPRITE = 16;
/** RGBA packed as 0xRRGGBBAA; 0 = transparent. */
export type Sprite = Uint32Array;

function hex(c: string, a = 255): number {
  const n = parseInt(c.replace('#', ''), 16);
  return ((n << 8) | a) >>> 0;
}
function shade(c: number, k: number): number {
  const r = Math.min(255, Math.round(((c >>> 24) & 255) * k));
  const g = Math.min(255, Math.round(((c >>> 16) & 255) * k));
  const b = Math.min(255, Math.round(((c >>> 8) & 255) * k));
  return ((r << 24) | (g << 16) | (b << 8) | (c & 255)) >>> 0;
}

class Pix {
  d = new Uint32Array(SPRITE * SPRITE);
  set(x: number, y: number, c: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < SPRITE && y < SPRITE) this.d[y * SPRITE + x] = c;
  }
  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= SPRITE || y >= SPRITE) return 0;
    return this.d[y * SPRITE + x];
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number, thick = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      for (let t = 0; t < thick; t++) this.set(x + t, y, c);
    }
  }
  disc(cx: number, cy: number, r: number, c: number | ((x: number, y: number, d: number) => number)) {
    for (let y = 0; y < SPRITE; y++)
      for (let x = 0; x < SPRITE; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r) this.set(x, y, typeof c === 'number' ? c : c(x, y, d));
      }
  }
  rect(x0: number, y0: number, w: number, h: number, c: number) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c);
  }
  /** Darkened 1px outline around opaque pixels (Minecraft-y look). */
  outline(c = 0x1a1410ff) {
    const copy = this.d.slice();
    for (let y = 0; y < SPRITE; y++)
      for (let x = 0; x < SPRITE; x++) {
        if (copy[y * SPRITE + x]) continue;
        const n = [
          copy[y * SPRITE + x - 1],
          copy[y * SPRITE + x + 1],
          copy[(y - 1) * SPRITE + x],
          copy[(y + 1) * SPRITE + x],
        ];
        if ((x > 0 && n[0]) || (x < SPRITE - 1 && n[1]) || (y > 0 && n[2]) || (y < SPRITE - 1 && n[3]))
          this.d[y * SPRITE + x] = c;
      }
    return this;
  }
}

const WOOD = hex('#8b5a2b');
const WOOD_L = hex('#b08654');
const HANDLE = (p: Pix, x0 = 2, y0 = 13, x1 = 10, y1 = 5) => {
  p.line(x0, y0, x1, y1, WOOD, 2);
  p.line(x0, y0, x1, y1, WOOD_L, 1);
};

type Painter = (p: Pix) => void;
const blob =
  (color: string, r = 5, cx = 7.5, cy = 8.5): Painter =>
  (p) => {
    const c = hex(color);
    p.disc(cx, cy, r, (x, y) =>
      x + y < cx + cy - 2 ? shade(c, 1.25) : x + y > cx + cy + 3 ? shade(c, 0.75) : c,
    );
  };

const PAINTERS: Record<string, Painter> = {
  stick: (p) => HANDLE(p, 3, 13, 12, 3),
  wood_sword: (p) => {
    const blade = hex('#c9a46c');
    p.line(5, 10, 13, 2, blade, 2);
    p.line(6, 10, 13, 3, shade(blade, 1.2), 1);
    p.line(3, 8, 7, 12, hex('#5a3a1a'), 1);
    p.line(2, 14, 5, 11, WOOD, 2);
  },
  wood_pickaxe: (p) => {
    HANDLE(p, 3, 13, 10, 6);
    const head = hex('#c9a46c');
    p.line(4, 3, 9, 3, head, 1);
    p.line(9, 3, 13, 7, head, 1);
    p.line(13, 7, 13, 12, head, 1);
    p.line(5, 4, 9, 4, shade(head, 0.8), 1);
    p.line(9, 4, 12, 7, shade(head, 0.8), 1);
    p.line(12, 7, 12, 11, shade(head, 0.8), 1);
  },
  wood_axe: (p) => {
    HANDLE(p, 3, 13, 11, 5);
    const head = hex('#c9a46c');
    p.rect(9, 2, 4, 5, head);
    p.rect(12, 3, 2, 4, shade(head, 0.8));
    p.rect(8, 6, 2, 2, head);
  },
  wood_shovel: (p) => {
    HANDLE(p, 2, 14, 9, 7);
    const head = hex('#c9a46c');
    p.disc(11.5, 4.5, 2.6, head);
    p.line(10, 6, 13, 3, shade(head, 1.2), 1);
  },
  shield: (p) => {
    const rim = hex('#5a5a62');
    const wood = hex('#9a6b3c');
    for (let y = 1; y < 15; y++)
      for (let x = 2; x < 14; x++) {
        const bottom = y > 9 ? Math.abs(x - 7.5) > (15 - y) * 1.2 : false;
        if (bottom) continue;
        const edge = x === 2 || x === 13 || y === 1 || (y > 9 && Math.abs(x - 7.5) > (14 - y) * 1.2);
        p.set(x, y, edge ? rim : (x + y) % 5 === 0 ? shade(wood, 0.85) : wood);
      }
    p.disc(7.5, 7, 1.6, rim);
  },
  rock: blob('#8a8a8a', 5),
  flint: (p) => {
    const c = hex('#3b3b44');
    for (let y = 3; y < 14; y++)
      for (let x = 3; x < 13; x++)
        if (Math.abs(x - 8) + Math.abs(y - 8) * 0.8 < 5.5)
          p.set(x, y, (x * 3 + y) % 7 === 0 ? shade(c, 1.6) : c);
  },
  iron_chunk: blob('#d8d0c8', 4.6),
  crystal: (p) => {
    const c = hex('#6ee6ff');
    for (let y = 2; y < 15; y++)
      for (let x = 3; x < 13; x++) {
        const w = y < 7 ? (y - 2) * 0.9 : (15 - y) * 0.6;
        if (Math.abs(x - 7.5) <= w) p.set(x, y, x < 7.5 ? shade(c, 1.2) : c);
      }
  },
  ember: (p) => {
    p.disc(7.5, 9, 4.5, (_x, _y, d) => (d < 2 ? hex('#fff1a0') : d < 3.4 ? hex('#ffb13a') : hex('#e2521f')));
    p.line(7, 4, 8, 2, hex('#ffb13a'));
  },
  slime: (p) => {
    p.disc(7.5, 9, 5, (x, y) => (x + y < 13 ? hex('#a6f07a') : hex('#6cc444')));
    p.set(6, 7, 0xffffffff);
    p.set(7, 6, 0xffffffff);
  },
  blast_fruit: (p) => {
    blob('#e8423a', 4.8, 7.5, 9)(p);
    p.line(8, 4, 10, 1, hex('#5a3a1a'));
    p.set(10, 1, hex('#ffdd44'));
  },
  part_board: (p) => {
    p.rect(1, 6, 14, 4, WOOD_L);
    p.line(1, 9, 14, 9, WOOD, 1);
    p.set(3, 7, WOOD);
    p.set(12, 7, WOOD);
  },
  part_crate: (p) => {
    p.rect(2, 2, 12, 12, WOOD_L);
    p.line(2, 2, 13, 13, WOOD, 1);
    p.line(2, 13, 13, 2, WOOD, 1);
    p.rect(2, 2, 12, 1, WOOD);
    p.rect(2, 13, 12, 1, WOOD);
  },
  part_wheel: (p) => {
    p.disc(7.5, 7.5, 6.5, (_x, _y, d) =>
      d > 4.5 ? hex('#2b2b2b') : d > 1.5 ? hex('#b08654') : hex('#777777'),
    );
  },
  part_fan: (p) => {
    p.rect(2, 2, 12, 12, hex('#3a4a5a'));
    p.disc(7.5, 7.5, 5, hex('#5aa0d8'));
    p.line(7.5, 3, 7.5, 12, hex('#d8eaff'));
    p.line(3, 7.5, 12, 7.5, hex('#d8eaff'));
    p.disc(7.5, 7.5, 1.2, hex('#333333'));
  },
  part_rocket: (p) => {
    const body = hex('#e8e8e8');
    p.rect(6, 3, 4, 9, body);
    p.rect(9, 3, 1, 9, shade(body, 0.8));
    p.line(6, 3, 8, 1, hex('#d84a3a'), 2);
    p.rect(4, 10, 2, 3, hex('#d84a3a'));
    p.rect(10, 10, 2, 3, hex('#d84a3a'));
    p.rect(7, 12, 2, 3, hex('#ffb13a'));
  },
  part_balloon: (p) => {
    p.disc(7.5, 6, 5, (x, y) => (x + y < 11 ? hex('#ffa0c8') : hex('#ff6fa8')));
    p.line(7.5, 11, 7, 15, hex('#ffffff'));
  },
  part_seat: (p) => {
    const c = hex('#3a6ad8');
    p.rect(3, 9, 10, 3, c);
    p.rect(3, 3, 3, 7, shade(c, 0.85));
    p.rect(4, 12, 2, 3, WOOD);
    p.rect(11, 12, 2, 3, WOOD);
  },
  part_spring: (p) => {
    const c = hex('#c0c0c0');
    for (let i = 0; i < 4; i++) p.line(3, 4 + i * 3, 12, 5 + i * 3, i % 2 ? shade(c, 0.75) : c, 1);
    p.rect(2, 14, 12, 1, hex('#666666'));
    p.rect(2, 2, 12, 1, hex('#d84a3a'));
  },
  part_light: (p) => {
    p.disc(7.5, 7.5, 5, (_x, _y, d) => (d < 2.5 ? hex('#ffffff') : hex('#ffe680')));
  },
  dummy: (p) => {
    p.rect(7, 4, 2, 11, WOOD);
    p.rect(3, 6, 10, 2, WOOD);
    p.disc(7.5, 3, 2.4, hex('#e0c890'));
    p.rect(5, 8, 6, 4, hex('#c8a060'));
  },
  photo_frame: (p) => {
    p.rect(1, 2, 14, 12, hex('#7a5230'));
    p.rect(3, 4, 10, 8, hex('#9fd3ff'));
    p.rect(3, 9, 10, 3, hex('#6cbf5a'));
    p.disc(10, 6, 1.3, hex('#fff27a'));
  },
  photo_block: (p) => {
    p.rect(2, 2, 12, 12, hex('#9fd3ff'));
    p.rect(2, 9, 12, 5, hex('#6cbf5a'));
    p.disc(10, 5, 1.5, hex('#fff27a'));
  },
};

const cache = new Map<string, Sprite>();

/** Returns the sprite for an item (falls back to a coloured blob). */
export function itemSprite(id: string): Sprite {
  let s = cache.get(id);
  if (!s) {
    const p = new Pix();
    (PAINTERS[id] ?? blob(item(id).color, 5))(p);
    p.outline();
    s = p.d;
    cache.set(id, s);
  }
  return s;
}

export function spriteRGBA(s: Sprite, i: number): [number, number, number, number] {
  const c = s[i];
  return [(c >>> 24) & 255, (c >>> 16) & 255, (c >>> 8) & 255, c & 255];
}
