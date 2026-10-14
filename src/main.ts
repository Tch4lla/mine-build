import './style.css';
import { GAME_NAME } from './brand';
import { initPhysics } from './physics/physicsWorld';
import { createAtlasTexture, loadLibraryTiles } from './engine/atlas';
import { clearIconCache, initIcons } from './items/icons';
import { setBlockArt } from './world/blocks';
import { refreshBlockUVs } from './world/chunkMesher';
import { loadLibraryArt } from './library/art';
import { Game, setTileColorAtlas } from './game';
import { MainMenu, exportWorldToFile, loadSettings, saveSettings, showPause } from './ui/menus';
import { loadWorld } from './save/saveManager';
import { listPhotos } from './photos/photoStore';
import { registerThumb } from './photos/photoTextures';

const $ = (id: string) => document.getElementById(id)!;
const dom = { viewport: $('viewport'), hud: $('hud'), screens: $('screens') };
const menuRoot = $('menu');

let game: Game | null = null;
let settings = loadSettings();

declare global {
  interface Window {
    __game?: Game | null;
  }
}

async function boot(): Promise<void> {
  const menu = new MainMenu(menuRoot, (id) => void play(id));
  menu.loading('Loading…');
  await initPhysics();
  const { texture, canvas } = createAtlasTexture();
  await Promise.all([loadLibraryTiles(canvas, texture), loadLibraryArt()]);
  initIcons(canvas, texture);
  setTileColorAtlas(canvas);
  // Thumbnails for photo items in inventories.
  listPhotos()
    .then((ps) => ps.forEach(registerThumb))
    .catch(() => undefined);

  async function play(worldId: string): Promise<void> {
    menu.loading('Generating world…');
    await new Promise((r) => setTimeout(r, 30));
    const loaded = await loadWorld(worldId);
    if (!loaded) {
      alert('World not found');
      void menu.show();
      return;
    }
    setBlockArt(settings.art);
    refreshBlockUVs();
    clearIconCache();
    game = new Game(dom, loaded.meta, loaded.chunks, settings, texture);
    window.__game = game;
    game.applySettings(settings);
    menu.hide();
    game.onPauseRequest = () => pause(true);
    game.start();
    game.hud.toast(`Welcome to ${loaded.meta.name}! Press H for controls.`);
  }

  function pause(on: boolean): void {
    if (!game) return;
    const g = game;
    g.setPaused(on);
    if (!on) {
      menuRoot.innerHTML = '';
      return;
    }
    showPause(menuRoot, {
      resume: () => pause(false),
      help: () => {
        menuRoot.innerHTML = '';
        g.setPaused(false);
        g.screens.show('help');
      },
      quit: async () => {
        await g.save();
        g.dispose();
        game = null;
        window.__game = null;
        void menu.show();
      },
      export: async () => {
        await g.save();
        await exportWorldToFile(g.meta);
      },
      settings,
      applySettings: (s) => {
        settings = s;
        saveSettings(s);
        g.applySettings(s);
      },
      creative: g.creative,
      setCreative: (on2) => g.setCreative(on2),
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && game?.paused) pause(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void game?.save();
  });
  window.addEventListener('beforeunload', () => void game?.save());

  await menu.show();
}

boot().catch((e) => {
  console.error(e);
  menuRoot.innerHTML = `<div class="menu-screen"><div class="logo"><span class="logo-name">${GAME_NAME}</span></div><p>Failed to start: ${String(e?.message ?? e)}</p><p class="muted">This game needs WebGL and a modern browser.</p></div>`;
});
