/** Modal screens: inventory + crafting, Workbench (Bind), photo gallery, help. */
import { h, clear, renderSlot, stackName, tooltipText } from './dom';
import { HOTBAR_SIZE, INVENTORY_SIZE, canMerge, type Inventory, type ItemStack } from '../items/inventory';
import { ITEMS, item } from '../items/items';
import { RECIPES, canCraft, craft } from '../items/crafting';
import { iconFor } from '../items/icons';
import { MATERIALS, applyBind, canBind, boundStats, stackStats } from '../bind/bindRecipes';
import { deletePhoto, listPhotos, type PhotoRecord } from '../photos/photoStore';
import { captureWebcam, startWebcam } from '../photos/importPhoto';
import { forgetPhoto, registerThumb } from '../photos/photoTextures';

export interface ScreenHost {
  inventory: Inventory;
  creative: boolean;
  toast(msg: string): void;
  /** Throws a stack into the world in front of the player. */
  dropStack(stack: ItemStack): void;
  importPhotoFiles(files: FileList | File[]): Promise<void>;
  importPhotoBlob(blob: Blob, w: number, h: number, name: string): Promise<void>;
}

export type ScreenName = 'inventory' | 'workbench' | 'gallery' | 'help';

abstract class Screen {
  readonly el: HTMLElement;
  constructor(
    protected host: ScreenHost,
    protected close: () => void,
  ) {
    this.el = h('div', { class: 'screen-backdrop' });
    this.el.addEventListener('mousedown', (e) => {
      if (e.target === this.el) this.close();
    });
  }
  abstract render(): void;
  onClose(): void {}
}

// ---------------------------------------------------------------------------------------------

class Tooltip {
  private el = h('div', { class: 'tooltip hidden' });
  constructor() {
    document.body.append(this.el);
  }
  show(stack: ItemStack, e: MouseEvent) {
    const t = tooltipText(stack);
    this.el.innerHTML = '';
    this.el.append(h('div', { class: 't-name' }, t.name));
    if (t.sub) for (const line of t.sub.split('\n')) this.el.append(h('div', { class: 't-sub' }, line));
    this.el.classList.remove('hidden');
    this.move(e);
  }
  move(e: MouseEvent) {
    this.el.style.left = `${e.clientX + 16}px`;
    this.el.style.top = `${e.clientY + 12}px`;
  }
  hide() {
    this.el.classList.add('hidden');
  }
  destroy() {
    this.el.remove();
  }
}

class InventoryScreen extends Screen {
  private cursor: ItemStack | null = null;
  private cursorEl = h('div', { class: 'slot cursor-stack hidden' });
  private tab: 'crafting' | 'creative' = 'crafting';
  private tooltip = new Tooltip();
  private moveListener = (e: MouseEvent) => {
    this.cursorEl.style.left = `${e.clientX}px`;
    this.cursorEl.style.top = `${e.clientY}px`;
    this.tooltip.move(e);
  };

  constructor(host: ScreenHost, close: () => void) {
    super(host, close);
    document.body.append(this.cursorEl);
    window.addEventListener('mousemove', this.moveListener);
    if (host.creative) this.tab = 'creative';
  }

  private slotEl(index: number): HTMLElement {
    const inv = this.host.inventory;
    const el = h('div', { class: 'slot' });
    renderSlot(el, inv.slots[index]);
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.clickSlot(index, e.button === 2, e.shiftKey);
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('mouseenter', (e) => {
      const s = inv.slots[index];
      if (s) this.tooltip.show(s, e);
    });
    el.addEventListener('mouseleave', () => this.tooltip.hide());
    return el;
  }

  private clickSlot(i: number, right: boolean, shift: boolean): void {
    const inv = this.host.inventory;
    const slot = inv.slots[i];
    if (shift && slot && !this.cursor) {
      // Quick-move between hotbar and backpack.
      const range = i < HOTBAR_SIZE ? [HOTBAR_SIZE, INVENTORY_SIZE] : [0, HOTBAR_SIZE];
      for (let j = range[0]; j < range[1]; j++) {
        if (!inv.slots[j]) {
          inv.slots[j] = slot;
          inv.slots[i] = null;
          break;
        }
      }
    } else if (!this.cursor) {
      if (!slot) return;
      if (right && slot.count > 1) {
        const half = Math.ceil(slot.count / 2);
        this.cursor = { ...slot, count: half };
        slot.count -= half;
      } else {
        this.cursor = slot;
        inv.slots[i] = null;
      }
    } else if (!slot) {
      if (right) {
        inv.slots[i] = { ...this.cursor, count: 1 };
        this.cursor.count--;
        if (this.cursor.count <= 0) this.cursor = null;
      } else {
        inv.slots[i] = this.cursor;
        this.cursor = null;
      }
    } else if (canMerge(slot, this.cursor)) {
      const max = item(slot.id).maxStack;
      const n = right ? Math.min(1, max - slot.count) : Math.min(this.cursor.count, max - slot.count);
      slot.count += n;
      this.cursor.count -= n;
      if (this.cursor.count <= 0) this.cursor = null;
    } else {
      inv.slots[i] = this.cursor;
      this.cursor = slot;
    }
    inv.changed();
    this.render();
  }

  render(): void {
    const inv = this.host.inventory;
    clear(this.el);
    const panel = h('div', { class: 'panel' });
    const left = h('div');
    left.append(h('h2', {}, 'Inventory'));
    const bag = h('div', { class: 'grid' });
    for (let i = HOTBAR_SIZE; i < INVENTORY_SIZE; i++) bag.append(this.slotEl(i));
    const bar = h('div', { class: 'grid', style: 'margin-top:10px' });
    for (let i = 0; i < HOTBAR_SIZE; i++) bar.append(this.slotEl(i));
    left.append(bag, bar);
    const trash = h(
      'button',
      {
        style: 'margin-top:10px',
        onclick: () => {
          if (this.cursor) {
            this.host.dropStack(this.cursor);
            this.cursor = null;
            this.render();
          }
        },
      },
      'Drop held stack',
    );
    left.append(
      h(
        'div',
        { class: 'row small muted', style: 'margin-top:8px' },
        trash,
        'Right-click splits · Shift-click moves',
      ),
    );

    const right = h('div');
    const tabs = h('div', { class: 'tabs' });
    const mkTab = (id: 'crafting' | 'creative', label: string) =>
      h(
        'button',
        { class: this.tab === id ? 'active' : '', onclick: () => ((this.tab = id), this.render()) },
        label,
      );
    tabs.append(mkTab('crafting', 'Crafting'));
    if (this.host.creative) tabs.append(mkTab('creative', 'Creative items'));
    right.append(tabs);

    if (this.tab === 'crafting') {
      const list = h('div', { class: 'recipes' });
      const sorted = [...RECIPES].sort((a, b) => Number(canCraft(inv, b)) - Number(canCraft(inv, a)));
      for (const r of sorted) {
        const ok = canCraft(inv, r);
        const ins = h('div', { class: 'ins' });
        for (const i of r.inputs)
          ins.append(h('img', { src: iconFor({ id: i.id }), title: item(i.id).name }), `${i.count}`);
        const row = h(
          'button',
          {
            class: `recipe ${ok ? 'ok' : 'no'}`,
            onclick: () => {
              if (craft(inv, r)) {
                this.host.toast(
                  `Crafted ${r.output.count > 1 ? r.output.count + '× ' : ''}${item(r.output.id).name}`,
                );
                this.render();
              }
            },
          },
          h('img', { src: iconFor(r.output) }),
          h('span', {}, `${item(r.output.id).name}${r.output.count > 1 ? ` ×${r.output.count}` : ''}`),
          ins,
        );
        list.append(row);
      }
      right.append(list);
    } else {
      right.append(h('p', { class: 'small muted' }, 'Click an item to put a stack on your cursor.'));
      const cat = h('div', { class: 'catalog' });
      for (const d of ITEMS) {
        if (d.kind === 'photo_frame' || d.kind === 'photo_block') continue;
        const el = h('div', { class: 'slot' });
        renderSlot(el, { id: d.id, count: 1 });
        el.addEventListener('mousedown', () => {
          this.cursor = { id: d.id, count: d.maxStack };
          this.render();
        });
        el.addEventListener('mouseenter', (e) => this.tooltip.show({ id: d.id, count: 1 }, e));
        el.addEventListener('mouseleave', () => this.tooltip.hide());
        cat.append(el);
      }
      right.append(cat);
    }
    panel.append(h('div', { class: 'inv-layout' }, left, right));
    this.el.append(panel);

    renderSlot(this.cursorEl, this.cursor);
    this.cursorEl.classList.toggle('hidden', !this.cursor);
  }

  onClose(): void {
    if (this.cursor) {
      const left = this.host.inventory.add(this.cursor);
      if (left > 0) this.host.dropStack({ ...this.cursor, count: left });
      this.cursor = null;
    }
    this.cursorEl.remove();
    this.tooltip.destroy();
    window.removeEventListener('mousemove', this.moveListener);
  }
}

// ---------------------------------------------------------------------------------------------

class WorkbenchScreen extends Screen {
  private toolSlot: number | null = null;
  private material: string | null = null;
  private photos: PhotoRecord[] = [];

  constructor(host: ScreenHost, close: () => void) {
    super(host, close);
    const inv = host.inventory;
    if (inv.held && item(inv.held.id).kind === 'tool') this.toolSlot = inv.selected;
    void listPhotos().then((p) => {
      this.photos = p;
      p.forEach(registerThumb);
      this.render();
    });
  }

  render(): void {
    const inv = this.host.inventory;
    clear(this.el);
    const panel = h('div', { class: 'panel' });
    panel.append(
      h(
        'div',
        { class: 'panel-head' },
        h('h2', {}, 'Workbench'),
        h('span', { class: 'small muted' }, 'Attach materials to tools for new powers'),
      ),
    );
    const tools: number[] = [];
    const materials = new Map<string, number>();
    inv.slots.forEach((s, i) => {
      if (!s) return;
      if (item(s.id).kind === 'tool') tools.push(i);
      if (s.id in MATERIALS) materials.set(s.id, (materials.get(s.id) ?? 0) + s.count);
    });
    if (this.toolSlot !== null && !inv.slots[this.toolSlot]) this.toolSlot = null;

    const left = h('div');
    left.append(h('h3', {}, '1. Pick a tool'));
    const tl = h('div', { class: 'choice-list' });
    if (tools.length === 0)
      tl.append(h('p', { class: 'muted' }, 'You have no tools. Craft a stick or a sword first.'));
    for (const i of tools) {
      const s = inv.slots[i]!;
      tl.append(
        h(
          'button',
          {
            class: `choice ${this.toolSlot === i ? 'sel' : ''}`,
            onclick: () => ((this.toolSlot = i), this.render()),
          },
          h('img', { src: iconFor(s) }),
          stackName(s),
        ),
      );
    }
    left.append(tl);
    left.append(h('h3', {}, '2. Pick a material'));
    const ml = h('div', { class: 'choice-list' });
    if (materials.size === 0)
      ml.append(
        h(
          'p',
          { class: 'muted' },
          'No bindable materials. Mine stone for rocks, gravel for flint, ores for iron/ember/crystal, puffballs for gel.',
        ),
      );
    for (const [id, count] of materials) {
      const tool = this.toolSlot !== null ? inv.slots[this.toolSlot] : null;
      const ok = !tool || canBind(tool.id, id);
      ml.append(
        h(
          'button',
          {
            class: `choice ${this.material === id ? 'sel' : ''}`,
            disabled: !ok,
            onclick: () => ((this.material = id), this.render()),
          },
          h('img', { src: iconFor({ id }) }),
          `${item(id).name} ×${count}`,
        ),
      );
    }
    left.append(ml);

    const right = h('div');
    const tool = this.toolSlot !== null ? inv.slots[this.toolSlot] : null;
    right.append(h('h3', {}, 'Result'));
    if (tool) {
      const before = stackStats(tool)!;
      const mat = this.material && canBind(tool.id, this.material) ? this.material : null;
      const after = mat ? boundStats(tool.id, mat) : null;
      const preview = h('div', { class: 'fuse-preview' }, h('img', { src: iconFor({ id: tool.id }) }));
      if (mat)
        preview.append(
          '+',
          h('img', { src: iconFor({ id: mat }) }),
          '=',
          h('img', { src: iconFor({ id: tool.id, data: { fuse: mat } }) }),
        );
      right.append(preview);
      right.append(h('div', { style: 'font-size:18px;font-weight:700' }, after ? after.name : before.name));
      const table = h('table', { class: 'stat-table' });
      const row = (label: string, a: string | number, b?: string | number) => {
        const up = b !== undefined && Number(b) > Number(a);
        table.append(
          h(
            'tr',
            {},
            h('td', {}, label),
            h('td', {}, String(a)),
            h('td', { class: up ? 'up' : '' }, b !== undefined ? `→ ${b}` : ''),
          ),
        );
      };
      row('Damage', before.damage, after?.damage);
      row('Knockback', before.knockback, after?.knockback);
      row(
        'Mining speed',
        `${before.breakSpeed} (${before.cls})`,
        after ? `${after.breakSpeed} (${after.cls})` : undefined,
      );
      row('Effect', before.effect, after?.effect);
      if (after) row('Uses', '∞', after.durability);
      right.append(table);
      if (tool.data?.fuse)
        right.append(
          h(
            'p',
            { class: 'small muted' },
            `Currently bound: ${item(tool.data.fuse).name}. Binding again replaces it.`,
          ),
        );
      const actions = h('div', { class: 'row', style: 'margin-top:14px' });
      actions.append(
        h(
          'button',
          {
            class: 'primary',
            disabled: !mat,
            onclick: () => {
              if (!mat || this.toolSlot === null) return;
              if (!this.host.creative && !inv.remove(mat, 1)) return;
              inv.slots[this.toolSlot] = applyBind(inv.slots[this.toolSlot]!, mat);
              inv.changed();
              this.host.toast(`Bound! ${boundStats(tool.id, mat).name}`);
              this.render();
            },
          },
          'Bind',
        ),
      );
      if (tool.data?.fuse)
        actions.append(
          h(
            'button',
            {
              onclick: () => {
                const t = inv.slots[this.toolSlot!]!;
                const data = { ...t.data };
                delete data.fuse;
                delete data.durability;
                inv.slots[this.toolSlot!] = { ...t, data: Object.keys(data).length ? data : undefined };
                inv.changed();
                this.render();
              },
            },
            'Unbind',
          ),
        );
      right.append(actions);

      if (tool.id === 'shield') {
        right.append(h('h3', {}, 'Shield emblem (your photo)'));
        const pl = h('div', { class: 'choice-list' });
        if (this.photos.length === 0)
          pl.append(
            h('p', { class: 'small muted' }, 'Add photos in the gallery [P] to use them as an emblem.'),
          );
        for (const p of this.photos) {
          const sel = tool.data?.photoId === p.id;
          pl.append(
            h(
              'button',
              {
                class: `choice ${sel ? 'sel' : ''}`,
                onclick: () => {
                  const t = inv.slots[this.toolSlot!]!;
                  inv.slots[this.toolSlot!] = { ...t, data: { ...t.data, photoId: sel ? undefined : p.id } };
                  inv.changed();
                  this.render();
                },
              },
              h('img', { src: registerThumb(p), style: 'object-fit:cover' }),
              p.name,
            ),
          );
        }
        right.append(pl);
      }
    } else right.append(h('p', { class: 'muted' }, 'Choose a tool on the left.'));
    right.append(
      h(
        'p',
        { class: 'small muted', style: 'margin-top:16px' },
        'Tip: you can also drop a material [Q], hold a tool and press [F] while looking at it.',
      ),
    );
    panel.append(h('div', { class: 'fuse-layout' }, left, right));
    this.el.append(panel);
  }
}

// ---------------------------------------------------------------------------------------------

class GalleryScreen extends Screen {
  private photos: PhotoRecord[] = [];
  private stopCam: (() => void) | null = null;
  private video: HTMLVideoElement | null = null;
  private frameSize = 2;
  private loading = true;

  constructor(host: ScreenHost, close: () => void) {
    super(host, close);
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.photos = await listPhotos();
    this.photos.forEach(registerThumb);
    this.loading = false;
    this.render();
  }

  private give(stack: ItemStack, label: string): void {
    const left = this.host.inventory.add(stack);
    if (left > 0) this.host.dropStack({ ...stack, count: left });
    this.host.toast(`${label} added to your inventory`);
  }

  render(): void {
    clear(this.el);
    const panel = h('div', { class: 'panel' });
    const fileInput = h('input', {
      type: 'file',
      accept: 'image/*',
      multiple: true,
      class: 'hidden',
      'data-testid': 'photo-input',
    }) as HTMLInputElement;
    fileInput.addEventListener('change', async () => {
      if (fileInput.files?.length) {
        await this.host.importPhotoFiles(fileInput.files);
        await this.refresh();
      }
    });
    panel.append(
      h(
        'div',
        { class: 'panel-head' },
        h('h2', {}, 'Photo Gallery'),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'primary', onclick: () => fileInput.click() }, 'Upload photos'),
          h(
            'button',
            { onclick: () => void this.toggleCamera() },
            this.stopCam ? 'Close camera' : 'Use camera',
          ),
          fileInput,
        ),
      ),
    );
    const zone = h(
      'div',
      { class: 'dropzone' },
      'Drag & drop images here (or anywhere on the game). Photos stay on this device.',
    );
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('over');
      if (e.dataTransfer?.files.length) {
        await this.host.importPhotoFiles(e.dataTransfer.files);
        await this.refresh();
      }
    });
    panel.append(zone);

    if (this.stopCam && this.video) {
      panel.append(
        h(
          'div',
          { class: 'webcam' },
          this.video,
          h('button', { class: 'primary', onclick: () => void this.snap() }, '📸 Take photo'),
        ),
      );
    }

    panel.append(
      h(
        'div',
        { class: 'row', style: 'margin-bottom:10px' },
        h('span', { class: 'muted' }, 'Frame size:'),
        ...[1, 2, 3, 4].map((n) =>
          h(
            'button',
            {
              class: this.frameSize === n ? 'primary' : '',
              onclick: () => ((this.frameSize = n), this.render()),
            },
            `${n}×`,
          ),
        ),
      ),
    );

    const grid = h('div', { class: 'gallery' });
    if (this.loading) grid.append(h('p', { class: 'muted' }, 'Loading…'));
    else if (this.photos.length === 0)
      grid.append(h('p', { class: 'muted' }, 'No photos yet. Upload some to hang them in your world!'));
    for (const p of this.photos) {
      const card = h('div', { class: 'photo-card' });
      card.append(h('img', { src: registerThumb(p), alt: p.name }));
      card.append(h('div', { class: 'name', title: p.name }, `${p.name} · ${p.w}×${p.h}`));
      const actions = h('div', { class: 'actions' });
      actions.append(
        h(
          'button',
          {
            onclick: () =>
              this.give(
                { id: 'photo_frame', count: 1, data: { photoId: p.id, size: this.frameSize } },
                `${this.frameSize}× picture frame`,
              ),
          },
          `Frame ${this.frameSize}×`,
        ),
        h(
          'button',
          {
            onclick: () =>
              this.give({ id: 'photo_block', count: 16, data: { photoId: p.id } }, '16 photo blocks'),
          },
          'Photo blocks',
        ),
        h(
          'button',
          {
            class: 'danger',
            onclick: async () => {
              if (
                !confirm(`Delete "${p.name}" from your gallery? Frames using it will show a blank picture.`)
              )
                return;
              await deletePhoto(p.id);
              forgetPhoto(p.id);
              await this.refresh();
            },
          },
          'Delete',
        ),
      );
      card.append(actions);
      grid.append(card);
    }
    panel.append(grid);
    this.el.append(panel);
  }

  private async toggleCamera(): Promise<void> {
    if (this.stopCam) {
      this.stopCam();
      this.stopCam = null;
      this.video = null;
      this.render();
      return;
    }
    try {
      this.video = h('video', { autoplay: true, playsinline: true }) as HTMLVideoElement;
      this.stopCam = await startWebcam(this.video);
    } catch (e) {
      this.video = null;
      this.stopCam = null;
      this.host.toast(`Camera unavailable: ${(e as Error).message}`);
    }
    this.render();
  }

  private async snap(): Promise<void> {
    if (!this.video) return;
    try {
      const { blob, w, h: hh } = await captureWebcam(this.video);
      await this.host.importPhotoBlob(blob, w, hh, `Camera ${new Date().toLocaleString()}`);
      await this.refresh();
    } catch (e) {
      this.host.toast(`Could not take photo: ${(e as Error).message}`);
    }
  }

  onClose(): void {
    this.stopCam?.();
    this.stopCam = null;
  }
}

// ---------------------------------------------------------------------------------------------

export const CONTROLS: [string, string][] = [
  ['W A S D', 'Move'],
  ['Space', 'Jump (double-tap to fly in creative)'],
  ['Ctrl', 'Sprint'],
  ['Mouse', 'Look'],
  ['Left click', 'Break block / attack / switch on device'],
  ['Right click', 'Place / use held item / guard with shield'],
  ['1-9 / Wheel', 'Choose hotbar slot'],
  ['Q', 'Drop held item'],
  ['E', 'Inventory & crafting'],
  ['V', 'Workbench (Bind materials onto tools)'],
  ['P', 'Photo gallery (upload / camera)'],
  ['G', 'Tether: grab / release part'],
  ['F', 'Join held part · Bind ground item onto tool · Sit'],
  ['X', 'Detach grabbed part'],
  ['R / T / Y', 'Rotate grabbed part (Shift = reverse)'],
  ['Wheel (holding)', 'Move grabbed part nearer / farther'],
  ['Shift + Left click', 'Pick up a part'],
  ['[ / ]', 'Change picture frame size'],
  ['Seated: W/S A/D', 'Drive and steer'],
  ['Seated: Space', 'Switch fans & rockets'],
  ['Seated: Shift', 'Get off'],
  ['Esc', 'Pause menu'],
  ['H', 'This help'],
];

class HelpScreen extends Screen {
  render(): void {
    clear(this.el);
    const grid = h('div', { class: 'help-grid' });
    for (const [k, v] of CONTROLS) grid.append(h('div', {}, h('span', {}, v), h('kbd', {}, k)));
    this.el.append(
      h(
        'div',
        { class: 'panel' },
        h(
          'div',
          { class: 'panel-head' },
          h('h2', {}, 'Controls'),
          h('button', { onclick: () => this.close() }, 'Close'),
        ),
        grid,
        h(
          'p',
          { class: 'small muted', style: 'max-width:820px;margin-top:14px' },
          'Tether: place parts with right-click, grab one with G, bring it next to another part until a green line appears, then press F to join them. Add a Seat to drive: wheels make cars, fans make boats and hovercraft, balloons float, rockets launch. Bind: put rocks on sticks for hammers, embers for fire, gel for bounce, a rocket on a shield for a rocket jump.',
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------------------------

export class Screens {
  private current: { name: ScreenName; screen: Screen } | null = null;
  onOpen: () => void = () => undefined;
  onClose: () => void = () => undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly host: ScreenHost,
  ) {}

  get open(): ScreenName | null {
    return this.current?.name ?? null;
  }

  show(name: ScreenName): void {
    if (this.current?.name === name) {
      this.hide();
      return;
    }
    this.hide(false);
    const close = () => this.hide();
    const screen =
      name === 'inventory'
        ? new InventoryScreen(this.host, close)
        : name === 'workbench'
          ? new WorkbenchScreen(this.host, close)
          : name === 'gallery'
            ? new GalleryScreen(this.host, close)
            : new HelpScreen(this.host, close);
    screen.render();
    this.root.append(screen.el);
    this.current = { name, screen };
    this.onOpen();
  }

  /** Re-render the open screen (e.g. after inventory changes). */
  refresh(): void {
    this.current?.screen.render();
  }

  hide(notify = true): void {
    if (!this.current) return;
    this.current.screen.onClose();
    this.current.screen.el.remove();
    this.current = null;
    if (notify) this.onClose();
  }
}
