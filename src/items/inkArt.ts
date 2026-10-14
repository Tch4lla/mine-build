/**
 * Item art in the Ink & Wash style: each item is a small SVG drawing (0–100 viewBox) made only of
 * filled shapes in the ink palette. The same drawing becomes the inventory icon (with an ink
 * stroke) and, extruded, the 3D model for the held item and dropped items.
 *
 * Tools are drawn with the handle at the bottom-left and the head at the top-right.
 */
import { item } from './items';

/** Palette (kept in step with INK in engine/atlas.ts). */
export const C = {
  ink: '#2a221d',
  paper: '#f3ead8',
  wood: '#c9a57a',
  woodDark: '#8a6544',
  bark: '#6e5440',
  stone: '#b8b4aa',
  stoneDark: '#8f8a80',
  iron: '#d8d2c8',
  ironDark: '#a9a296',
  vermilion: '#d8573c',
  teal: '#3f7f86',
  indigo: '#3d5a80',
  leaf: '#78a37e',
  gold: '#e8b85a',
  ember: '#e08a4a',
  crystal: '#8fd0dc',
  gel: '#c3a8f0',
  pink: '#e98fa8',
  sky: '#a9cfd8',
};

const handle = (x0 = 14, y0 = 88, x1 = 62, y1 = 40, w = 9) => {
  // A rotated rectangle from (x0,y0) to (x1,y1).
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * (w / 2);
  const ny = (dx / len) * (w / 2);
  const p = [
    [x0 + nx, y0 + ny],
    [x1 + nx, y1 + ny],
    [x1 - nx, y1 - ny],
    [x0 - nx, y0 - ny],
  ];
  return `<polygon fill="${C.wood}" points="${p.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`;
};

const ART: Record<string, string> = {
  stick: handle(16, 86, 80, 22, 10),
  wood_sword: `
    <polygon fill="${C.iron}" points="40,62 80,14 90,12 88,22 46,68"/>
    <polygon fill="${C.ironDark}" points="46,68 88,22 90,12 86,16 44,64"/>
    <polygon fill="${C.woodDark}" points="26,56 32,50 54,72 48,78"/>
    ${handle(14, 90, 36, 66, 10)}
    <circle fill="${C.vermilion}" cx="13" cy="91" r="6"/>`,
  wood_pickaxe: `
    ${handle(14, 88, 64, 38, 9)}
    <path fill="${C.stone}" d="M30 22 Q60 6 92 34 L84 42 Q60 22 38 30 Z"/>
    <path fill="${C.stoneDark}" d="M58 34 L70 22 L76 28 L64 40 Z"/>`,
  wood_axe: `
    ${handle(16, 88, 70, 30, 9)}
    <path fill="${C.stone}" d="M56 16 L74 8 Q94 22 86 46 L66 40 Z"/>
    <path fill="${C.stoneDark}" d="M60 30 L68 22 L74 28 L66 36 Z"/>`,
  wood_shovel: `
    ${handle(14, 90, 62, 42, 8)}
    <path fill="${C.iron}" d="M58 30 Q72 10 88 12 Q90 28 70 42 Z"/>
    <path fill="${C.ironDark}" d="M58 30 L70 42 L64 46 L54 36 Z"/>`,
  shield: `
    <path fill="${C.wood}" d="M50 8 L86 20 Q86 66 50 92 Q14 66 14 20 Z"/>
    <path fill="${C.vermilion}" d="M50 8 L86 20 Q86 30 84 40 L16 40 Q14 30 14 20 Z"/>
    <circle fill="${C.iron}" cx="50" cy="52" r="9"/>`,
  rock: `
    <path fill="${C.stone}" d="M18 62 Q16 36 40 26 Q66 18 80 38 Q90 60 70 76 Q40 88 18 62 Z"/>
    <path fill="${C.stoneDark}" d="M44 72 Q64 70 74 56 Q72 70 60 76 Z"/>`,
  flint: `
    <polygon fill="#4a4652" points="50,10 82,40 70,88 30,84 20,44"/>
    <polygon fill="#6c6878" points="50,10 60,40 44,60 20,44"/>`,
  iron_chunk: `
    <polygon fill="${C.iron}" points="22,48 42,20 74,24 86,52 66,82 32,78"/>
    <polygon fill="${C.ironDark}" points="42,20 74,24 60,44 38,42"/>`,
  crystal: `
    <polygon fill="${C.crystal}" points="50,6 72,36 60,92 40,92 28,36"/>
    <polygon fill="#c8eef4" points="50,6 50,92 40,92 28,36"/>
    <polygon fill="${C.crystal}" points="74,40 88,56 80,88 66,88"/>`,
  ember: `
    <path fill="${C.vermilion}" d="M50 8 Q72 36 76 58 Q78 86 50 90 Q22 86 24 58 Q28 40 40 30 Q42 46 50 48 Q48 26 50 8 Z"/>
    <path fill="${C.gold}" d="M50 48 Q64 60 62 74 Q58 84 50 84 Q40 84 38 72 Q38 60 50 48 Z"/>`,
  slime: `
    <path fill="${C.gel}" d="M14 74 Q14 34 50 30 Q86 34 86 74 Q50 86 14 74 Z"/>
    <circle fill="#f1eafd" cx="36" cy="50" r="7"/>`,
  blast_fruit: `
    <circle fill="${C.vermilion}" cx="48" cy="58" r="30"/>
    <path fill="${C.woodDark}" d="M50 30 Q56 16 70 12 L72 18 Q60 22 56 32 Z"/>
    <circle fill="${C.gold}" cx="72" cy="12" r="6"/>
    <circle fill="#f0a08a" cx="38" cy="48" r="7"/>`,
  part_board: `
    <rect fill="${C.wood}" x="6" y="36" width="88" height="28" rx="3"/>
    <rect fill="${C.woodDark}" x="6" y="56" width="88" height="8"/>
    <circle fill="${C.woodDark}" cx="18" cy="46" r="3"/>
    <circle fill="${C.woodDark}" cx="82" cy="46" r="3"/>`,
  part_crate: `
    <rect fill="${C.wood}" x="12" y="12" width="76" height="76" rx="3"/>
    <rect fill="${C.woodDark}" x="12" y="12" width="76" height="10"/>
    <rect fill="${C.woodDark}" x="12" y="78" width="76" height="10"/>
    <polygon fill="${C.woodDark}" points="16,72 72,16 84,28 28,84"/>`,
  part_wheel: `
    <circle fill="${C.ink}" cx="50" cy="50" r="42"/>
    <circle fill="${C.wood}" cx="50" cy="50" r="28"/>
    <rect fill="${C.woodDark}" x="46" y="24" width="8" height="52"/>
    <rect fill="${C.woodDark}" x="24" y="46" width="52" height="8"/>
    <circle fill="${C.iron}" cx="50" cy="50" r="9"/>`,
  part_fan: `
    <rect fill="${C.indigo}" x="10" y="10" width="80" height="80" rx="10"/>
    <circle fill="${C.sky}" cx="50" cy="50" r="32"/>
    <path fill="${C.paper}" d="M50 50 Q42 22 56 20 Q64 34 50 50 Z"/>
    <path fill="${C.paper}" d="M50 50 Q78 42 80 56 Q66 64 50 50 Z"/>
    <path fill="${C.paper}" d="M50 50 Q58 78 44 80 Q36 66 50 50 Z"/>
    <path fill="${C.paper}" d="M50 50 Q22 58 20 44 Q34 36 50 50 Z"/>
    <circle fill="${C.ink}" cx="50" cy="50" r="6"/>`,
  part_rocket: `
    <rect fill="${C.paper}" x="36" y="24" width="28" height="52" rx="4"/>
    <path fill="${C.vermilion}" d="M36 26 Q50 2 64 26 Z"/>
    <polygon fill="${C.vermilion}" points="36,58 22,80 36,76"/>
    <polygon fill="${C.vermilion}" points="64,58 78,80 64,76"/>
    <path fill="${C.gold}" d="M40 78 L60 78 Q56 96 50 98 Q44 96 40 78 Z"/>
    <circle fill="${C.teal}" cx="50" cy="42" r="7"/>`,
  part_balloon: `
    <path fill="${C.pink}" d="M50 6 Q82 8 80 42 Q76 66 50 74 Q24 66 20 42 Q18 8 50 6 Z"/>
    <polygon fill="${C.vermilion}" points="44,74 56,74 50,82"/>
    <rect fill="${C.ink}" x="48.5" y="82" width="3" height="16"/>
    <circle fill="#f6c6d4" cx="38" cy="26" r="7"/>`,
  part_seat: `
    <rect fill="${C.indigo}" x="14" y="52" width="72" height="16" rx="4"/>
    <rect fill="#34506f" x="14" y="14" width="18" height="44" rx="4"/>
    <rect fill="${C.woodDark}" x="20" y="68" width="10" height="22"/>
    <rect fill="${C.woodDark}" x="70" y="68" width="10" height="22"/>`,
  part_spring: `
    <rect fill="${C.stoneDark}" x="12" y="84" width="76" height="8" rx="2"/>
    <rect fill="${C.iron}" x="20" y="66" width="60" height="9" rx="4" transform="rotate(-6 50 70)"/>
    <rect fill="${C.iron}" x="20" y="48" width="60" height="9" rx="4" transform="rotate(6 50 52)"/>
    <rect fill="${C.iron}" x="20" y="30" width="60" height="9" rx="4" transform="rotate(-6 50 34)"/>
    <rect fill="${C.vermilion}" x="12" y="10" width="76" height="10" rx="2"/>`,
  part_light: `
    <circle fill="${C.gold}" cx="50" cy="50" r="34"/>
    <circle fill="#fbf0c8" cx="50" cy="50" r="20"/>`,
  dummy: `
    <rect fill="${C.woodDark}" x="46" y="30" width="8" height="64"/>
    <rect fill="${C.woodDark}" x="14" y="38" width="72" height="8"/>
    <circle fill="#e3c88e" cx="50" cy="20" r="13"/>
    <rect fill="#d9b866" x="32" y="44" width="36" height="30" rx="4"/>
    <circle fill="${C.vermilion}" cx="50" cy="59" r="7"/>`,
  photo_frame: `
    <rect fill="${C.woodDark}" x="8" y="14" width="84" height="72" rx="3"/>
    <rect fill="${C.sky}" x="18" y="24" width="64" height="52"/>
    <path fill="${C.leaf}" d="M18 76 L18 60 L40 46 L58 62 L70 54 L82 64 L82 76 Z"/>
    <circle fill="${C.vermilion}" cx="66" cy="38" r="7"/>`,
  photo_block: `
    <rect fill="${C.sky}" x="12" y="12" width="76" height="76" rx="3"/>
    <path fill="${C.leaf}" d="M12 88 L12 62 L36 46 L56 64 L70 54 L88 66 L88 88 Z"/>
    <circle fill="${C.vermilion}" cx="66" cy="34" r="8"/>`,
};

/** Fallback for any item without bespoke art: a disc in the item's colour. */
function fallback(id: string): string {
  return `<circle fill="${item(id).color}" cx="50" cy="50" r="32"/>`;
}

/** SVG fragment (no wrapper) for an item's drawing. */
export function itemArt(id: string): string {
  return ART[id] ?? fallback(id);
}

export function hasArt(id: string): boolean {
  return id in ART;
}

/** Where on a tool a bound material sits, in the 0–100 box (from the 16-grid fuseAnchor). */
export function anchorOf(id: string): [number, number] {
  const a = item(id).tool?.fuseAnchor ?? [8, 8];
  return [(a[0] + 0.5) * (100 / 16), (a[1] + 0.5) * (100 / 16)];
}

/**
 * A complete SVG document for an item. `stroke` adds the ink outline used for icons; models are
 * built without it (the world's ink pass outlines them instead).
 */
export function itemSvg(id: string, opts: { fuse?: string; stroke?: boolean } = {}): string {
  let body = itemArt(id);
  if (opts.fuse) {
    const [ax, ay] = anchorOf(id);
    const s = 0.42;
    body += `<g transform="translate(${(ax - 50 * s).toFixed(1)} ${(ay - 50 * s).toFixed(1)}) scale(${s})">${itemArt(opts.fuse)}</g>`;
  }
  const stroke = opts.stroke
    ? ` stroke="${C.ink}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112"><g${stroke}>${body}</g></svg>`;
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
