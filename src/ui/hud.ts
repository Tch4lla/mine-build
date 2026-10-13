/** In-game HUD: crosshair, hotbar, hearts, hints, toasts and floating numbers. */
import * as THREE from 'three';
import { h, renderSlot, stackName } from './dom';
import { HOTBAR_SIZE, type Inventory } from '../items/inventory';

const HEART_FULL = `<svg viewBox="0 0 9 8" class="heart"><path fill="#1a0000" d="M1 0h2v1h1v1h1V1h1V0h2v1h1v3H8v1H7v1H6v1H5v1H4V7H3V6H2V5H1V4H0V1h1z"/><path fill="#e2342c" d="M1 1h2v1h1v1h1V2h1V1h2v3H7v1H6v1H5v1H4V6H3V5H2V4H1z"/><path fill="#ff9a90" d="M1 1h1v1H1z"/></svg>`;
const HEART_HALF = `<svg viewBox="0 0 9 8" class="heart"><path fill="#1a0000" d="M1 0h2v1h1v1h1V1h1V0h2v1h1v3H8v1H7v1H6v1H5v1H4V7H3V6H2V5H1V4H0V1h1z"/><path fill="#e2342c" d="M1 1h2v1h1v1h0.5v4H4V6H3V5H2V4H1z"/><path fill="#4a1a18" d="M4.5 3h0.5V2h1V1h2v3H7v1H6v1H5v1h-0.5z"/></svg>`;
const HEART_EMPTY = `<svg viewBox="0 0 9 8" class="heart"><path fill="#1a0000" d="M1 0h2v1h1v1h1V1h1V0h2v1h1v3H8v1H7v1H6v1H5v1H4V7H3V6H2V5H1V4H0V1h1z"/><path fill="#4a1a18" d="M1 1h2v1h1v1h1V2h1V1h2v3H7v1H6v1H5v1H4V6H3V5H2V4H1z"/></svg>`;

export class Hud {
  readonly root: HTMLElement;
  private readonly hotbar: HTMLElement;
  private readonly slots: HTMLElement[] = [];
  private readonly hearts: HTMLElement;
  private readonly heldName: HTMLElement;
  private readonly target: HTMLElement;
  private readonly hints: HTMLElement;
  private readonly toasts: HTMLElement;
  private readonly status: HTMLElement;
  private readonly flash: HTMLElement;
  private readonly water: HTMLElement;
  private readonly breakRing: SVGCircleElement;
  private readonly breakSvg: SVGSVGElement;
  readonly clickToPlay: HTMLElement;
  private heldTimer = 0;
  private lastHints = '';
  private lastHearts = -1;
  private lastTarget = '';

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = '';
    this.water = h('div', { class: 'underwater hidden' });
    this.flash = h('div', { class: 'damage-flash' });
    root.append(this.water, this.flash, h('div', { class: 'crosshair' }));
    const svgNS = 'http://www.w3.org/2000/svg';
    this.breakSvg = document.createElementNS(svgNS, 'svg');
    this.breakSvg.setAttribute('viewBox', '0 0 36 36');
    this.breakSvg.classList.add('break-ring');
    this.breakRing = document.createElementNS(svgNS, 'circle');
    this.breakRing.setAttribute('cx', '18');
    this.breakRing.setAttribute('cy', '18');
    this.breakRing.setAttribute('r', '15');
    this.breakRing.setAttribute('fill', 'none');
    this.breakRing.setAttribute('stroke', 'rgba(255,255,255,0.85)');
    this.breakRing.setAttribute('stroke-width', '3');
    this.breakRing.setAttribute('stroke-dasharray', '94.25');
    this.breakRing.setAttribute('transform', 'rotate(-90 18 18)');
    this.breakSvg.append(this.breakRing);
    this.breakSvg.style.display = 'none';
    root.append(this.breakSvg);

    this.hotbar = h('div', { class: 'hotbar' });
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const s = h('div', { class: 'slot' });
      this.slots.push(s);
      this.hotbar.append(s);
    }
    this.hearts = h('div', { class: 'hearts' });
    this.heldName = h('div', { class: 'held-name' });
    this.target = h('div', { class: 'target-info hidden' });
    this.hints = h('div', { class: 'hints' });
    this.toasts = h('div', { class: 'toast-wrap' });
    this.status = h('div', { class: 'status' });
    this.clickToPlay = h('div', { class: 'click-to-play hidden' }, 'Click to play');
    root.append(
      this.hotbar,
      this.hearts,
      this.heldName,
      this.target,
      this.hints,
      this.toasts,
      this.status,
      this.clickToPlay,
    );
  }

  renderHotbar(inv: Inventory): void {
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      renderSlot(this.slots[i], inv.slots[i]);
      this.slots[i].classList.toggle('selected', i === inv.selected);
    }
  }

  showHeldName(inv: Inventory): void {
    const s = inv.held;
    this.heldName.textContent = s ? stackName(s) : '';
    this.heldName.style.opacity = '1';
    this.heldTimer = 2;
  }

  setHealth(hp: number, max: number, visible: boolean): void {
    const key = visible ? hp : -2;
    if (key === this.lastHearts) return;
    this.lastHearts = key;
    this.hearts.style.display = visible ? 'flex' : 'none';
    let html = '';
    for (let i = 0; i < max / 2; i++) {
      const v = hp - i * 2;
      html += v >= 2 ? HEART_FULL : v === 1 ? HEART_HALF : HEART_EMPTY;
    }
    this.hearts.innerHTML = html;
  }

  setTarget(text: string): void {
    if (text === this.lastTarget) return;
    this.lastTarget = text;
    this.target.textContent = text;
    this.target.classList.toggle('hidden', !text);
  }

  /** Hints are [keys, label] pairs. */
  setHints(lines: [string, string][]): void {
    const key = JSON.stringify(lines);
    if (key === this.lastHints) return;
    this.lastHints = key;
    this.hints.innerHTML = '';
    for (const [keys, label] of lines) {
      const row = h('div');
      for (const k of keys.split(' ')) row.append(h('kbd', {}, k), ' ');
      row.append(label);
      this.hints.append(row);
    }
    this.hints.classList.toggle('hidden', lines.length === 0);
  }

  setBreakProgress(p: number): void {
    if (p <= 0) {
      this.breakSvg.style.display = 'none';
      return;
    }
    this.breakSvg.style.display = 'block';
    this.breakRing.setAttribute('stroke-dashoffset', String(94.25 * (1 - Math.min(1, p))));
  }

  toast(msg: string): void {
    const t = h('div', { class: 'toast' }, msg);
    this.toasts.append(t);
    while (this.toasts.children.length > 4) this.toasts.firstChild!.remove();
    setTimeout(() => t.remove(), 3300);
  }

  floatText(text: string, world: THREE.Vector3, camera: THREE.Camera, color?: string): void {
    const p = world.clone().project(camera);
    if (p.z > 1) return;
    const el = h('div', { class: 'float-text' }, text);
    el.style.left = `${((p.x + 1) / 2) * window.innerWidth}px`;
    el.style.top = `${((1 - p.y) / 2) * window.innerHeight}px`;
    if (color) el.style.color = color;
    this.root.append(el);
    setTimeout(() => el.remove(), 1000);
  }

  damageFlash(): void {
    this.flash.style.transition = 'none';
    this.flash.style.opacity = '1';
    requestAnimationFrame(() => {
      this.flash.style.transition = 'opacity 0.6s';
      this.flash.style.opacity = '0';
    });
  }

  setUnderwater(on: boolean): void {
    this.water.classList.toggle('hidden', !on);
  }

  setStatus(text: string): void {
    this.status.textContent = text;
  }

  update(dt: number): void {
    if (this.heldTimer > 0) {
      this.heldTimer -= dt;
      if (this.heldTimer <= 0) this.heldName.style.opacity = '0';
    }
  }
}
