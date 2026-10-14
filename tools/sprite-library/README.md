# Sōzō sprite library generator

Builds the Sōzō sprite library spreadsheet: original Ink & Wash sprites, drawn as SVG by this code, with Sōzō names and stats.

A reference list of blocks and items decides which entries Sōzō needs. Minecraft-only concepts are left out, and duplicates and placement states are folded together. No reference images are used. The reference file itself is not stored in this repo.

```bash
pip install cairosvg openpyxl pillow
python export_reference.py "sprite_list.xlsx" reference.json   # names/IDs/facts only
python build.py reference.json ../../documents/sozo-sprite-library.xlsx --sheet-png preview.png
```

| File                 | What it does                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `geometry.py`        | Isometric box projection, colour helpers, SVG document wrapper                                        |
| `patterns.py`        | Brush patterns for block faces (planks, bricks, ore flecks, glass…)                                   |
| `materials.py`       | Sōzō palette: stones, woods, dyes, metals and copper stages                                           |
| `shapes.py`          | Block shapes (cube, slab, stairs, wall, fence, door…) and special blocks                              |
| `plants.py`          | Flowers, grasses, saplings, mushrooms, coral, crops                                                   |
| `items_materials.py` | Batch 1 item sprites: crafting materials and dyes                                                     |
| `creatures.py`       | Batch 4 sprites and Sōzō data: creature portraits, the player, boats, carts, armour stand, item frame |
| `classify_blocks.py` | Reference block → Sōzō block (name, category, shape, drawing) or excluded                             |
| `build.py`           | Renders every sprite and writes the spreadsheet                                                       |
| `export_game.py`     | Exports the library as game assets (see below)                                                        |

## Exporting to the game

`export_game.py` turns the library into game assets. It reads `documents/sozo-sprite-library.xlsx` as the manifest (so the reference list isn't needed), re-draws every entry and writes:

| Output                        | What it holds                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `src/generated/library.ts`    | Typed data for every sheet (types in `src/library/types.ts`)                            |
| `src/generated/libraryArt.ts` | SVG body of every 2D sprite, keyed `block:`, `item:`, `effect:` or `particle:` + id     |
| `src/generated/blockIds.json` | Stable numeric block ids. Append-only: core blocks keep theirs, new keys are appended   |
| `public/library/blocks.png`   | Flat 32 px face textures for blocks (cubes get top/side/bottom, others one sprite tile) |
| `public/library/models/*.png` | The 3D-rendered creature, vehicle and structure sprites                                 |

```bash
pip install cairosvg openpyxl pillow
npm run sprites:export     # from the repo root; fails on any missing drawing or id clash
```

Generated files are committed, so building the game doesn't need Python. Check the result in the dev server at `/library.html` (`?view=pairs` compares the world's blocks with their library look).

## 3D creature sprites

Creatures, vehicles and objects are real 3D models (`render3d/*.ts`) rendered with the game's own toon shading and ink outline from a three-quarter camera. To re-render after changing a model:

```bash
npx vite --port 5173 &   # from the repo root
node tools/sprite-library/render3d/render.mjs /tmp/r3 256 0 <model ids...>
cp /tmp/r3/<id>_0.png tools/sprite-library/sprites3d/<id>.png
```

Open `/tools/sprite-library/render3d/?model=<id>&turn=<deg>` in the dev server to view a model from any angle. `build.py` uses `sprites3d/<id>.png` for the Creatures sheet.

## Batches

1. **Blocks and materials.** Done: 801 blocks and 50 materials.
2. **Tools, weapons and armour.** Done: 112 sprites (6 tiers × 6 tools, 6 armour sets, plus ranged, utility, buckets, riding, pouches and throwables).
3. **Food.** Done: 47 sprites with Energy Restored, Meal Size, Cooks Into and Effect.
4. **Creatures.** Done: 63 sprites (animals, generic monsters, the player, boats, carts and display objects).
5. **Effects, potions, particles and structures.** Done: 27 effects, 47 potions, 39 particles (2D) and 18 structures (3D dioramas).
