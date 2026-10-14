# Sōzō sprite library generator

Builds the Sōzō sprite library spreadsheet: original Ink & Wash sprites, drawn as SVG by this code, with Sōzō names and stats.

A reference list of blocks and items decides which entries Sōzō needs. Minecraft-only concepts are left out, and duplicates and placement states are folded together. No reference images are used. The reference file itself is not stored in this repo.

```bash
pip install cairosvg openpyxl pillow
python export_reference.py "sprite_list.xlsx" reference.json   # names/IDs/facts only
python build.py reference.json ../../documents/sozo-sprite-library.xlsx --sheet-png preview.png
```

| File                 | What it does                                                              |
| -------------------- | ------------------------------------------------------------------------- |
| `geometry.py`        | Isometric box projection, colour helpers, SVG document wrapper            |
| `patterns.py`        | Brush patterns for block faces (planks, bricks, ore flecks, glass…)       |
| `materials.py`       | Sōzō palette: stones, woods, dyes, metals and copper stages               |
| `shapes.py`          | Block shapes (cube, slab, stairs, wall, fence, door…) and special blocks  |
| `plants.py`          | Flowers, grasses, saplings, mushrooms, coral, crops                       |
| `items_materials.py` | Batch 1 item sprites: crafting materials and dyes                         |
| `classify_blocks.py` | Reference block → Sōzō block (name, category, shape, drawing) or excluded |
| `build.py`           | Renders every sprite and writes the spreadsheet                           |

## Batches

1. **Blocks and materials.** Done: 801 blocks and 50 materials.
2. Tools, weapons and armour.
3. Food.
4. Creatures.
5. Effects, particles and structures.
