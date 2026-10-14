# Sōzō 創造: Project Handover

_Last updated: 2026-10-14 · Branch: `claude/minecraft-crafting-photography-game-32cfy7` · Last code commit: `d9bae63`_

## 1. What this is

Sōzō ("creation" in Japanese) is a browser block-building sandbox in TypeScript with Three.js. The aim is to release it publicly and earn money from it later, through credits or a premium tier.

Three pillars:

- **Your photos in the world:** frames from 1×1 to 4×4, photo blocks and shield emblems.
- **Tether:** grab, rotate and join parts into rideable builds (cars, boats, balloons, rockets).
- **Bind:** attach materials to tools at the Workbench for new stats and effects.

**Legal and brand constraints.** It must not look too much like Minecraft or Nintendo games:

- Use only original names: Tether, not Ultrahand; Bind, not Fuse.
- Keep the original Ink & Wash art style.
- `NOTICE` and the README carry a "not affiliated with Mojang, Microsoft or Nintendo" statement.
- All brand strings live in `src/brand.ts`.

## 2. Status at a glance

| Area                                                                                                                      | State                   |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Core sandbox (terrain, chunks, mining/placing, crafting, inventory, survival/creative, day/night, puffball mobs, dummies) | ✅ Done                 |
| Tether builds (Rapier physics, ray-cast vehicle wheels, fans, rockets, balloons, seats, springs, lights)                  | ✅ Done                 |
| Bind system (data-driven stats and special combos, Workbench UI, ground binding with F)                                   | ✅ Done                 |
| Photos (upload, drag-drop, webcam, IndexedDB storage, frames, photo blocks, shield emblem)                                | ✅ Done                 |
| Saving (IndexedDB, RLE changed chunks, autosave, export/import `.json` with photos, legacy `mine-build` migration)        | ✅ Done                 |
| Rebrand to Sōzō                                                                                                           | ✅ Done                 |
| Flowing water and falling sand/gravel                                                                                     | ✅ Done                 |
| Art direction "A · Ink & Wash" (toon shading, ink outline post-process, paper sky)                                        | ✅ Done                 |
| Ink vector item art and paper-and-ink menus/HUD                                                                           | ✅ Done (`d9bae63`)     |
| "Snap it real" (photo → item / building), backend, credits                                                                | ⏳ Planned, not started |

Commit history, oldest first:

1. `51c2edc` initial build
2. `7321c6c` rebrand
3. `3d7dc66` fluids and gravity
4. `04e3dc3` style lab
5. `b651dc7` Ink & Wash
6. `d9bae63` item art and menus

## 3. Running and checking

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck && npm run lint && npm test   # 50 unit tests (Vitest)
npm run test:e2e     # Playwright smoke test (port 5174, starts its own server)
npm run build        # static site in dist/
```

- **Users with an old clone** who still see "Mine Build": they need `git pull` (or a checkout of the branch).
- **Headless Chromium for screenshots:** launch with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. In the cloud container, browsers are in `/opt/pw-browsers`.
- **Debug handle:** `window.__game` is exposed. Useful members are `inventory`, `player`, `screens.show('inventory'|'workbench'|'gallery'|'help')`, `sky.time`, `dropped.drop()`, `onPauseRequest()`, `debugUseHeld`, `debugAttack` and `debugTarget`.

## 4. Architecture map

- **Stack:** Vite 8, TypeScript 5.9 (strict), Three.js 0.186, Rapier 0.21 (`@dimforge/rapier3d-compat`), simplex-noise, idb, Vitest 5, Playwright 1.56.
- **`src/game.ts`:** the main loop that wires everything together. `render()` runs `InkPass.render` on the world, then `InkPass.renderOverlay` on the viewmodel.
- **`src/world/`:**
  - Blocks: `blocks.ts`. Water flow ids `WATER_FLOW[1..7]` are appended after PHOTO so existing ids stay stable. Uses `isWater` and the `gravity` flag.
  - Chunks are 16×16×128; terrain, streaming and voxel raycast also live here.
  - `chunkMesher.ts`: face culling plus ambient occlusion (AO).
  - `blockUpdates.ts`: a pull-model scheduler for water (0.25 s tick) and falling blocks (0.05 s tick), with the walled-pocket source rule.
- **`src/engine/atlas.ts`:** the procedural flat-wash texture atlas (`INK` palette, `TILE_PX=32`) and `toonGradient()`.
- **`src/view/`:**
  - `inkPass.ts`: depth-based outlines, distance fade, paper grain and vignette, plus an overlay mode for the held item.
  - `sky.ts`: paper sky with a vermilion sun.
  - `viewmodel.ts`: the first-person held item and glove.
  - `toon.ts`: `toonify()`.
- **`src/items/`:**
  - Registry (`items.ts`, with `fuseAnchor` on a 16-grid), inventory and crafting.
  - `inkArt.ts`: the SVG drawings for every non-block item, `itemSvg(id, {fuse, stroke})`.
  - `icons.ts`: SVG data-URL icons; block icons are isometric cubes. 3D models are built with `SVGLoader` and extruded into thin layers, then cached.
- **`src/build/`:** Tether parts, contraptions (one rigid body per build, one collider per part), and the `tether.ts` grab/join controller.
- **`src/bind/bindRecipes.ts`:** Bind stats and combos (unit tested).
- **`src/entities/`:** mobs, dummies, dropped items, `fallingBlocks.ts`.
- **`src/photos/`:** library, import, textures, frames.
- **`src/save/`:** persistence, export format `sozo-world` (also accepts `mine-build-world`), `legacy.ts` DB migration.
- **`src/ui/`:**
  - `hud.ts`, `screens.ts` (Inventory, Workbench, Gallery, Help), `menus.ts` (main, pause, settings including "Ink outlines"), `dom.ts`.
  - `style.css`: paper-and-ink design tokens (`--paper #f3ead8`, `--ink #2a221d`, `--accent #d8573c`, `--accent-2 #3f7f86`).
- **`style-lab.html` + `src/styleLab/`:** a side-by-side comparison of candidate art styles. It is a dev tool, not shipped gameplay.
- **Tests:**
  - `tests/unit/` covers world, items, contraptions, save-photos, legacy, blockUpdates and inkArt.
  - `tests/e2e/smoke.spec.ts` covers world rendering, Tether join, Workbench Bind, photo upload, frame, and save/reload.

## 5. Known issues and notes

- **Bundle size.** The bundle is about 5 MB (Rapier WASM plus Three.js). Vite warns about chunk size; code-splitting hasn't been done yet.
- **Thin dropped items.** Dropped items spin and look thin when seen edge-on. A slightly thicker extrusion or a billboard could help.
- **Old saves.** Saves from before the rebrand migrate automatically on first launch.
- **Chunk meshing** runs on the main thread. Moving it to Web Workers is a candidate for larger render distances.
- **Pushing from the cloud** needs GitHub connected (an earlier 403 was fixed by reconnecting).

## 6. Roadmap (agreed, not started)

**"Snap it real":** a photo of an object becomes an in-game item, and a photo of a building becomes a spawnable building converted to blocks.

- **B. Backend and credits.**
  - A small server holds the API keys; the browser never does.
  - Classification uses the Claude API (`claude-opus-5-5`, low effort, structured output) to decide whether a photo is an item or a building and to suggest names and stats.
  - A credits/premium ledger.
- **C. Snap items.** Photo → cut-out → ink-style vector or extruded item that bindable tools can use (reuse the `inkArt`/`icons` extrusion pipeline).
- **D. Snap buildings.** Photo → cloud image-to-3D → voxelize into a block blueprint → place with a preview ghost.
- **Background job queue with notifications.** The world never pauses. Uploads run in the background and a toast or notification fires when done. Expected time from photo to game: seconds for items, about 1–3 minutes for buildings with a cloud provider.
- **E. Native image-to-3D engine.**
  - E1: an in-browser depth-estimation building engine.
  - E2: a self-hosted model (TRELLIS or TripoSR) to cut per-use cost.
- **Needed from the user before B–D:** an Anthropic API key, an account with an image-to-3D provider, and a hosting choice for the backend.
- **Other ideas:** multiplayer (seed, changed chunks and entity lists already split for syncing), more Tether parts (hinges, steering, cannons), saved build blueprints.

## 7. Working conventions

- Develop on `claude/minecraft-crafting-photography-game-32cfy7` and push with `git push -u origin <branch>`. Don't open a PR unless asked.
- A `main` branch also exists and holds the latest Sōzō code (created from the claude branch). Keep it updated by merging the claude branch into it once work is verified.
- Commit messages end with the Co-Authored-By and Claude-Session attribution lines. Don't put model IDs in code or commits.
- Keep prettier, ESLint, typecheck and unit tests clean before pushing. Run the e2e test for UI or gameplay changes.
- Visual changes: take headless Chromium screenshots and review them before committing.
- New items need an entry in `src/items/inkArt.ts` (the unit test enforces this). New blocks need a painter in `src/engine/atlas.ts`.

## 8. Sprite library (in progress)

- **What it is:** a library of original Sōzō sprites for the everyday content a sandbox needs. Coverage is decided from a reference list the user supplied (a Minecraft content spreadsheet).
  - Minecraft-only concepts, paintings, placement states and duplicates are left out.
  - Distinctive names are renamed, e.g. Deepslate → Shale, Crafting Table → Crafting Bench, copper stages → Tarnished/Patinated/Verdigris.
  - No reference images are used. Every sprite is drawn as SVG by `tools/sprite-library/`.
- **Output:** `documents/sozo-sprite-library.xlsx`, with sheets Summary, Blocks, Materials, Tools & Gear, Food, Creatures, Effects, Potions, Particles, Structures and Not Included: **1,204 sprites, all five batches complete**.
- **Style decision pending:** the library is a more polished, more detailed take on the world's Ink & Wash look (bolder outlines, glints, more brushwork). The user will decide once the sprites are in the game whether the game should match the library or the library should be toned down to match the world. Until then, keep both as they are.
- **Quality bar** (the user asked for this to be kept): match the batch-1 materials recipe in `itemkit.py`, i.e. a bold ink silhouette, three toon tones, thin inner edges and glints.
- **Rebuild:** follow `tools/sprite-library/README.md`. The reference .xlsx is not in the repo; ask the user for it again, or re-export it with `export_reference.py`.
- **Batch status:**
  1. Blocks and materials. ✅ Done: 801 blocks and 50 materials.
  2. Tools, weapons and armour. ✅ Done: 112 sprites with Sōzō damage, durability, mining speed and defence values.
  3. Food. ✅ Done: 47 sprites with Energy, Meal Size, Cooks Into and Effect. Potions moved to batch 5.
  4. Creatures. ✅ Done: 63 sprites. Creatures, vehicles and objects are **real 3D models** (`tools/sprite-library/render3d/`, Three.js) rendered with the game's toon shading and InkPass outline from a three-quarter camera. They use rounded, toy-like parts like the in-game Puffball, and every model has had a 360° check (`documents/creatures-3d-turnaround-*.png`). The models can later be used in-game directly. Minecraft-only mobs, villagers and golems are excluded.
  5. Effects, potions, particles and structures. ✅ Done: 27 effects, 47 potions, 39 particles (2D, because they are flat in-game) and 18 structures (3D dioramas, 360°-checked).
- **Next steps:** bring the sprites and 3D models into the game (item icons, creature models, structure generation). Then the user decides the style question.

## 9. Sprite library import (in progress)

The agreed plan imports **all** library entries as playable content, in phases. The user reviews each phase in the world before the next one starts.

0. **Export pipeline.** ✅ Done. `npm run sprites:export` (`tools/sprite-library/export_game.py`) writes `src/generated/` (data, SVG art, stable block ids) and `public/library/` (flat block-face atlas, 3D sprites). Review page: `/library.html` in the dev server.
1. 16-bit block storage (12-bit id + 4-bit state) and a save migration.
2. Library blocks in the world (shapes, placement state), plus an "Art: World / Library" settings toggle for the style decision.
3. Items: tools, armour, food (Energy bar), materials, recipes.
4. Effects, potions and particles.
5. Creatures and vehicles (render3d models move into `src/entities/models/`).
6. Structures as voxel blueprints placed by terrain generation.
