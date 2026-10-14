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

    # Materials (items).
    wm = wb.create_sheet("Materials")
    mheaders = ["Sprite", "Name", "Sōzō ID", "Category", "Stack", "Burns as Fuel", "Bind Candidate", "Replaces (reference ID)"]
    style_header(wm, mheaders, [11, 26, 26, 16, 8, 14, 15, 30])
    items_by_id = {r.get("Item ID"): r for r in ref["Items"]["rows"]}
    bindable = {"flint", "raw_iron", "raw_gold", "raw_copper", "iron_ingot", "gold_ingot", "copper_ingot", "diamond", "emerald", "amethyst_shard", "quartz", "coal", "bone", "feather", "slime_ball", "gunpowder", "honeycomb"}
    mi = 1
    for src, (mname, mcat, draw) in mat_items.MATERIALS.items():
        r = items_by_id.get(src)
        if r is None:
            continue
        mi += 1
        png = render_png(draw())
        previews.append((mname, png))
        img = XLImage(io.BytesIO(png))
        img.width = img.height = 64
        img.anchor = f"A{mi}"
        wm.add_image(img)
        try:
            stack = int(float(r.get("Max Stack") or 64))
        except (TypeError, ValueError):
            stack = 64
        fuel = r.get("Fuel Time")
        vals = [None, mname, cb.sozo_id(mname), mcat, stack, "Yes" if fuel not in (None, "N/A", "", 0, "0") else "No", "Yes" if src in bindable else "No", src]
        for j, v in enumerate(vals, start=1):
            c = wm.cell(row=mi, column=j, value=v)
            c.font = name_font if j == 2 else body_font
            c.alignment = Alignment(vertical="center", horizontal="left" if j in (2, 3, 4, 8) else "center")
            c.border = border
            if mi % 2 == 0:
                c.fill = alt_fill
        wm.row_dimensions[mi].height = ROW_PT
    wm.auto_filter.ref = f"B1:H{mi}"

    # Excluded entries, so coverage of the reference list can be checked.
    wx = wb.create_sheet("Not Included")
    style_header(wx, ["Reference ID", "Why it isn't in Sōzō"], [40, 50])
    wx.freeze_panes = "A2"
    for i, (src, why) in enumerate(excluded, start=2):
        wx.cell(row=i, column=1, value=src).font = body_font
        wx.cell(row=i, column=2, value=why).font = body_font

    # Summary with live counts.
    wsum = wb.create_sheet("Summary", 0)
    wsum.column_dimensions["A"].width = 34
    wsum.column_dimensions["B"].width = 16
    wsum["A1"] = "Sōzō Sprite Library — Batch 1: Blocks & Materials"
    wsum["A1"].font = Font(name=FONT, bold=True, size=16, color=INK)
    wsum["A2"] = "Original Sōzō art in the Ink & Wash style. Generated by tools/sprite-library/build.py."
    wsum["A2"].font = Font(name=FONT, italic=True, color="5A4D42")
    wsum["A4"], wsum["B4"] = "Blocks in Sōzō", f"=COUNTA(Blocks!B2:B{last})"
    wsum["A5"], wsum["B5"] = "Materials in Sōzō", f"=COUNTA(Materials!B2:B{mi})"
    wsum["A6"], wsum["B6"] = "Reference blocks not included", f"=COUNTA('Not Included'!A2:A{len(excluded)+1})"
    wsum["A7"] = "Blocks by category"
    wsum["A7"].font = Font(name=FONT, bold=True, color=VERMILION)
    cats = sorted(Counter(e.category for e, _ in entries))
    for k, cat in enumerate(cats, start=8):
        wsum.cell(row=k, column=1, value=cat)
        wsum.cell(row=k, column=2, value=f'=COUNTIF(Blocks!D2:D{last},A{k})')
    note_row = 8 + len(cats) + 1
    notes = [
        "How to read this",
        "Hardness: Sōzō tiers (Instant, Soft, Firm, Hard, Very hard, Unbreakable).",
        "Bind Candidate: a material that can be bound onto tools at the Workbench.",
        "Best Tool: the Sōzō tool that breaks it fastest; 'Hand' means no tool needed.",
        "Light: light level the block gives off (0–15).",
        "Replaces (reference ID): the entry in the reference list this covers, for checking coverage only.",
        "Names: generic names are kept; distinctive ones are renamed (e.g. Deepslate → Shale, Crafting Table → Crafting Bench).",
    ]
    for k, t in enumerate(notes):
        c = wsum.cell(row=note_row + k, column=1, value=t)
        c.font = Font(name=FONT, bold=(k == 0), color=VERMILION if k == 0 else INK)
    for row in wsum.iter_rows(min_row=4, max_row=8 + len(cats)):
        for c in row:
            if c.font.name != FONT or not c.font.bold:
                c.font = Font(name=FONT, color=INK, bold=c.font.bold)

    wb.save(args.out)
    print(f"blocks: {len(entries)}  excluded: {len(excluded)}  categories: {dict(Counter(e.category for e, _ in entries))}")

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
