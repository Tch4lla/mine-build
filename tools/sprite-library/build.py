"""Build the Sōzō sprite library spreadsheet.

Usage:
    python build.py <reference.json> <out.xlsx> [--sheet-png preview.png]

<reference.json> is the reference list exported to JSON (see export_reference.py). It is only used
to decide which entries Sōzō needs and for physical facts (light level, falls, flammable,
see-through). Every sprite is drawn by this generator; no reference images are read.
"""

from __future__ import annotations

import argparse
import io
import json
import re
from collections import Counter

import cairosvg
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from PIL import Image

import classify_blocks as cb
import items_materials as mat_items
import items_gear as gear_items
import items_food as food_items
import creatures as creature_items
from geometry import svg_doc

FONT = "Arial"
PAPER = "F3EAD8"
INK = "2A221D"
VERMILION = "D8573C"
SPRITE_PX = 128  # rendered size (displayed at 64 px)
ROW_PT = 52


def hardness_tier(h) -> str:
    try:
        h = float(h)
    except (TypeError, ValueError):
        return "Unknown"
    if h < 0 or h >= 50:
        return "Unbreakable"
    if h == 0:
        return "Instant"
    if h < 1:
        return "Soft"
    if h < 2.5:
        return "Firm"
    if h < 5:
        return "Hard"
    return "Very hard"


TOOLS = {"pickaxe": "Pickaxe", "axe": "Axe", "shovel": "Shovel", "sword": "Sword"}


def best_tool(t) -> str:
    t = str(t or "").lower()
    for k, v in TOOLS.items():
        if k in t:
            return v
    return "Hand"


def yes(v) -> str:
    if v is True or str(v).lower() in ("true", "yes"):
        return "Yes"
    return "No"


def render_png(svg_body: str, px: int = SPRITE_PX) -> bytes:
    return cairosvg.svg2png(bytestring=svg_doc(svg_body).encode(), output_width=px, output_height=px)


EXCLUDE_REASON = [
    (r"potted_|_wall_|wall_torch|wall_sign|wall_banner|wall_fan|attached_|_stem$|_plant$|_crop$|^waxed_|infested|candle_cake|chipped_anvil|damaged_anvil|_cauldron$|wet_sponge|kelp_plant|tall_seagrass|bamboo_sapling|_bud$|budding|dead_.*coral|moving", "Placement state or duplicate of another entry"),
    (r"air$|command|structure|jigsaw|barrier|^light$|test_|spawner", "Technical block (not a placeable thing)"),
]


def exclude_reason(src: str) -> str:
    for pat, why in EXCLUDE_REASON:
        if re.search(pat, src):
            return why
    return "Minecraft-only concept"


def style_header(ws, headers, widths):
    head_fill = PatternFill("solid", fgColor=INK)
    for i, (h, w) in enumerate(zip(headers, widths), start=1):
        c = ws.cell(row=1, column=i, value=h)
        c.font = Font(name=FONT, bold=True, color=PAPER)
        c.fill = head_fill
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[1].height = 30
    ws.freeze_panes = "C2"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("reference")
    ap.add_argument("out")
    ap.add_argument("--sheet-png")
    args = ap.parse_args()

    ref = json.load(open(args.reference))
    stacks = {r.get("Item ID"): r.get("Max Stack") for r in ref["Items"]["rows"]}

    entries = []
    excluded = []
    seen = set()
    for row in ref["Blocks"]["rows"]:
        src, mc_name = row["Block ID"], row["Block Name"]
        e = cb.classify(src, mc_name)
        if e is None:
            excluded.append((src, exclude_reason(src)))
            continue
        if e.id in seen:
            continue
        seen.add(e.id)
        entries.append((e, row))

    wb = Workbook()
    ws = wb.active
    ws.title = "Blocks"
    headers = ["Sprite", "Name", "Sōzō ID", "Category", "Shape", "Family", "Variant", "Hardness", "Best Tool", "Light", "Falls", "Flammable", "See-through", "Stack", "Replaces (reference ID)"]
    widths = [11, 30, 30, 20, 14, 22, 14, 12, 11, 8, 8, 11, 12, 8, 34]
    style_header(ws, headers, widths)
    body_font = Font(name=FONT, color=INK)
    name_font = Font(name=FONT, color=INK, bold=True)
    thin = Side(style="thin", color="D9CDB4")
    border = Border(bottom=thin)
    alt_fill = PatternFill("solid", fgColor="FBF6EC")

    previews: list[tuple[str, bytes]] = []
    for i, (e, row) in enumerate(entries, start=2):
        png = render_png(e.draw())
        previews.append((e.name, png))
        img = XLImage(io.BytesIO(png))
        img.width = img.height = 64
        img.anchor = f"A{i}"
        ws.add_image(img)
        stack = stacks.get(row["Block ID"]) or 64
        try:
            stack = int(float(stack))
        except (TypeError, ValueError):
            stack = 64
        values = [
            None,
            e.name,
            e.id,
            e.category,
            e.shape,
            e.family.title() if e.family else "",
            e.variant.replace("_", " ").title() if e.variant else "",
            hardness_tier(row.get("Hardness")),
            best_tool(row.get("Mining Tool")),
            int(float(row.get("Light Level") or 0)) if str(row.get("Light Level", "")).replace(".", "").isdigit() else 0,
            yes(row.get("Obeys Gravity")),
            yes(row.get("Flammable")),
            yes(row.get("Transparent")),
            stack,
            row["Block ID"],
        ]
        for j, v in enumerate(values, start=1):
            c = ws.cell(row=i, column=j, value=v)
            c.font = name_font if j == 2 else body_font
            c.alignment = Alignment(vertical="center", horizontal="left" if j in (2, 3, 4, 6, 15) else "center")
            c.border = border
            if i % 2 == 0:
                c.fill = alt_fill
        ws.row_dimensions[i].height = ROW_PT
    last = len(entries) + 1
    ws.auto_filter.ref = f"B1:O{last}"

    def write_item_sheet(title, headers, widths, rows, left_cols):
        """rows: list of (draw, values-after-sprite). Returns the last data row number."""
        sh = wb.create_sheet(title)
        style_header(sh, headers, widths)
        r = 1
        for draw, vals in rows:
            r += 1
            png = render_png(draw())
            previews.append((vals[0], png))
            img = XLImage(io.BytesIO(png))
            img.width = img.height = 64
            img.anchor = f"A{r}"
            sh.add_image(img)
            for j, v in enumerate([None, *vals], start=1):
                c = sh.cell(row=r, column=j, value=v)
                c.font = name_font if j == 2 else body_font
                c.alignment = Alignment(vertical="center", horizontal="left" if j in left_cols else "center")
                c.border = border
                if r % 2 == 0:
                    c.fill = alt_fill
            sh.row_dimensions[r].height = ROW_PT
        sh.auto_filter.ref = f"B1:{get_column_letter(len(headers))}{r}"
        return r

    def stack_of(r):
        try:
            return int(float((r or {}).get("Max Stack") or 64))
        except (TypeError, ValueError):
            return 64

    items_by_id = {r.get("Item ID"): r for r in ref["Items"]["rows"]}

    # Materials (batch 1 items).
    bindable = {"flint", "raw_iron", "raw_gold", "raw_copper", "iron_ingot", "gold_ingot", "copper_ingot", "diamond", "emerald", "amethyst_shard", "quartz", "coal", "bone", "feather", "slime_ball", "gunpowder", "honeycomb"}
    mrows = []
    for src, (mname, mcat, draw) in mat_items.MATERIALS.items():
        r = items_by_id.get(src)
        if r is None:
            continue
        fuel = r.get("Fuel Time")
        mrows.append((draw, [mname, cb.sozo_id(mname), mcat, stack_of(r), "Yes" if fuel not in (None, "N/A", "", 0, "0") else "No", "Yes" if src in bindable else "No", src]))
    mi = write_item_sheet(
        "Materials",
        ["Sprite", "Name", "Sōzō ID", "Category", "Stack", "Burns as Fuel", "Bind Candidate", "Replaces (reference ID)"],
        [11, 26, 26, 16, 8, 14, 15, 30],
        mrows,
        (2, 3, 4, 8),
    )

    # Tools & Gear (batch 2).
    gear = [g for g in gear_items.gear_catalogue() if g["src"] in items_by_id]
    grows = [
        (
            g["draw"],
            [
                g["name"],
                cb.sozo_id(g["name"]),
                g["category"],
                g["tier"],
                g["damage"] if g["damage"] is not None else "",
                g["durability"] if g["durability"] is not None else "",
                g["speed"] if g["speed"] is not None else "",
                g["defence"] if g["defence"] is not None else "",
                g["bind"],
                stack_of(items_by_id[g["src"]]),
                g["src"],
            ],
        )
        for g in gear
    ]
    gi = write_item_sheet(
        "Tools & Gear",
        ["Sprite", "Name", "Sōzō ID", "Category", "Tier", "Damage", "Durability", "Mining Speed", "Defence", "Bind Slot", "Stack", "Replaces (reference ID)"],
        [11, 28, 28, 13, 11, 9, 11, 13, 9, 10, 8, 28],
        grows,
        (2, 3, 4, 5, 12),
    )
    # Food (batch 3).
    food = [f for f in food_items.food_catalogue() if f["src"] in items_by_id]
    frows = [
        (
            f["draw"],
            [f["name"], cb.sozo_id(f["name"]), f["category"], f["energy"], f["size"], f["cooks"], f["effect"], stack_of(items_by_id[f["src"]]), f["src"]],
        )
        for f in food
    ]
    fi = write_item_sheet(
        "Food",
        ["Sprite", "Name", "Sōzō ID", "Category", "Energy Restored", "Meal Size", "Cooks Into", "Effect", "Stack", "Replaces (reference ID)"],
        [11, 24, 24, 12, 15, 12, 20, 20, 8, 26],
        frows,
        (2, 3, 4, 7, 8, 10),
    )

    # Creatures, vehicles and objects (batch 4).
    ent_ids = [r["Entity ID"] for r in ref["Entities"]["rows"]]
    crit = [c for c in creature_items.creature_catalogue() if c["src"] in ent_ids]
    crows = [
        (
            c["draw"],
            [c["name"], cb.sozo_id(c["name"]), c["category"], c["behaviour"], c["health"] if c["health"] is not None else "", c["habitat"], c["drops"], c["special"], c["src"]],
        )
        for c in crit
    ]
    ci = write_item_sheet(
        "Creatures",
        ["Sprite", "Name", "Sōzō ID", "Category", "Behaviour", "Health", "Habitat", "Drops", "Special", "Replaces (reference ID)"],
        [11, 24, 24, 15, 11, 8, 24, 28, 28, 24],
        crows,
        (2, 3, 4, 7, 8, 9, 10),
    )
    crit_src = {c["src"] for c in crit}
    entity_excluded = []
    for eid in ent_ids:
        if eid in crit_src:
            continue
        why = "Minecraft-only creature or variant"
        for reason, pat in creature_items.CREATURE_EXCLUDED_REASON.items():
            if re.search(pat, eid):
                why = reason
                break
        if "pale_oak" in eid or "spawner" in eid or "command" in eid or "hopper" in eid or "end_crystal" in eid or "glow_item_frame" in eid:
            why = "Minecraft-only variant"
        entity_excluded.append((eid, why))

    gear_src = {g["src"] for g in gear}
    item_excluded = [
        (i, "Minecraft-only concept" if "spawn_egg" not in i else "Spawn eggs are a Minecraft mechanic")
        for i in items_by_id
        if i and re.search(gear_items.GEAR_EXCLUDED_RE, i) and i not in gear_src
    ]
    item_excluded += [(i, why) for i, why in food_items.FOOD_EXCLUDED.items() if i in items_by_id]
    item_excluded += [(i, "Variant folded into Mystery Stew") for i in items_by_id if i and i.startswith("suspicious_stew[")]

    # Excluded entries, so coverage of the reference list can be checked.
    wx = wb.create_sheet("Not Included")
    style_header(wx, ["Reference ID", "Kind", "Why it isn't in Sōzō"], [44, 10, 46])
    wx.freeze_panes = "A2"
    all_excluded = (
        [(src, "Block", why) for src, why in excluded]
        + [(src, "Item", why) for src, why in item_excluded]
        + [(src, "Entity", why) for src, why in entity_excluded]
    )
    for i, row in enumerate(all_excluded, start=2):
        for j, v in enumerate(row, start=1):
            wx.cell(row=i, column=j, value=v).font = body_font
    xl = len(all_excluded) + 1

    # Summary with live counts.
    wsum = wb.create_sheet("Summary", 0)
    wsum.column_dimensions["A"].width = 40
    wsum.column_dimensions["B"].width = 16
    wsum["A1"] = "Sōzō Sprite Library — Batches 1–4"
    wsum["A1"].font = Font(name=FONT, bold=True, size=16, color=INK)
    wsum["A2"] = "Original Sōzō art in the Ink & Wash style. Generated by tools/sprite-library/build.py."
    wsum["A2"].font = Font(name=FONT, italic=True, color="5A4D42")
    counts = [
        ("Blocks", f"=COUNTA(Blocks!B2:B{last})"),
        ("Materials", f"=COUNTA(Materials!B2:B{mi})"),
        ("Tools & Gear", f"=COUNTA('Tools & Gear'!B2:B{gi})"),
        ("Food", f"=COUNTA(Food!B2:B{fi})"),
        ("Creatures & Vehicles", f"=COUNTA(Creatures!B2:B{ci})"),
        ("Total sprites", "=SUM(B4:B8)"),
        ("Reference entries not included", f"=COUNTA('Not Included'!A2:A{xl})"),
    ]
    row_i = 4
    for label, formula in counts:
        wsum.cell(row=row_i, column=1, value=label)
        wsum.cell(row=row_i, column=2, value=formula)
        row_i += 1

    def breakdown(title, sheet, col, lastrow, values):
        nonlocal row_i
        row_i += 1
        c = wsum.cell(row=row_i, column=1, value=title)
        c.font = Font(name=FONT, bold=True, color=VERMILION)
        row_i += 1
        for v in values:
            wsum.cell(row=row_i, column=1, value=v)
            wsum.cell(row=row_i, column=2, value=f"=COUNTIF('{sheet}'!{col}2:{col}{lastrow},A{row_i})")
            row_i += 1

    breakdown("Blocks by category", "Blocks", "D", last, sorted(Counter(e.category for e, _ in entries)))
    breakdown("Tools & Gear by category", "Tools & Gear", "D", gi, sorted(Counter(g["category"] for g in gear)))
    breakdown("Food by category", "Food", "D", fi, sorted(Counter(f["category"] for f in food)))
    breakdown("Creatures by category", "Creatures", "D", ci, sorted(Counter(c["category"] for c in crit)))
    notes = [
        "How to read this",
        "Hardness: Sōzō tiers (Instant, Soft, Firm, Hard, Very hard, Unbreakable).",
        "Best Tool: the Sōzō tool that breaks a block fastest; 'Hand' means no tool needed.",
        "Light: light level the block gives off (0–15).",
        "Bind Candidate: a material that can be bound onto tools at the Workbench.",
        "Bind Slot: the item accepts a bound material (tools, weapons, shields, bows).",
        "Damage / Durability / Mining Speed / Defence: Sōzō values from an initial balance pass (tier table in tools/sprite-library/items_gear.py).",
        "Energy Restored: how much of the Energy bar a food refills (0–10). Meal Size: Snack, Light, Meal or Feast.",
        "Cooks Into: what a raw food becomes in a furnace or campfire. Effect: any status effect from eating it.",
        "Behaviour: Passive, Neutral (fights back), Defensive or Hostile. Health: in Sōzō hearts. Drops: Sōzō items from this library.",
        "Replaces (reference ID): the entry in the reference list this covers, for checking coverage only.",
        "Names: generic names are kept; distinctive ones are renamed (e.g. Deepslate → Shale, Flint and Steel → Fire Striker, Bundle → Pouch).",
    ]
    row_i += 1
    for k, t in enumerate(notes):
        c = wsum.cell(row=row_i + k, column=1, value=t)
        c.font = Font(name=FONT, bold=(k == 0), color=VERMILION if k == 0 else INK)
    for row in wsum.iter_rows(min_row=4, max_row=row_i - 1):
        for c in row:
            if not c.font.bold:
                c.font = Font(name=FONT, color=INK)

    wb.save(args.out)
    print(f"blocks: {len(entries)}  materials: {mi-1}  gear: {gi-1}  food: {fi-1}  creatures: {ci-1}  excluded: {len(all_excluded)}  categories: {dict(Counter(e.category for e, _ in entries))}")

    if args.sheet_png:
        cols = 16
        S = 96
        rows = (len(previews) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * S, rows * S), (243, 234, 216))
        for k, (_, png) in enumerate(previews):
            im = Image.open(io.BytesIO(png)).convert("RGBA").resize((S, S), Image.LANCZOS)
            sheet.paste(im, ((k % cols) * S, (k // cols) * S), im)
        sheet.save(args.sheet_png)


if __name__ == "__main__":
    main()
