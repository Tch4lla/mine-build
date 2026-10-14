/** Minimal DOM helpers. */
import { item } from '../items/items';
import type { ItemStack } from '../items/inventory';
import { iconFor, photoThumb } from '../items/icons';
import { stackStats } from '../bind/bindRecipes';

type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, '').toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function stackName(stack: ItemStack): string {
  const stats = stackStats(stack);
  if (stats) return stats.name;
  const def = item(stack.id);
  if (stack.data?.size && stack.id === 'photo_frame') return `${def.name} (${stack.data.size}×)`;
  return def.name;
}

/** Fills a slot element with a stack's icon, count and durability. */
export function renderSlot(el: HTMLElement, stack: ItemStack | null): void {
  clear(el);
  if (!stack) return;
  const thumb = photoThumb(stack.data?.photoId);
  const isPhotoItem = stack.id === 'photo_frame' || stack.id === 'photo_block';
  el.append(
    h('img', {
      src: isPhotoItem && thumb ? thumb : iconFor(stack),
      class: isPhotoItem && thumb ? 'photo' : '',
      alt: '',
    }),
  );
  if (stack.count > 1) el.append(h('span', { class: 'count' }, String(stack.count)));
  const stats = stackStats(stack);
  if (stats && stack.data?.fuse && Number.isFinite(stats.durability)) {
    const frac = Math.max(0, (stack.data.durability ?? stats.durability) / stats.durability);
    const bar = h('i', {
      style: `width:${frac * 100}%;background:${frac > 0.5 ? 'var(--accent-2)' : frac > 0.2 ? 'var(--gold)' : 'var(--accent)'}`,
    });
    el.append(h('div', { class: 'dur' }, bar));
  }
  if (stack.id === 'photo_frame' && stack.data?.size)
    el.append(h('span', { class: 'badge' }, `${stack.data.size}×`));
  if (stack.id === 'shield' && stack.data?.photoId) el.append(h('span', { class: 'badge' }, '★'));
}

export function tooltipText(stack: ItemStack): { name: string; sub: string } {
  const def = item(stack.id);
  const stats = stackStats(stack);
  const parts: string[] = [];
  if (stats) {
    parts.push(`Damage ${stats.damage} · Knockback ${stats.knockback}`);
    if (stats.cls !== 'sword' && stats.cls !== 'shield' && stats.cls !== 'stick')
      parts.push(`Mining ×${stats.breakSpeed} (${stats.cls})`);
    if (stats.effect !== 'none') parts.push(`Effect: ${stats.effect}`);
    if (stack.data?.fuse)
      parts.push(`Bound: ${item(stack.data.fuse).name} (${stack.data.durability ?? '?'} uses left)`);
  }
  if (def.fusable) parts.push('Can be bound onto tools [V]');
  if (def.kind === 'part') parts.push('Tether part: right-click to place');
  if (def.description) parts.push(def.description);
  return { name: stackName(stack), sub: parts.join('\n') };
}
