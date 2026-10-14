# Sōzō 創造

_Sōzō_ is the Japanese word for **creation**. It's a block-building sandbox for the browser where your own photos become part of the world:

- **Your photos in the world**: upload images, drag them onto the game or take one with your webcam. Hang them as picture frames from 1×1 up to 4×4 blocks, build with photo blocks, or put one on your shield as an emblem. Photos are stored only in your browser.
- **Tether**: place parts (boards, crates, wheels, fans, rockets, balloons, seats, springs, lights), grab them, rotate them and join them into builds you can ride. Wheels make cars, fans make boats and hovercraft, balloons float and rockets launch.
- **Bind**: attach materials to tools at the Workbench for new stats and effects. A rock on a stick makes a Rock Hammer that mines like a pickaxe. Embers set things on fire, puff gel adds bounce, blast fruit explodes, a fan blows gusts of wind, and a rocket on a shield gives you a rocket jump.

The game runs in the browser with no install and no external art assets: every texture and model is drawn procedurally.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command            | What it does                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `npm run build`    | Typecheck and build a static site into `dist/` (deployable anywhere)                                                |
| `npm test`         | Unit tests (Vitest): mesher, raycast, terrain, RLE, crafting, Bind, contraption physics, save format                |
| `npm run test:e2e` | Browser smoke test (Playwright): world rendering, Tether join, Workbench Bind, photo upload, frame, save and reload |
| `npm run lint`     | ESLint                                                                                                              |

## Controls

| Key                 | Action                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------- |
| WASD / Space / Ctrl | Move / jump / sprint (double-tap Space to fly in creative)                                |
| Left click          | Break block, attack, switch a device on or off                                            |
| Right click         | Place a block or part, use the held item, guard with a shield                             |
| 1–9 / mouse wheel   | Hotbar                                                                                    |
| E                   | Inventory and crafting (plus a creative catalog in creative mode)                         |
| V                   | Workbench (Bind materials onto tools)                                                     |
| P                   | Photo gallery: upload, webcam, make frames and photo blocks                               |
| G                   | Tether: grab or release a part                                                            |
| F                   | Join the held part to the highlighted part · bind a dropped material onto your tool · sit |
| X                   | Detach the grabbed part from its build                                                    |
| R / T / Y           | Rotate the grabbed part (hold Shift to reverse)                                           |
| Q                   | Drop the held item (Ctrl+Q drops the stack)                                               |
| Shift + left click  | Pick a part back up                                                                       |
| [ / ]               | Change the size of a held picture frame                                                   |
| In a seat           | W/S drive, A/D steer, Space switches fans and rockets, Shift gets off                     |
| H                   | Help · Esc pauses · F3 debug info                                                         |

## How it is built

- **Rendering**: [Three.js](https://threejs.org), in an "Ink & Wash" style. Chunks are 16×16×128 with hidden faces culled and per-vertex ambient occlusion (`src/world/chunkMesher.ts`). Blocks are flat ink-colour washes (`src/engine/atlas.ts`) lit in three toon bands, and a post-process draws ink outlines from the depth buffer and adds paper grain (`src/view/inkPass.ts`). Items are small vector ink drawings (`src/items/inkArt.ts`) that become both the inventory icons and, extruded, the 3D held and dropped models. `style-lab.html` compares this with other candidate looks.
- **Physics**: [Rapier](https://rapier.rs). Terrain near the player becomes voxel colliders. The player uses a kinematic character controller. Each build is **one rigid body with a collider per part**, which is far more stable than chains of joints, and wheels are ray-cast vehicle wheels (`src/build/contraptions.ts`).
- **Tether**: `src/build/tether.ts` holds a build with a velocity spring and finds the nearest part on another build within 0.45 m using Rapier contact queries. Joining closes the gap and merges the two bodies.
- **Bind**: `src/bind/bindRecipes.ts` is a data table of material stats plus special combinations, and it is fully unit tested.
- **Photos**: images are decoded with `createImageBitmap`, which respects EXIF rotation. They are scaled down to at most 1024 px, re-encoded as WebP or JPEG and stored as blobs in IndexedDB (`src/photos/`).
- **Saving**: IndexedDB stores world metadata plus **only the chunks you changed**, run-length encoded. The game autosaves every 30 s and when the tab is hidden. _Export world_ writes one `.json` file that includes the photos the world uses. _Import world_ restores it on any browser. Worlds, photos and settings saved before the rename are copied over automatically the first time the game starts (`src/save/legacy.ts`).

## Project layout

```
src/
  brand.ts   the game's name and feature names, in one place
  engine/    input, atlas painter, RNG helpers
  world/     blocks, chunks, terrain generator, mesher, voxel raycast, chunk streaming
  physics/   Rapier setup and collision groups
  player/    character controller
  items/     item registry, inventory, crafting, pixel-art sprites, icons and 3D item models
  build/     Tether parts, builds (contraptions), grab/join controller
  bind/      Bind stats and recipes
  entities/  puffballs, training dummies, dropped items
  photos/    photo library, import (file, drag-drop, webcam), textures, frames and photo blocks
  save/      IndexedDB persistence, export format, migration from older storage names
  ui/        HUD, inventory, Workbench, gallery, menus
  view/      sky and day/night cycle, first-person held item and glove
  game.ts    the main loop that ties everything together
```

## Ideas for next steps

- **Snap it real**: turn a photo of an object into an in-game item, and a photo of a building into a block building you can spawn.
- Multiplayer: the world state is already split into seed + changed chunks + entity lists, which can be synced over a WebSocket server.
- Run chunk meshing in Web Workers for larger render distances.
- More Tether parts (hinges, steering wheels, cannons) and saved build blueprints you can re-spawn.

## Notice

Sōzō is an independent project. It is not affiliated with, endorsed by or sponsored by Mojang Studios, Microsoft or Nintendo. See [NOTICE](NOTICE).
