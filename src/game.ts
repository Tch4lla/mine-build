/** The running game: owns every system and drives the main loop. */
import * as THREE from 'three';
import { Physics, RAPIER, GROUP, groups } from './physics/physicsWorld';
import { Input } from './engine/input';
import { World } from './world/world';
import {
  AIR,
  BEDROCK,
  BLOCKS,
  STONE as STONE_ID,
  blockArt,
  blockByKey,
  setBlockArt,
  GRASS,
  IS_SOLID,
  PHOTO,
  SAND,
  SNOW,
  LEAVES,
  isWater,
} from './world/blocks';
import { raycastVoxels, type VoxelHit } from './world/raycast';
import { SEA_LEVEL } from './world/terrain';
import { ATLAS_COLS, TILE_PX, tileIndex } from './world/tiles';
import { refreshBlockUVs } from './world/chunkMesher';
import { clearIconCache } from './items/icons';
import { OPEN, TOP, facingFromYaw, type BlockShape } from './world/shapes';
import { Player } from './player/player';
import { Inventory, HOTBAR_SIZE, type ItemStack } from './items/inventory';
import { item } from './items/items';
import {
  ContraptionManager,
  MAX_PARTS,
  type Contraption,
  type PartInstance,
  type DriveInput,
} from './build/contraptions';
import { PARTS, partByItem, partRadius } from './build/parts';
import { Tether } from './build/tether';
import { Mobs, type Mob } from './entities/mobs';
import { DroppedItems } from './entities/droppedItems';
import { FallingBlocks } from './entities/fallingBlocks';
import { BlockUpdates } from './world/blockUpdates';
import { Particles } from './effects/particles';
import { PhotoEntities, type FrameData } from './photos/photoEntities';
import { addPhoto } from './photos/photoStore';
import { processImageFile } from './photos/importPhoto';
import { registerThumb, setMaxAnisotropy } from './photos/photoTextures';
import { applyBind, breakTime, canBind, stackStats, wearBind, type BoundStats } from './bind/bindRecipes';
import { Sky } from './view/sky';
import { InkPass } from './view/inkPass';
import { toonGradient } from './engine/atlas';
import { ViewModel } from './view/viewmodel';
import { Hud } from './ui/hud';
import { Screens, type ScreenHost, type ScreenName } from './ui/screens';
import type { Settings } from './ui/menus';
import type { WorldMeta } from './save/serialize';
import { saveWorld } from './save/saveManager';

type Target =
  | { kind: 'block'; hit: VoxelHit; distance: number; point: THREE.Vector3 }
  | { kind: 'part'; c: Contraption; p: PartInstance; distance: number; point: THREE.Vector3 }
  | { kind: 'mob'; mob: Mob; distance: number; point: THREE.Vector3 }
  | { kind: 'frame'; frame: FrameData; distance: number; point: THREE.Vector3 };

const UP = new THREE.Vector3(0, 1, 0);
const SCREEN_KEYS: Record<string, ScreenName> = {
  KeyE: 'inventory',
  KeyV: 'workbench',
  KeyP: 'gallery',
  KeyH: 'help',
};

export interface GameDom {
  viewport: HTMLElement;
  hud: HTMLElement;
  screens: HTMLElement;
}

export class Game implements ScreenHost {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly input: Input;
  readonly physics = new Physics();
  readonly world: World;
  readonly player: Player;
  readonly inventory = new Inventory();
  readonly contraptions: ContraptionManager;
  readonly tether: Tether;
  readonly mobs: Mobs;
  readonly dropped: DroppedItems;
  readonly falling: FallingBlocks;
  readonly blockUpdates: BlockUpdates;
  readonly photos = new PhotoEntities();
  readonly particles = new Particles();
  readonly sky: Sky;
  readonly viewmodel: ViewModel;
  readonly hud: Hud;
  readonly screens: Screens;
  readonly ink: InkPass;

  private readonly highlight: THREE.LineSegments;
  private readonly playerLight = new THREE.PointLight(0xfff0c0, 0, 16, 1.4);
  private readonly fires = new Map<string, { x: number; y: number; z: number; t: number; fx: number }>();
  private breaking: { x: number; y: number; z: number; progress: number } | null = null;
  private attackCooldown = 0;
  private placeCooldown = 0;
  private seatedIn: { c: Contraption; p: PartInstance } | null = null;
  private target: Target | null = null;
  private raf = 0;
  private last = 0;
  private time = 0;
  private autosave = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private fps = 0;
  private showDebug = false;
  private shieldCooldown = 0;
  private spawn = new THREE.Vector3();
  paused = false;
  onPauseRequest: () => void = () => undefined;
  private readonly keyListener: (e: KeyboardEvent) => void;
  private readonly lockListener: () => void;
  private readonly resizeListener: () => void;
  private readonly dropListeners: [string, (e: DragEvent) => void][] = [];
  private dropOverlay: HTMLElement | null = null;

  constructor(
    private readonly dom: GameDom,
    readonly meta: WorldMeta,
    chunks: Map<string, Uint16Array>,
    private settings: Settings,
    atlasTexture: THREE.Texture,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.autoClear = false;
    const buf = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.ink = new InkPass(buf.x, buf.y);
    this.ink.enabled = settings.outlines;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
    dom.viewport.append(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      settings.fov,
      window.innerWidth / window.innerHeight,
      0.05,
      1000,
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.add(this.playerLight);
    this.scene.add(this.camera);
    this.input = new Input(this.renderer.domElement);

    // Ink & Wash: flat washes lit in three toon bands; outlines come from the ink pass.
    const solid = new THREE.MeshToonMaterial({
      map: atlasTexture,
      vertexColors: true,
      alphaTest: 0.5,
      gradientMap: toonGradient(),
    });
    const water = new THREE.MeshToonMaterial({
      gradientMap: toonGradient(),
      map: atlasTexture,
      vertexColors: true,
      transparent: true,
      // Writes depth so the ink pass outlines the water's surface, not the seabed under it.
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    this.world = new World(meta.seed, this.physics, solid, water);
    this.world.loadModifiedChunks(chunks);
    this.world.renderDistance = settings.renderDistance;
    this.scene.add(this.world.group);

    this.sky = new Sky(this.scene);
    this.sky.time = meta.timeOfDay ?? 0.3;

    this.player = new Player(this.physics, this.world);
    this.player.creative = meta.creative;
    this.contraptions = new ContraptionManager(this.physics);
    this.tether = new Tether(this.physics, this.contraptions);
    this.mobs = new Mobs(this.physics, this.world);
    this.mobs.spawningEnabled = settings.slimes;
    this.dropped = new DroppedItems(this.world);
    this.falling = new FallingBlocks(this.world);
    this.blockUpdates = new BlockUpdates(this.world);
    this.scene.add(
      this.contraptions.group,
      this.tether.line,
      this.tether.beam,
      this.mobs.group,
      this.dropped.group,
      this.falling.group,
      this.photos.group,
      this.particles.mesh,
    );

    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
      new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }),
    );
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    this.viewmodel = new ViewModel(settings.fov);
    this.hud = new Hud(dom.hud);
    dom.hud.classList.remove('hidden');
    this.screens = new Screens(dom.screens, this);
    this.screens.onOpen = () => {
      this.input.enabled = false;
      this.input.unlock();
    };
    this.screens.onClose = () => {
      this.input.enabled = !this.paused;
      if (!this.paused) this.input.lock();
    };

    this.wireEvents();
    this.loadState();

    this.keyListener = (e) => this.onKey(e);
    window.addEventListener('keydown', this.keyListener);
    this.lockListener = () => {
      const locked = this.input.locked;
      this.hud.clickToPlay.classList.toggle('hidden', locked || !!this.screens.open || this.paused);
      if (!locked && !this.screens.open && !this.paused && this.raf) this.onPauseRequest();
    };
    document.addEventListener('pointerlockchange', this.lockListener);
    this.resizeListener = () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.ink.setSize(size.x, size.y);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.resizeListener);
    this.setupDragAndDrop();
  }

  get creative(): boolean {
    return this.player.creative;
  }

  // -------------------------------------------------------------------------------------------
  // Setup

  private wireEvents(): void {
    this.inventory.onChange(() => {
      this.hud.renderHotbar(this.inventory);
    });
    this.player.onDamage = () => this.hud.damageFlash();
    this.player.onDeath = () => {
      this.toast('You fainted! Respawning…');
      if (this.seatedIn) this.exitSeat();
      this.player.health = this.player.maxHealth;
      this.world.prepareArea(this.spawn, 1);
      this.player.teleport(this.spawn.x, this.spawn.y, this.spawn.z);
    };
    this.mobs.onSlimeDeath = (pos) => {
      this.particles.burst(pos, 0xb9a6e8, 24, { speed: 4 });
      this.dropped.drop(
        { id: 'slime', count: 1 + Math.floor(Math.random() * 2) },
        pos,
        new THREE.Vector3(0, 3, 0),
      );
    };
    this.contraptions.onSpring = (pos, up) => {
      this.particles.burst(pos, 0xc0c0c0, 10, { speed: 3 });
      const feet = this.player.position;
      if (!this.player.seated && feet.distanceTo(pos) < 1.4 && feet.y > pos.y - 0.2)
        this.player.launch(up.clone().multiplyScalar(16));
    };
    // Water flow and falling sand react to every block change.
    this.blockUpdates.onFall = (x, y, z, id) => this.falling.spawn(x, y, z, id);
    this.falling.onBlocked = (id, pos) => this.dropped.drop({ id: BLOCKS[id].key, count: 1 }, pos);
    this.world.onBlockChange((x, y, z) => this.blockUpdates.scheduleAround(x, y, z));
    this.world.onBlockChange((x, y, z, oldId, newId) => {
      if (!IS_SOLID[newId]) {
        for (const f of this.photos.framesOn(x, y, z)) {
          this.photos.removeFrame(f.id);
          this.giveOrDrop(
            { id: 'photo_frame', count: 1, data: { photoId: f.photoId, size: f.size } },
            new THREE.Vector3(x + 0.5 + f.nx * 0.7, y + 0.5, z + 0.5 + f.nz * 0.7),
          );
        }
      }
      if (oldId === PHOTO && newId !== PHOTO) {
        const pb = this.photos.removePhotoBlock(x, y, z);
        if (pb)
          this.giveOrDrop(
            { id: 'photo_block', count: 1, data: { photoId: pb.photoId } },
            new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5),
          );
      }
    });
  }

  private findSpawn(): THREE.Vector3 {
    const gen = this.world.generator;
    for (let r = 0; r < 96; r += 4) {
      for (let a = 0; a < Math.max(1, r); a += 4) {
        const ang = (a / Math.max(1, r)) * Math.PI * 2;
        const x = Math.round(Math.cos(ang) * r);
        const z = Math.round(Math.sin(ang) * r);
        const h = gen.heightAt(x, z);
        if (h > SEA_LEVEL + 1 && h < SEA_LEVEL + 24) {
          const y = this.world.surfaceY(x, z);
          const top = this.world.getBlock(x, y, z);
          if (top === GRASS || top === SAND || top === SNOW)
            return new THREE.Vector3(x + 0.5, y + 1, z + 0.5);
        }
      }
    }
    return new THREE.Vector3(0.5, this.world.surfaceY(0, 0) + 1, 0.5);
  }

  private loadState(): void {
    const m = this.meta;
    this.spawn = m.player?.spawn ? new THREE.Vector3().fromArray(m.player.spawn) : this.findSpawn();
    const start = m.player ? new THREE.Vector3().fromArray(m.player.pos) : this.spawn.clone();
    this.world.prepareArea(start, 2);
    this.player.teleport(start.x, start.y, start.z);
    if (m.player) {
      this.player.yaw = m.player.yaw;
      this.player.pitch = m.player.pitch;
      this.player.health = m.player.health;
      this.player.flying = m.player.flying && m.creative;
    }
    if (m.inventory) this.inventory.load(m.inventory);
    else this.giveStarterKit();
    this.contraptions.load(m.contraptions ?? []);
    for (const d of m.dummies ?? []) this.mobs.spawnDummy(new THREE.Vector3().fromArray(d.pos), d.yaw);
    this.photos.load(m.frames ?? [], m.photoBlocks ?? []);
    this.dropped.load(m.dropped ?? []);
    this.hud.renderHotbar(this.inventory);
  }

  private giveStarterKit(): void {
    const kit: ItemStack[] = this.meta.creative
      ? [
          { id: 'part_board', count: 16 },
          { id: 'part_wheel', count: 16 },
          { id: 'part_seat', count: 16 },
          { id: 'part_fan', count: 16 },
          { id: 'part_balloon', count: 16 },
          { id: 'part_rocket', count: 16 },
          { id: 'stick', count: 1, data: { fuse: 'rock', durability: 25 } },
          { id: 'planks', count: 64 },
          { id: 'glass', count: 64 },
        ]
      : [
          { id: 'wood_pickaxe', count: 1 },
          { id: 'wood_sword', count: 1 },
          { id: 'part_board', count: 4 },
          { id: 'part_wheel', count: 4 },
          { id: 'part_seat', count: 1 },
          { id: 'part_fan', count: 2 },
          { id: 'part_balloon', count: 2 },
          { id: 'shield', count: 1 },
          { id: 'stick', count: 2 },
          { id: 'wood_axe', count: 1 },
          { id: 'part_rocket', count: 1 },
          { id: 'rock', count: 4 },
          { id: 'ember', count: 2 },
          { id: 'slime', count: 2 },
          { id: 'planks', count: 16 },
          { id: 'part_crate', count: 2 },
          { id: 'dummy', count: 1 },
        ];
    for (const s of kit) this.inventory.add(s);
  }

  private setupDragAndDrop(): void {
    const show = (on: boolean) => {
      if (on && !this.dropOverlay) {
        this.dropOverlay = document.createElement('div');
        this.dropOverlay.className = 'drop-overlay';
        this.dropOverlay.textContent = 'Drop photos to add them to your world';
        document.body.append(this.dropOverlay);
      } else if (!on && this.dropOverlay) {
        this.dropOverlay.remove();
        this.dropOverlay = null;
      }
    };
    const over = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        show(true);
      }
    };
    const leave = (e: DragEvent) => {
      if (!e.relatedTarget) show(false);
    };
    const drop = (e: DragEvent) => {
      show(false);
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      void this.importPhotoFiles(e.dataTransfer.files, true);
    };
    for (const [n, f] of [
      ['dragover', over],
      ['dragleave', leave],
      ['drop', drop],
    ] as [string, (e: DragEvent) => void][]) {
      window.addEventListener(n, f as EventListener);
      this.dropListeners.push([n, f]);
    }
  }

  // -------------------------------------------------------------------------------------------
  // ScreenHost

  toast(msg: string): void {
    this.hud.toast(msg);
  }

  dropStack(stack: ItemStack): void {
    const eye = this.player.eye();
    const look = this.player.look();
    this.dropped.drop(
      stack,
      eye.addScaledVector(look, 0.6).add(new THREE.Vector3(0, -0.3, 0)),
      look.multiplyScalar(5).add(new THREE.Vector3(0, 2, 0)),
      2,
    );
  }

  async importPhotoFiles(files: FileList | File[], giveFrames = false): Promise<void> {
    let n = 0;
    for (const f of Array.from(files)) {
      try {
        const { blob, w, h } = await processImageFile(f);
        const rec = await addPhoto(blob, w, h, f.name || 'Photo');
        registerThumb(rec);
        if (giveFrames)
          this.giveOrDrop(
            { id: 'photo_frame', count: 1, data: { photoId: rec.id, size: 2 } },
            this.player.eye(),
          );
        n++;
      } catch (e) {
        this.toast(`Couldn't import ${f.name}: ${(e as Error).message}`);
      }
    }
    if (n)
      this.toast(
        giveFrames
          ? `${n} photo${n > 1 ? 's' : ''} added as picture frames in your inventory`
          : `${n} photo${n > 1 ? 's' : ''} added to your gallery`,
      );
  }

  async importPhotoBlob(blob: Blob, w: number, h: number, name: string): Promise<void> {
    const rec = await addPhoto(blob, w, h, name);
    registerThumb(rec);
    this.toast('Photo saved to your gallery');
  }

  // -------------------------------------------------------------------------------------------
  // Loop

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
    };
    this.raf = requestAnimationFrame(loop);
    this.input.lock();
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  setPaused(p: boolean): void {
    this.paused = p;
    this.input.enabled = !p && !this.screens.open;
    if (!p && !this.screens.open) this.input.lock();
    this.hud.clickToPlay.classList.add('hidden');
  }

  applySettings(s: Settings): void {
    if (s.art !== blockArt()) {
      setBlockArt(s.art);
      refreshBlockUVs();
      clearIconCache();
      this.world.remeshAll();
      this.hud.renderHotbar(this.inventory);
      this.viewmodel.refresh();
    }
    this.settings = s;
    this.ink.enabled = s.outlines;
    this.world.renderDistance = s.renderDistance;
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
    this.input.sensitivity = 0.0022 * s.sensitivity;
    this.mobs.spawningEnabled = s.slimes;
    if (!s.slimes) for (const m of this.mobs.list.filter((x) => x.kind === 'slime')) this.mobs.remove(m);
  }

  setCreative(on: boolean): void {
    this.player.creative = on;
    this.meta.creative = on;
    if (!on) this.player.flying = false;
    this.toast(on ? 'Creative mode: fly with double-tap Space, all items in the inventory' : 'Survival mode');
  }

  private onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (this.paused) return;
    const open = this.screens.open;
    if (open) {
      if (e.code === 'Escape' || SCREEN_KEYS[e.code] === open) this.screens.hide();
      else if (SCREEN_KEYS[e.code]) this.screens.show(SCREEN_KEYS[e.code]);
      return;
    }
    if (SCREEN_KEYS[e.code]) {
      e.preventDefault();
      this.tether.release();
      this.screens.show(SCREEN_KEYS[e.code]);
    } else if (e.code === 'F3') {
      e.preventDefault();
      this.showDebug = !this.showDebug;
      if (!this.showDebug) this.hud.setStatus('');
    }
  }

  frame(dt: number): void {
    const input = this.input;
    this.time += dt;
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc > 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }

    if (!this.paused) {
      if (input.locked && !this.screens.open) {
        const sign = this.settings.invertY ? -1 : 1;
        input.mouseDY *= sign;
        this.player.applyLook(input);
      }
      this.handleKeys();

      const drive: DriveInput | null = this.seatedIn
        ? {
            throttle: (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0),
            steer: (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0),
            toggleDevices: input.pressed('Space'),
          }
        : null;
      let toggleUsed = false;
      const eye = this.player.eye();
      const look = this.player.look();
      this.physics.step(dt, (step) => {
        this.player.step(step, input);
        const d = drive && !toggleUsed ? drive : drive ? { ...drive, toggleDevices: false } : null;
        toggleUsed = true;
        this.contraptions.step(step, d, this.seatedIn?.c ?? null);
        this.tether.update(this.player.eye(eye), this.player.look(look), this.player.yaw);
      });
      if (this.seatedIn && !this.contraptions.list.includes(this.seatedIn.c)) this.exitSeat();
      if (this.seatedIn && !this.seatedIn.c.parts.includes(this.seatedIn.p)) this.exitSeat();

      this.contraptions.sync(this.time);
      this.mobs.update(
        dt,
        this.player.position,
        (m, dir) => this.slimeContact(m, dir),
        (m, pos) => {
          this.particles.burst(pos, 0xff8a2a, 5, { speed: 1.5, up: 1 });
          if (m.kind === 'dummy')
            this.hud.floatText('1', pos.clone().add(new THREE.Vector3(0, 1.9, 0)), this.camera, '#ff9a40');
        },
        this.sky.night,
      );
      this.mobs.sync();
      this.dropped.update(dt, this.time, this.player.position, (s) => this.inventory.add(s));
      this.updateFires(dt);
      this.blockUpdates.step(dt);
      this.falling.update(dt);
      this.particles.update(dt);
      this.sky.update(
        dt,
        this.camera.position,
        this.player.inWater && this.isCameraUnderwater(),
        this.world.renderDistance * 16 * 0.55,
        this.world.renderDistance * 16 * 0.95,
      );

      this.updateCamera();
      this.updateTarget();
      this.handleMouse(dt);

      const center = this.player.position;
      this.world.update(center, []);
      // Only simulate within the range where terrain colliders exist (physicsDistance = 2 chunks).
      this.contraptions.updateActivity(center, 30);
      this.photos.updateVisibility(center, this.world.renderDistance * 16);

      this.autosave += dt;
      if (this.autosave > 30) {
        this.autosave = 0;
        void this.save();
      }
    } else {
      this.updateCamera();
    }

    this.hud.clickToPlay.classList.toggle('hidden', input.locked || !!this.screens.open || this.paused);
    this.updateView(dt);
    this.render();
    input.endFrame();
  }

  private isCameraUnderwater(): boolean {
    const p = this.camera.position;
    return isWater(this.world.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)));
  }

  private updateCamera(): void {
    this.player.eye(this.camera.position);
    this.camera.rotation.set(this.player.pitch, this.player.yaw, 0);
  }

  private render(): void {
    this.renderer.clear();
    const fog = this.scene.fog as THREE.Fog;
    this.ink.setFade(fog.near * 0.6, fog.far * 0.85);
    const night = this.sky.night;
    this.ink.setInk(night > 0.5 ? 0x0c0f18 : 0x2a221d, 0.85 - night * 0.3);
    this.ink.render(this.renderer, this.scene, this.camera);
    this.ink.renderOverlay(this.renderer, this.viewmodel.scene, this.viewmodel.camera);
  }

  private updateView(dt: number): void {
    const held = this.inventory.held;
    const stats = stackStats(held);
    this.viewmodel.setStack(this.tether.held ? null : held);
    this.viewmodel.guarding = held?.id === 'shield' && this.input.isDown('Mouse2');
    const moving =
      (this.input.isDown('KeyW') ||
        this.input.isDown('KeyA') ||
        this.input.isDown('KeyS') ||
        this.input.isDown('KeyD')) &&
      this.player.onGround;
    this.viewmodel.update(
      dt,
      moving && !this.seatedIn,
      window.innerWidth / window.innerHeight,
      this.camera.fov,
    );
    this.viewmodel.setLighting(1 - this.sky.night * 0.7);
    this.viewmodel.camera.visible = true;
    this.playerLight.intensity =
      stats?.effect === 'light' || held?.id === 'part_light' || held?.id === 'lamp' ? 8 : 0;

    this.hud.setHealth(this.player.health, this.player.maxHealth, !this.player.creative);
    this.hud.setUnderwater(this.isCameraUnderwater());
    this.hud.update(dt);
    this.hud.setHints(this.contextHints());
    if (this.showDebug) {
      const p = this.player.position;
      this.hud.setStatus(
        `${this.fps} fps · xyz ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)} · chunks ${this.world.loadedChunkCount} · parts ${this.contraptions.partCount} · mobs ${this.mobs.list.length} · time ${(this.sky.time * 24).toFixed(1)}h`,
      );
    }
  }

  // -------------------------------------------------------------------------------------------
  // Input handling

  private handleKeys(): void {
    const input = this.input;
    const uh = this.tether;
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      if (input.pressed(`Digit${i + 1}`)) this.selectSlot(i);
    }
    if (input.wheel !== 0) {
      if (uh.held) uh.changeDistance(-input.wheel * 0.6);
      else this.selectSlot((this.inventory.selected + (input.wheel > 0 ? 1 : HOTBAR_SIZE - 1)) % HOTBAR_SIZE);
    }

    if (this.seatedIn && (input.pressed('ShiftLeft') || input.pressed('ShiftRight'))) {
      this.exitSeat();
      return;
    }

    if (input.pressed('KeyQ') && this.inventory.held) {
      const held = this.inventory.held;
      const all = input.isDown('ControlLeft');
      const n = all ? held.count : 1;
      this.dropStack({ ...held, count: n });
      this.inventory.consume(this.inventory.selected, n);
    }

    if (input.pressed('KeyG')) {
      if (uh.held) uh.release();
      else {
        const t = this.target;
        if (t?.kind === 'part' && t.c !== this.seatedIn?.c)
          uh.grab(t.c, t.p, t.point, t.distance, this.player.yaw);
        else this.toast('Tether: aim at a part (place one with right-click) and press G');
      }
    }
    if (uh.held) {
      const rev = input.isDown('ShiftLeft') ? -1 : 1;
      const look = this.player.look();
      if (input.pressed('KeyR')) uh.rotate('yaw', look, rev);
      if (input.pressed('KeyT')) uh.rotate('pitch', look, rev);
      if (input.pressed('KeyY')) uh.rotate('roll', look, rev);
      if (input.pressed('KeyX') && !uh.detachHeld())
        this.toast('Nothing to detach — this part is on its own');
      if (input.pressed('KeyF')) {
        const merged = uh.join();
        if (merged) {
          this.particles.burst(merged.position, 0x7aff9a, 18, { speed: 2.5, gravity: 0 });
          this.toast(`Joined! (${merged.parts.length} parts)`);
        } else this.toast('Move the part next to another one until a green line shows, then press F');
      }
    } else if (input.pressed('KeyF')) this.useF();

    if (input.pressed('BracketLeft') || input.pressed('BracketRight')) {
      const held = this.inventory.held;
      if (held?.id === 'photo_frame') {
        const size = Math.max(
          1,
          Math.min(4, (held.data?.size ?? 2) + (input.pressed('BracketRight') ? 1 : -1)),
        );
        held.data = { ...held.data, size };
        this.inventory.changed();
        this.hud.showHeldName(this.inventory);
      }
    }
  }

  private selectSlot(i: number): void {
    if (i === this.inventory.selected) return;
    this.inventory.selected = i;
    this.breaking = null;
    this.hud.renderHotbar(this.inventory);
    this.hud.showHeldName(this.inventory);
  }

  /** F: bind a dropped material onto the held tool, bind a lone part onto it, or sit in a seat. */
  private useF(): void {
    const held = this.inventory.held;
    const isTool = held && item(held.id).kind === 'tool';
    if (isTool) {
      const d = this.dropped.pick(this.player.eye(), this.player.look(), 4);
      if (d && canBind(held!.id, d.stack.id)) {
        this.bindOntoHeld(d.stack.id);
        if (d.stack.count > 1) d.stack.count--;
        else this.dropped.remove(d);
        this.particles.burst(d.pos, item(d.stack.id).color, 14, { speed: 2 });
        return;
      }
      const t = this.target;
      if (
        t?.kind === 'part' &&
        t.c.parts.length === 1 &&
        canBind(held!.id, t.p.def.itemId) &&
        t.c !== this.seatedIn?.c
      ) {
        this.bindOntoHeld(t.p.def.itemId);
        this.particles.burst(t.point, item(t.p.def.itemId).color, 14, { speed: 2 });
        this.contraptions.destroy(t.c);
        return;
      }
    }
    const t = this.target;
    if (t?.kind === 'part' && t.p.def.behavior === 'seat') {
      this.sit(t.c, t.p);
      return;
    }
    if (isTool) this.toast('Drop a material with Q, look at it and press F to bind it onto your tool');
  }

  private bindOntoHeld(materialId: string): void {
    const slot = this.inventory.selected;
    const tool = this.inventory.slots[slot]!;
    this.inventory.slots[slot] = applyBind(tool, materialId);
    this.inventory.changed();
    const s = stackStats(this.inventory.slots[slot])!;
    this.toast(`Bound ${item(materialId).name} → ${s.name}`);
    this.hud.showHeldName(this.inventory);
  }

  private sit(c: Contraption, p: PartInstance): void {
    if (c.occupiedSeat) return;
    this.tether.release();
    c.occupiedSeat = p;
    this.seatedIn = { c, p };
    this.player.setColliderEnabled(false);
    this.player.seated = {
      worldPosition: () => c.worldTransformOf(p).pos,
      exit: () => this.exitSeat(),
    };
    // Rebuild the vehicle so "forward" follows this seat.
    this.toast('Seated — W/S drive, A/D steer, Space switches devices, Shift to get off');
  }

  private exitSeat(): void {
    if (!this.seatedIn) return;
    const { c, p } = this.seatedIn;
    const pos = this.contraptions.list.includes(c) ? c.worldTransformOf(p).pos : this.player.position.clone();
    c.occupiedSeat = null;
    this.seatedIn = null;
    this.player.seated = null;
    let y = Math.floor(pos.y + 0.6);
    while (
      IS_SOLID[this.world.getBlock(Math.floor(pos.x), y, Math.floor(pos.z))] ||
      IS_SOLID[this.world.getBlock(Math.floor(pos.x), y + 1, Math.floor(pos.z))]
    )
      y++;
    this.player.teleport(pos.x, Math.max(y, pos.y + 0.6), pos.z);
    this.player.setColliderEnabled(true);
  }

  // -------------------------------------------------------------------------------------------
  // Targeting

  private updateTarget(): void {
    const eye = this.player.eye();
    const dir = this.player.look();
    const reach = this.player.creative ? 8 : 6;
    let best: Target | null = null;
    const hit = raycastVoxels(
      eye.x,
      eye.y,
      eye.z,
      dir.x,
      dir.y,
      dir.z,
      reach,
      (x, y, z) => this.world.getBlock(x, y, z),
      (id) => id !== AIR && !isWater(id),
    );
    if (hit)
      best = {
        kind: 'block',
        hit,
        distance: hit.distance,
        point: eye.clone().addScaledVector(dir, hit.distance),
      };

    const ray = new RAPIER.Ray(eye, dir);
    const exclude = this.tether.held?.c.body;
    const rh = this.physics.world.castRay(
      ray,
      reach,
      true,
      undefined,
      groups(0xffff, GROUP.PART | GROUP.MOB),
      undefined,
      exclude,
    );
    if (rh && (!best || rh.timeOfImpact < best.distance)) {
      const point = eye.clone().addScaledVector(dir, rh.timeOfImpact);
      const part = this.contraptions.find(rh.collider);
      const mob = part ? undefined : this.mobs.find(rh.collider);
      if (part) best = { kind: 'part', c: part.c, p: part.p, distance: rh.timeOfImpact, point };
      else if (mob) best = { kind: 'mob', mob, distance: rh.timeOfImpact, point };
    }
    const fr = this.photos.pickFrame(eye, dir, reach);
    if (fr && (!best || fr.distance < best.distance + 0.05))
      best = {
        kind: 'frame',
        frame: fr.frame,
        distance: fr.distance,
        point: eye.clone().addScaledVector(dir, fr.distance),
      };

    this.target = best;
    if (best?.kind === 'block' && !this.tether.held) {
      this.highlight.visible = true;
      this.highlight.position.set(best.hit.x + 0.5, best.hit.y + 0.5, best.hit.z + 0.5);
    } else this.highlight.visible = false;

    let label = '';
    if (best?.kind === 'block') label = BLOCKS[best.hit.id].name;
    else if (best?.kind === 'part')
      label = `${best.p.def.name}${best.c.parts.length > 1 ? ` (build of ${best.c.parts.length})` : ''}${best.p.def.activatable ? (best.p.active ? ' · ON' : ' · off') : ''}`;
    else if (best?.kind === 'mob')
      label =
        best.mob.kind === 'dummy'
          ? 'Training Dummy'
          : `Puffball ${Math.max(0, Math.ceil(best.mob.hp))}/${best.mob.maxHp}`;
    else if (best?.kind === 'frame') label = 'Picture Frame';
    this.hud.setTarget(this.screens.open ? '' : label);
  }

  private contextHints(): [string, string][] {
    if (this.screens.open || this.paused) return [];
    if (this.seatedIn)
      return [
        ['W S', 'Drive'],
        ['A D', 'Steer'],
        ['Space', 'Switch fans/rockets'],
        ['Shift', 'Get off'],
      ];
    if (this.tether.held) {
      return [
        ['F', this.tether.candidate ? 'Join to highlighted part' : 'Join (bring next to a part)'],
        ['R T Y', 'Rotate'],
        ['Wheel', 'Nearer / farther'],
        ['X', 'Detach this part'],
        ['G', 'Release'],
      ];
    }
    const hints: [string, string][] = [];
    const t = this.target;
    const held = this.inventory.held;
    const def = held ? item(held.id) : null;
    if (t?.kind === 'part') {
      hints.push(['G', 'Tether (grab)']);
      if (t.p.def.behavior === 'seat') hints.push(['F', 'Sit']);
      if (t.p.def.activatable) hints.push(['LMB', t.p.active ? 'Switch off' : 'Switch on']);
      if (def?.kind === 'tool' && t.c.parts.length === 1 && canBind(held!.id, t.p.def.itemId))
        hints.push(['F', `Bind onto ${def.name}`]);
      hints.push(['Shift LMB', 'Pick up']);
    }
    if (def?.kind === 'tool') {
      const d = this.dropped.pick(this.player.eye(), this.player.look(), 4);
      if (d && canBind(held!.id, d.stack.id))
        hints.push(['F', `Bind ${item(d.stack.id).name} onto ${def.name}`]);
      if (held!.id === 'shield')
        hints.push([
          'RMB',
          'Guard' +
            (held!.data?.fuse === 'part_rocket'
              ? ' / rocket jump'
              : held!.data?.fuse === 'part_spring'
                ? ' / spring jump'
                : ''),
        ]);
    }
    if (def?.kind === 'part') hints.push(['RMB', `Place ${def.name}`]);
    if (def?.kind === 'photo_frame')
      hints.push(['RMB', 'Hang picture'], ['[ ]', `Size ${held!.data?.size ?? 2}×`]);
    if (def?.kind === 'photo_block') hints.push(['RMB', 'Place photo block']);
    if (def?.fusable && def.kind === 'material') hints.push(['V', 'Bind onto a tool']);
    if (hints.length === 0) hints.push(['E', 'Inventory'], ['P', 'Photos'], ['H', 'Help']);
    return hints;
  }

  // -------------------------------------------------------------------------------------------
  // Mouse actions

  private handleMouse(dt: number): void {
    const input = this.input;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.placeCooldown = Math.max(0, this.placeCooldown - dt);
    this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
    if (!input.locked || this.screens.open) {
      this.breaking = null;
      this.hud.setBreakProgress(0);
      return;
    }
    if (this.tether.held) {
      if (input.pressed('Mouse0')) this.tether.release();
      this.hud.setBreakProgress(0);
      return;
    }
    const t = this.target;
    const held = this.inventory.held;
    const stats = stackStats(held);

    // Left button.
    if (input.isDown('Mouse0')) {
      if (t?.kind === 'block') this.continueBreaking(t.hit, stats, dt, input.pressed('Mouse0'));
      else {
        this.breaking = null;
        if (input.pressed('Mouse0') && this.attackCooldown <= 0)
          this.attack(t, stats, input.isDown('ShiftLeft'));
      }
    } else {
      this.breaking = null;
    }
    this.hud.setBreakProgress(this.breaking?.progress ?? 0);

    // Right button.
    if (
      input.pressed('Mouse2') ||
      (input.isDown('Mouse2') && this.placeCooldown <= 0 && held && item(held.id).kind === 'block')
    ) {
      this.use(t, held, stats, input.pressed('Mouse2'));
    }
  }

  private continueBreaking(hit: VoxelHit, stats: BoundStats | null, dt: number, justPressed: boolean): void {
    const b = BLOCKS[hit.id];
    if (
      !this.breaking ||
      this.breaking.x !== hit.x ||
      this.breaking.y !== hit.y ||
      this.breaking.z !== hit.z
    ) {
      this.breaking = { x: hit.x, y: hit.y, z: hit.z, progress: 0 };
    }
    if (this.player.creative) {
      if (justPressed || this.attackCooldown <= 0) {
        this.attackCooldown = 0.2;
        this.breakBlock(hit.x, hit.y, hit.z, false);
        this.viewmodel.doSwing();
      }
      this.breaking = null;
      return;
    }
    const time = breakTime(b.hardness, b.tool, stats);
    if (!Number.isFinite(time)) return;
    this.breaking.progress += dt / time;
    if (Math.floor(this.time * 5) !== Math.floor((this.time - dt) * 5)) {
      this.viewmodel.doSwing();
      this.particles.burst(
        new THREE.Vector3(hit.x + 0.5 + hit.nx * 0.5, hit.y + 0.5 + hit.ny * 0.5, hit.z + 0.5 + hit.nz * 0.5),
        tileColor(b.tiles.side),
        3,
        { speed: 1.5, size: 0.06 },
      );
    }
    if (this.breaking.progress >= 1) {
      this.breakBlock(hit.x, hit.y, hit.z, true);
      this.breaking = null;
      // Bound tools wear when mining with them.
      if (this.inventory.held?.data?.fuse && stats && stats.cls === b.tool) this.wearHeld(1);
      if (stats?.effect === 'fire' && b.burnable) this.ignite(hit.x, hit.y, hit.z);
    }
  }

  breakBlock(x: number, y: number, z: number, drops: boolean): void {
    const id = this.world.getBlock(x, y, z);
    if (id === AIR || id === BEDROCK || isWater(id)) return;
    const b = BLOCKS[id];
    // Neighbouring water flows in and unsupported sand falls via BlockUpdates.
    this.world.setBlock(x, y, z, AIR);
    // A door is two blocks: take the other half with it (it drops nothing of its own).
    if (b.shape === 'door') {
      const oy = this.world.getBlockState(x, y, z) & TOP ? -1 : 1;
      const other =
        this.world.getBlock(x, y + oy, z) === id
          ? y + oy
          : this.world.getBlock(x, y - oy, z) === id
            ? y - oy
            : null;
      if (other !== null) this.world.setBlock(x, other, z, AIR);
    }
    this.particles.burst(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), tileColor(b.tiles.side), 16, {
      speed: 3,
    });
    if (drops && !this.player.creative && id !== PHOTO) {
      const list = b.drops ?? [{ item: b.key }];
      for (const d of list) {
        if (Math.random() < (d.chance ?? 1))
          this.giveOrDrop({ id: d.item, count: d.count ?? 1 }, new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
      }
    }
    this.world.flushDirtyNear(new THREE.Vector3(x, y, z));
  }

  giveOrDrop(stack: ItemStack, pos: THREE.Vector3): void {
    const left = this.inventory.add(stack);
    if (left > 0) this.dropped.drop({ ...stack, count: left }, pos, new THREE.Vector3(0, 2, 0));
  }

  private wearHeld(amount: number): void {
    const slot = this.inventory.selected;
    const s = this.inventory.slots[slot];
    if (!s?.data?.fuse) return;
    const mat = s.data.fuse;
    const { stack, broke } = wearBind(s, amount);
    this.inventory.slots[slot] = stack;
    this.inventory.changed();
    if (broke) {
      this.toast(`Your ${item(mat).name} broke off!`);
      this.particles.burst(this.player.eye().addScaledVector(this.player.look(), 0.8), item(mat).color, 12, {
        speed: 2,
      });
    }
  }

  private attack(t: Target | null, stats: BoundStats | null, shift: boolean): void {
    this.attackCooldown = 0.32;
    this.viewmodel.doSwing();
    const look = this.player.look();
    const eye = this.player.eye();
    const effect = stats?.effect ?? 'none';
    const damage = stats?.damage ?? 1;
    const kb = stats?.knockback ?? 1;

    if (effect === 'wind') {
      this.contraptions.impulseCone(eye, look, 10, 9);
      this.mobs.impulseCone(eye, look, 10, 9);
      for (let i = 0; i < 6; i++)
        this.particles.burst(eye.clone().addScaledVector(look, 1 + i), 0xeaf6ff, 3, {
          speed: 6,
          gravity: 0,
          life: 0.4,
        });
      this.wearHeld(1);
    }
    if (!t) return;

    if (t.kind === 'part') {
      if (shift) {
        // Pick the part back up.
        if (t.c === this.seatedIn?.c && t.p === this.seatedIn.p) this.exitSeat();
        this.contraptions.removePart(t.c, t.p);
        if (!this.player.creative) this.giveOrDrop({ id: t.p.def.itemId, count: 1 }, t.point);
        this.particles.burst(t.point, item(t.p.def.itemId).color, 10, { speed: 2 });
        return;
      }
      const toggled = this.contraptions.activate(t.c, t.p);
      if (toggled && t.p.def.behavior !== 'spring')
        this.toast(`${t.p.def.name} ${t.p.active ? 'on' : 'off'}`);
      const mass = t.c.body.mass();
      const imp = look.clone().multiplyScalar((1 + kb * 2) * Math.sqrt(Math.max(1, mass)));
      if (effect === 'bounce') imp.y += 4 * Math.sqrt(mass);
      if (effect === 'rocket') imp.y += 12 * Math.sqrt(mass);
      t.c.body.applyImpulseAtPoint(imp, t.point, true);
      this.particles.burst(t.point, 0xffffff, 5, { speed: 2 });
      if (effect === 'blast') this.explode(t.point, 2.2);
      if (stats && this.inventory.held?.data?.fuse && effect !== 'wind') this.wearHeld(1);
      return;
    }
    if (t.kind === 'mob') {
      const dir = look
        .clone()
        .setY(0)
        .normalize()
        .multiplyScalar(3 * kb)
        .add(new THREE.Vector3(0, 2.5, 0));
      if (effect === 'bounce') dir.y += 7;
      if (effect === 'rocket') dir.y += 14;
      if (effect === 'spring') dir.multiplyScalar(1.8);
      if (t.mob.kind === 'dummy' && shift) {
        this.mobs.remove(t.mob);
        if (!this.player.creative) this.giveOrDrop({ id: 'dummy', count: 1 }, t.point);
        return;
      }
      const res = this.mobs.hit(t.mob, damage, dir, effect === 'fire');
      this.hud.floatText(
        String(damage),
        res.position,
        this.camera,
        effect === 'fire' ? '#ff9a40' : undefined,
      );
      this.particles.burst(
        t.point,
        effect === 'fire' ? 0xff8a2a : t.mob.kind === 'slime' ? 0xb9a6e8 : 0xd9b866,
        8,
        { speed: 3 },
      );
      if (effect === 'blast') this.explode(t.point, 2.2);
      if (stats && this.inventory.held?.data?.fuse && effect !== 'wind') this.wearHeld(1);
      return;
    }
    if (t.kind === 'frame') {
      const f = this.photos.removeFrame(t.frame.id);
      if (f)
        this.giveOrDrop({ id: 'photo_frame', count: 1, data: { photoId: f.photoId, size: f.size } }, t.point);
      return;
    }
  }

  private use(
    t: Target | null,
    held: ItemStack | null,
    stats: BoundStats | null,
    justPressed: boolean,
  ): void {
    // Sitting takes priority when aiming at a seat with something non-placeable.
    if (justPressed && t?.kind === 'part' && t.p.def.behavior === 'seat') {
      const k = held ? item(held.id).kind : null;
      if (k !== 'part' && k !== 'block') {
        this.sit(t.c, t.p);
        return;
      }
    }
    // Doors, trapdoors and gates open and close (Shift places against them instead).
    if (
      justPressed &&
      t?.kind === 'block' &&
      OPENABLE.has(BLOCKS[t.hit.id].shape ?? 'cube') &&
      !this.input.isDown('ShiftLeft')
    ) {
      this.toggleOpen(t.hit.x, t.hit.y, t.hit.z);
      return;
    }
    if (!held) return;
    const def = item(held.id);
    const slot = this.inventory.selected;
    const consume = () => {
      if (!this.player.creative) this.inventory.consume(slot, 1);
    };

    switch (def.kind) {
      case 'block': {
        if (t?.kind !== 'block' || def.block === undefined) return;
        const x = t.hit.x + t.hit.nx;
        const y = t.hit.y + t.hit.ny;
        const z = t.hit.z + t.hit.nz;
        if (!this.canPlaceAt(x, y, z)) return;
        const shape = BLOCKS[def.block].shape ?? 'cube';
        const state = placementState(shape, this.player.yaw, t.hit.ny, t.point.y - Math.floor(t.point.y));
        if (shape === 'door') {
          if (!this.canPlaceAt(x, y + 1, z)) return;
          this.world.setBlock(x, y + 1, z, def.block, state | TOP);
        }
        this.world.setBlock(x, y, z, def.block, state);
        this.world.flushDirtyNear(new THREE.Vector3(x, y, z));
        this.viewmodel.doSwing();
        this.placeCooldown = 0.22;
        consume();
        return;
      }
      case 'part': {
        if (!justPressed) return;
        const pdef = partByItem(held.id);
        if (!pdef) return;
        if (this.contraptions.partCount >= MAX_PARTS) {
          this.toast(`Too many parts in the world (max ${MAX_PARTS}). Pick some up with Shift+click.`);
          return;
        }
        const r = partRadius(pdef);
        const look = this.player.look();
        let pos: THREE.Vector3;
        if (t?.kind === 'block')
          pos = t.point
            .clone()
            .add(new THREE.Vector3(t.hit.nx, t.hit.ny, t.hit.nz).multiplyScalar(r * 0.8 + 0.05));
        else if (t)
          pos = t.point
            .clone()
            .addScaledVector(look, -r - 0.05)
            .add(new THREE.Vector3(0, r * 0.5, 0));
        else pos = this.player.eye().addScaledVector(look, 3);
        const quat = new THREE.Quaternion().setFromAxisAngle(UP, this.player.yaw);
        this.contraptions.spawn(pdef.id, pos, quat);
        this.particles.burst(pos, 0xffffff, 6, { speed: 1.5, gravity: 0 });
        this.viewmodel.doSwing();
        consume();
        return;
      }
      case 'placeable': {
        if (!justPressed || t?.kind !== 'block' || t.hit.ny !== 1) return;
        const pos = new THREE.Vector3(t.hit.x + 0.5, t.hit.y + 1, t.hit.z + 0.5);
        this.mobs.spawnDummy(pos, this.player.yaw + Math.PI);
        consume();
        return;
      }
      case 'photo_frame': {
        if (!justPressed || t?.kind !== 'block' || !held.data?.photoId) return;
        if (!IS_SOLID[t.hit.id]) return;
        const { hit } = t;
        if (hit.nx === 0 && hit.ny === 0 && hit.nz === 0) return;
        const rot = ((Math.round(this.player.yaw / (Math.PI / 2)) % 4) + 4) % 4;
        for (const f of this.photos.framesOn(hit.x, hit.y, hit.z))
          if (f.nx === hit.nx && f.ny === hit.ny && f.nz === hit.nz) {
            this.photos.removeFrame(f.id);
            this.giveOrDrop(
              { id: 'photo_frame', count: 1, data: { photoId: f.photoId, size: f.size } },
              t.point,
            );
          }
        this.photos.addFrame({
          photoId: held.data.photoId,
          x: hit.x,
          y: hit.y,
          z: hit.z,
          nx: hit.nx,
          ny: hit.ny,
          nz: hit.nz,
          size: held.data.size ?? 2,
          rot,
        });
        this.viewmodel.doSwing();
        consume();
        return;
      }
      case 'photo_block': {
        if (t?.kind !== 'block' || !held.data?.photoId) return;
        const x = t.hit.x + t.hit.nx;
        const y = t.hit.y + t.hit.ny;
        const z = t.hit.z + t.hit.nz;
        if (!this.canPlaceAt(x, y, z)) return;
        this.world.setBlock(x, y, z, PHOTO);
        this.photos.addPhotoBlock({ x, y, z, photoId: held.data.photoId });
        this.world.flushDirtyNear(new THREE.Vector3(x, y, z));
        this.viewmodel.doSwing();
        this.placeCooldown = 0.22;
        consume();
        return;
      }
      case 'tool': {
        if (held.id !== 'shield' || !justPressed || this.shieldCooldown > 0) return;
        if (stats?.effect === 'rocket') {
          this.player.launch(new THREE.Vector3(0, 19, 0));
          this.particles.burst(this.player.position.clone(), 0xffa030, 30, { speed: 4, up: -0.6 });
          this.shieldCooldown = 0.8;
          this.wearHeld(1);
        } else if (stats?.effect === 'spring') {
          this.player.launch(new THREE.Vector3(0, 13, 0));
          this.particles.burst(this.player.position.clone(), 0xc0c0c0, 12, { speed: 2 });
          this.shieldCooldown = 0.6;
          this.wearHeld(1);
        }
        return;
      }
      default:
        return;
    }
  }

  /** Opens or closes a door (both halves), trapdoor or gate. */
  private toggleOpen(x: number, y: number, z: number): void {
    const id = this.world.getBlock(x, y, z);
    const state = this.world.getBlockState(x, y, z) ^ OPEN;
    this.world.setBlock(x, y, z, id, state);
    if (BLOCKS[id].shape === 'door') {
      const oy = state & TOP ? -1 : 1;
      if (this.world.getBlock(x, y + oy, z) === id) this.world.setBlock(x, y + oy, z, id, state ^ TOP);
    }
    this.world.flushDirtyNear(new THREE.Vector3(x, y, z));
    this.viewmodel.doSwing();
  }

  private canPlaceAt(x: number, y: number, z: number): boolean {
    const cur = this.world.getBlock(x, y, z);
    if (cur !== AIR && !isWater(cur)) return false;
    if (this.player.intersectsBlock(x, y, z)) return false;
    // Don't place blocks inside parts or mobs.
    const shape = new RAPIER.Cuboid(0.45, 0.45, 0.45);
    let blocked = false;
    this.physics.world.intersectionsWithShape(
      { x: x + 0.5, y: y + 0.5, z: z + 0.5 },
      { x: 0, y: 0, z: 0, w: 1 },
      shape,
      () => {
        blocked = true;
        return false;
      },
      undefined,
      groups(0xffff, GROUP.PART | GROUP.MOB),
    );
    return !blocked;
  }

  // -------------------------------------------------------------------------------------------
  // Combat helpers and effects

  private slimeContact(m: Mob, dir: THREE.Vector3): void {
    const held = this.inventory.held;
    const guarding = held?.id === 'shield' && this.input.isDown('Mouse2');
    if (guarding) {
      const bouncy = held?.data?.fuse === 'slime';
      this.mobs.hit(
        m,
        bouncy ? 2 : 0,
        dir
          .clone()
          .multiplyScalar(-(bouncy ? 9 : 4))
          .add(new THREE.Vector3(0, 3, 0)),
      );
      this.player.damage(bouncy ? 0 : 0.5);
      this.particles.burst(this.player.eye().addScaledVector(this.player.look(), 0.8), 0xffffff, 6, {
        speed: 2,
      });
      return;
    }
    this.player.damage(
      2,
      dir
        .clone()
        .multiplyScalar(6)
        .add(new THREE.Vector3(0, 4, 0)),
    );
  }

  explode(pos: THREE.Vector3, radius: number): void {
    const r = Math.ceil(radius);
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    const cz = Math.floor(pos.z);
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        for (let dz = -r; dz <= r; dz++) {
          if (dx * dx + dy * dy + dz * dz > radius * radius) continue;
          const id = this.world.getBlock(cx + dx, cy + dy, cz + dz);
          if (id === AIR || id === BEDROCK || isWater(id)) continue;
          this.world.setBlock(cx + dx, cy + dy, cz + dz, AIR);
        }
    this.world.flushDirtyNear(pos);
    this.contraptions.impulseRadial(pos, radius * 2.5, 30);
    this.mobs.explode(pos, radius * 2.5, 10);
    const d = this.player.eye().distanceTo(pos);
    if (d < radius * 2.5) {
      const dir = this.player.position
        .clone()
        .sub(pos)
        .normalize()
        .add(new THREE.Vector3(0, 0.6, 0))
        .normalize();
      this.player.damage(
        Math.round(7 * (1 - d / (radius * 2.5))),
        dir.multiplyScalar(12 * (1 - d / (radius * 2.5))),
      );
    }
    this.particles.burst(pos, 0xffa030, 40, { speed: 8, size: 0.2, gravity: 2, life: 0.6 });
    this.particles.burst(pos, 0x555555, 30, { speed: 4, size: 0.3, gravity: -1, life: 1.2 });
    this.toast('💥');
  }

  ignite(x: number, y: number, z: number): void {
    const k = `${x},${y},${z}`;
    if (this.fires.has(k) || this.fires.size > 80) return;
    if (!BLOCKS[this.world.getBlock(x, y, z)].burnable) return;
    this.fires.set(k, { x, y, z, t: 1.5 + Math.random() * 2, fx: 0 });
  }

  private updateFires(dt: number): void {
    for (const [k, f] of this.fires) {
      f.t -= dt;
      f.fx -= dt;
      if (f.fx <= 0) {
        f.fx = 0.12;
        this.particles.burst(
          new THREE.Vector3(f.x + 0.5, f.y + 0.9, f.z + 0.5),
          Math.random() < 0.5 ? 0xff7a2a : 0xffd04a,
          2,
          { speed: 1, gravity: -3, life: 0.5, size: 0.12 },
        );
      }
      if (f.t <= 0) {
        this.fires.delete(k);
        if (!BLOCKS[this.world.getBlock(f.x, f.y, f.z)].burnable) continue;
        this.world.setBlock(f.x, f.y, f.z, AIR);
        this.particles.burst(new THREE.Vector3(f.x + 0.5, f.y + 0.5, f.z + 0.5), 0x333333, 8, {
          speed: 1.5,
          gravity: -2,
        });
        for (const [dx, dy, dz] of [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
          [0, 0, 1],
          [0, 0, -1],
        ]) {
          const id = this.world.getBlock(f.x + dx, f.y + dy, f.z + dz);
          if (BLOCKS[id].burnable && Math.random() < (id === LEAVES ? 0.5 : 0.3))
            this.ignite(f.x + dx, f.y + dy, f.z + dz);
        }
      }
    }
  }

  // -------------------------------------------------------------------------------------------
  // Saving

  collectMeta(): WorldMeta {
    const p = this.player;
    const m = this.meta;
    m.player = {
      pos: p.position.toArray(),
      yaw: p.yaw,
      pitch: p.pitch,
      health: p.health,
      flying: p.flying,
      spawn: this.spawn.toArray(),
    };
    if (this.seatedIn) m.player.pos = [p.position.x, p.position.y + 1, p.position.z];
    m.inventory = this.inventory.toJSON();
    m.contraptions = this.contraptions.serialize();
    m.frames = this.photos.frameList;
    m.photoBlocks = this.photos.photoBlockList;
    m.dummies = this.mobs.serializeDummies();
    m.dropped = this.dropped.serialize();
    m.timeOfDay = this.sky.time;
    m.creative = p.creative;
    return m;
  }

  async save(): Promise<void> {
    try {
      await saveWorld(this.collectMeta(), this.world.takeDirtyModified());
    } catch (e) {
      console.error('Save failed', e);
      this.toast('Saving failed — is browser storage full or disabled?');
    }
  }

  dispose(): void {
    this.stop();
    this.input.unlock();
    this.screens.hide(false);
    window.removeEventListener('keydown', this.keyListener);
    document.removeEventListener('pointerlockchange', this.lockListener);
    window.removeEventListener('resize', this.resizeListener);
    for (const [n, f] of this.dropListeners) window.removeEventListener(n, f as EventListener);
    this.dropOverlay?.remove();
    this.world.dispose();
    this.ink.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.dom.hud.classList.add('hidden');
    this.dom.hud.innerHTML = '';
  }

  // -------------------------------------------------------------------------------------------
  // Test / debug helpers (exposed on window.__game)

  /** Uses the held item on whatever is under the crosshair (like a right-click). */
  debugUseHeld(): string | null {
    this.updateTarget();
    this.use(this.target, this.inventory.held, stackStats(this.inventory.held), true);
    return this.target?.kind ?? null;
  }

  /** Attacks / breaks whatever is under the crosshair (like a left-click). */
  debugAttack(): string | null {
    this.updateTarget();
    const t = this.target;
    if (t?.kind === 'block') this.breakBlock(t.hit.x, t.hit.y, t.hit.z, true);
    else this.attack(t, stackStats(this.inventory.held), false);
    return t?.kind ?? null;
  }

  debugTarget(): { kind: string; x?: number; y?: number; z?: number } | null {
    this.updateTarget();
    const t = this.target;
    if (!t) return null;
    return t.kind === 'block' ? { kind: t.kind, x: t.hit.x, y: t.hit.y, z: t.hit.z } : { kind: t.kind };
  }

  /** The block under the crosshair: its key, numeric id and state bits. */
  debugBlockInfo(): { key: string; id: number; state: number; x: number; y: number; z: number } | null {
    this.updateTarget();
    const t = this.target;
    if (t?.kind !== 'block') return null;
    const { x, y, z } = t.hit;
    const id = this.world.getBlock(x, y, z);
    return { key: BLOCKS[id]?.key ?? '?', id, state: this.world.getBlockState(x, y, z), x, y, z };
  }

  /** Sets the state bits (0–15) of the block under the crosshair, keeping the block. */
  debugSetState(state: number): boolean {
    const info = this.debugBlockInfo();
    if (!info) return false;
    return this.world.setBlock(info.x, info.y, info.z, info.id, state);
  }

  /** Fills the inventory with library blocks whose category or name matches `query`. */
  debugGiveLibrary(query = ''): number {
    const q = query.toLowerCase();
    const picks = BLOCKS.filter(
      (b) => b.lib && (b.category!.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)),
    ).slice(0, this.inventory.slots.length);
    picks.forEach((b, i) => (this.inventory.slots[i] = { id: b.key, count: b.lib!.stack }));
    this.hud.renderHotbar(this.inventory);
    return picks.length;
  }

  /**
   * Builds every library block (or those whose category matches `category`) in rows on a paper-
   * pale floor in front of the player, one category per row group, for reviewing them in the world.
   */
  debugShowcase(category = ''): number {
    const blocks = BLOCKS.filter((b) => b.lib && b.category!.toLowerCase().includes(category.toLowerCase()));
    const floor = blockByKey('smooth_stone')?.id ?? STONE_ID;
    const ox = Math.floor(this.player.position.x) - 20;
    const oz = Math.floor(this.player.position.z) - 6;
    const y = Math.floor(this.player.position.y) + 6;
    const PER_ROW = 20;
    let row = 0;
    let col = 0;
    let lastCat = '';
    const place: [number, number, number, number, number][] = [];
    for (const b of blocks) {
      if (b.category !== lastCat || col === PER_ROW) {
        if (lastCat) row += b.category !== lastCat ? 2 : 1;
        col = 0;
        lastCat = b.category!;
      }
      const x = ox + col * 2;
      const z = oz - row * 3;
      const facing = 2; // face the player standing to the south
      place.push([
        x,
        y,
        z,
        b.id,
        b.shape === 'slab' || b.shape === 'cube' || b.shape === 'cross' ? 0 : facing,
      ]);
      col++;
    }
    const minZ = oz - row * 3 - 2;
    this.world.prepareArea(new THREE.Vector3(ox + PER_ROW, y, (oz + minZ) / 2), 3);
    for (let x = ox - 2; x <= ox + PER_ROW * 2 + 1; x++)
      for (let z = minZ; z <= oz + 4; z++) {
        this.world.setBlock(x, y - 1, z, floor);
        for (let dy = 0; dy < 16; dy++) this.world.setBlock(x, y + dy, z, AIR);
      }
    for (const [x, by, z, id, state] of place) {
      this.world.setBlock(x, by, z, id, state);
      if (BLOCKS[id].shape === 'door') this.world.setBlock(x, by + 1, z, id, state | TOP);
    }
    // Stand at the front edge, a little raised, looking over the rows.
    this.player.flying = true;
    this.player.teleport(ox + PER_ROW, y + 2, oz + 5);
    this.player.yaw = 0;
    this.player.pitch = -0.42;
    return place.length;
  }

  debugSpawnPart(id: string, offset = new THREE.Vector3(0, 1, -3)): Contraption {
    const pos = this.player.position.clone().add(offset);
    return this.contraptions.spawn(PARTS[id].id, pos);
  }
}

/** Blocks that right-click opens and closes. */
const OPENABLE = new Set<BlockShape>(['door', 'trapdoor', 'fence_gate']);

/**
 * State bits for a block being placed: it faces the way the player looks, and slabs, stairs and
 * trapdoors go in the top half when placed against a ceiling or the upper half of a side.
 */
function placementState(shape: BlockShape, yaw: number, ny: number, fracY: number): number {
  let state = 0;
  if (shape !== 'cube' && shape !== 'cross' && shape !== 'slab') state |= facingFromYaw(yaw);
  if (shape === 'slab' || shape === 'stairs' || shape === 'trapdoor')
    if (ny === -1 || (ny === 0 && fracY > 0.5)) state |= TOP;
  return state;
}

// Representative colour of an atlas tile, for particles (worked out on first use).
let tileAtlas: HTMLCanvasElement | null = null;
const tileColors = new Map<string, number>();
export function setTileColorAtlas(atlas: HTMLCanvasElement): void {
  tileAtlas = atlas;
  tileColors.clear();
}
function tileColor(name: string): number {
  let c = tileColors.get(name);
  if (c !== undefined) return c;
  c = 0x888888;
  if (tileAtlas) {
    const i = tileIndex(name);
    const d = tileAtlas
      .getContext('2d', { willReadFrequently: true })!
      .getImageData((i % ATLAS_COLS) * TILE_PX, Math.floor(i / ATLAS_COLS) * TILE_PX, TILE_PX, TILE_PX).data;
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let j = 0; j < d.length; j += 4)
      if (d[j + 3] > 100) {
        r += d[j];
        g += d[j + 1];
        b += d[j + 2];
        n++;
      }
    n = Math.max(1, n);
    c = (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
  }
  tileColors.set(name, c);
  return c;
}
