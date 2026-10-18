/** Main menu (world list), pause menu and settings. */
import type { ArtStyle } from '../world/blocks';
import { h, clear } from './dom';
import { createWorld, deleteWorld, exportWorld, importWorld, listWorlds } from '../save/saveManager';
import type { WorldMeta } from '../save/serialize';
import { seedFromString } from '../engine/rng';
import { GAME_NAME, GAME_NAME_KANJI, GAME_SLUG, TAGLINE } from '../brand';
import { migrateLocalStorageKey } from '../save/legacy';

/** The title lockup: the name with its kanji above it. */
function logo(): HTMLElement {
  return h(
    'div',
    { class: 'logo' },
    h('span', { class: 'logo-kanji', 'aria-hidden': 'true' }, GAME_NAME_KANJI),
    h('span', { class: 'logo-name' }, GAME_NAME),
  );
}

export interface Settings {
  renderDistance: number;
  fov: number;
  sensitivity: number;
  slimes: boolean;
  invertY: boolean;
  /** Ink & Wash outline pass (turn off on slow devices). */
  outlines: boolean;
  /** Look of the original blocks: their own 'world' art or the sprite library's. */
  art: ArtStyle;
}

const DEFAULTS: Settings = {
  renderDistance: 6,
  fov: 75,
  sensitivity: 1,
  slimes: true,
  invertY: false,
  outlines: true,
  art: 'world',
};
const KEY = `${GAME_SLUG}-settings`;
migrateLocalStorageKey('mine-build-settings', KEY);

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return { ...DEFAULTS };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

/** The claude.ai artifact viewer's file saving, when the game runs as a published artifact. */
interface ArtifactDownloads {
  save(request: { filename: string; data: string }): Promise<unknown>;
}
interface ArtifactHost {
  use(name: 'downloads'): Promise<ArtifactDownloads | null>;
}

async function download(name: string, text: string): Promise<void> {
  // Inside a claude.ai artifact ordinary downloads are blocked; the viewer saves the file for us
  // once the player confirms.
  const host = (window as { claude?: ArtifactHost }).claude;
  const saver = host ? await host.use('downloads').catch(() => null) : null;
  if (saver) {
    try {
      await saver.save({ filename: name, data: text });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'declined')
        alert(`The world couldn't be saved to a file here (${code ?? 'unavailable'}).`);
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportWorldToFile(meta: WorldMeta): Promise<void> {
  const json = await exportWorld(meta.id);
  await download(`${meta.name.replace(/[^\w-]+/g, '_') || 'world'}.${GAME_SLUG}.json`, json);
}

export class MainMenu {
  private view: 'list' | 'create' = 'list';
  constructor(
    private readonly root: HTMLElement,
    private readonly onPlay: (worldId: string) => void,
  ) {}

  async show(): Promise<void> {
    this.root.classList.remove('hidden');
    clear(this.root);
    const screen = h('div', { class: 'menu-screen' });
    screen.append(logo(), h('div', { class: 'tagline' }, TAGLINE));
    this.root.append(screen);
    if (this.view === 'create') return this.renderCreate(screen);

    const worlds = await listWorlds();
    const list = h('div', { class: 'world-list' });
    if (worlds.length === 0)
      list.append(
        h('p', { class: 'muted', style: 'text-align:center' }, 'No worlds yet — create your first one!'),
      );
    for (const w of worlds) {
      list.append(
        h(
          'div',
          { class: 'world-item' },
          h(
            'div',
            { class: 'info' },
            h('b', {}, w.name),
            h(
              'span',
              {},
              `${w.creative ? 'Creative' : 'Survival'} · seed ${w.seed} · ${new Date(w.lastPlayed).toLocaleString()}`,
            ),
          ),
          h('button', { class: 'primary', onclick: () => this.onPlay(w.id) }, 'Play'),
          h('button', { title: 'Export to file', onclick: () => void exportWorldToFile(w) }, '⭳'),
          h(
            'button',
            {
              class: 'danger',
              title: 'Delete',
              onclick: async () => {
                if (confirm(`Delete "${w.name}"? This cannot be undone.`)) {
                  await deleteWorld(w.id);
                  void this.show();
                }
              },
            },
            '✕',
          ),
        ),
      );
    }
    screen.append(list);
    const importInput = h('input', {
      type: 'file',
      accept: '.json,application/json',
      class: 'hidden',
    }) as HTMLInputElement;
    importInput.addEventListener('change', async () => {
      const f = importInput.files?.[0];
      if (!f) return;
      try {
        await importWorld(await f.text());
        void this.show();
      } catch (e) {
        alert(`Import failed: ${(e as Error).message}`);
      }
    });
    screen.append(
      h(
        'div',
        { class: 'row' },
        h(
          'button',
          {
            class: 'primary',
            'data-testid': 'new-world',
            onclick: () => ((this.view = 'create'), void this.show()),
          },
          'Create new world',
        ),
        h('button', { onclick: () => importInput.click() }, 'Import world'),
        importInput,
      ),
    );
  }

  private renderCreate(screen: HTMLElement): void {
    const name = h('input', {
      value: 'My World',
      maxlength: 40,
      'data-testid': 'world-name',
    }) as HTMLInputElement;
    const seed = h('input', { placeholder: 'random', 'data-testid': 'world-seed' }) as HTMLInputElement;
    const mode = h(
      'select',
      { 'data-testid': 'world-mode' },
      h('option', { value: 'survival' }, 'Survival (gather & craft)'),
      h('option', { value: 'creative' }, 'Creative (all items, flying)'),
    ) as HTMLSelectElement;
    screen.append(
      h(
        'div',
        { class: 'panel' },
        h('h2', {}, 'New world'),
        h(
          'div',
          { class: 'form' },
          h('label', {}, 'Name'),
          name,
          h('label', {}, 'Seed'),
          seed,
          h('label', {}, 'Mode'),
          mode,
        ),
      ),
      h(
        'div',
        { class: 'row' },
        h('button', { onclick: () => ((this.view = 'list'), void this.show()) }, 'Back'),
        h(
          'button',
          {
            class: 'primary',
            'data-testid': 'create-world',
            onclick: async () => {
              const s = seed.value.trim() ? seedFromString(seed.value) : Math.floor(Math.random() * 2 ** 31);
              const meta = await createWorld(name.value, s, mode.value === 'creative');
              this.view = 'list';
              this.onPlay(meta.id);
            },
          },
          'Create & play',
        ),
      ),
    );
    name.focus();
    name.select();
  }

  hide(): void {
    clear(this.root);
  }

  loading(text: string): void {
    clear(this.root);
    this.root.append(h('div', { class: 'menu-screen' }, logo(), h('div', { class: 'loading' }, text)));
  }
}

export interface PauseActions {
  resume(): void;
  help(): void;
  quit(): Promise<void>;
  export(): Promise<void>;
  settings: Settings;
  applySettings(s: Settings): void;
  creative: boolean;
  setCreative(on: boolean): void;
}

export function showPause(root: HTMLElement, a: PauseActions): void {
  clear(root);
  const screen = h('div', { class: 'menu-screen overlay' });
  const s = { ...a.settings };
  const range = (
    label: string,
    key: 'renderDistance' | 'fov' | 'sensitivity',
    min: number,
    max: number,
    step: number,
  ) => {
    const val = h('span', { class: 'muted' }, String(s[key]));
    const input = h('input', { type: 'range', min, max, step, value: s[key] }) as HTMLInputElement;
    input.addEventListener('input', () => {
      s[key] = Number(input.value);
      val.textContent = input.value;
      a.applySettings({ ...s });
    });
    return [h('label', {}, label), h('div', { class: 'row' }, input, val)];
  };
  const check = (label: string, key: 'slimes' | 'invertY' | 'outlines') => {
    const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
    input.checked = s[key];
    input.addEventListener('change', () => {
      s[key] = input.checked;
      a.applySettings({ ...s });
    });
    return [h('label', {}, label), input];
  };
  const art = h(
    'select',
    { 'data-testid': 'art-style' },
    h('option', { value: 'world' }, 'World'),
    h('option', { value: 'library' }, 'Library'),
  ) as HTMLSelectElement;
  art.value = s.art;
  art.addEventListener('change', () => {
    s.art = art.value as ArtStyle;
    a.applySettings({ ...s });
  });
  const creative = h('input', { type: 'checkbox' }) as HTMLInputElement;
  creative.checked = a.creative;
  creative.addEventListener('change', () => a.setCreative(creative.checked));

  screen.append(
    h('div', { class: 'logo', style: 'font-size:40px' }, 'Paused'),
    h(
      'div',
      { class: 'menu-buttons' },
      h('button', { class: 'primary', onclick: () => a.resume() }, 'Back to game'),
      h('button', { onclick: () => a.help() }, 'Controls'),
      h('button', { onclick: () => void a.export() }, 'Export world to file'),
      h('button', { onclick: () => void a.quit() }, 'Save & quit to menu'),
    ),
    h(
      'div',
      { class: 'panel' },
      h('h2', {}, 'Settings'),
      h(
        'div',
        { class: 'form' },
        ...range('Render distance', 'renderDistance', 3, 12, 1),
        ...range('Field of view', 'fov', 50, 110, 1),
        ...range('Mouse sensitivity', 'sensitivity', 0.2, 3, 0.1),
        ...check('Puffballs', 'slimes'),
        ...check('Invert mouse Y', 'invertY'),
        ...check('Ink outlines', 'outlines'),
        h('label', { title: 'How the original blocks look: their own art or the sprite library' }, 'Art'),
        art,
        h('label', {}, 'Creative mode'),
        creative,
      ),
    ),
  );
  root.append(screen);
}
