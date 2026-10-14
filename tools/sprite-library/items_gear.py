"""Batch 2 item sprites: tools, weapons, armour and equipment, in the batch-1 materials recipe.

Tools are designed upright (handle at the bottom, head at the top, light from the left) and then
turned 45° so the handle sits bottom-left and the head top-right, like the in-game items.
"""

from __future__ import annotations

import math

from geometry import INK, shade
from itemkit import DARK, EDGE, HI, LIGHT, MID, OUT, Ci, R, clipped, fill, glint, line_part, sil, toned, turned
from itemkit import Pd as P
from itemkit import lit as _lit
from materials import DYES

WOOD = "#a8804e"
LEATHER = "#7a4a2e"
STRAP = "#6a4a32"

TIERS = {
    "wooden": ("#c9a57a", "wood"),
    "stone": ("#a9a59c", "stone"),
    "copper": ("#d8824a", "metal"),
    "iron": ("#d8d4cc", "metal"),
    "golden": ("#efc85a", "metal"),
    "diamond": ("#7fd6d6", "gem"),
}

def surface(kind: str, color: str, shape_d: str, box: tuple[float, float, float, float]) -> str:
    """Tier surface detail inside a head shape. box = (x0, y0, x1, y1) of the shape."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    inner = ""
    if kind == "metal":
        inner += f'<path d="M{x0 + w*0.18:.1f} {y0 + h*0.55:.1f} Q{x0 + w*0.4:.1f} {y0 + h*0.12:.1f} {x0 + w*0.75:.1f} {y0 + h*0.18:.1f}" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.75"/>'
    elif kind == "stone":
        for fx, fy, s in ((0.25, 0.35, 3), (0.6, 0.55, 2.5), (0.45, 0.2, 2), (0.75, 0.3, 2.2)):
            cx, cy = x0 + w * fx, y0 + h * fy
            inner += f'<polygon points="{cx-s},{cy} {cx},{cy-s} {cx+s},{cy+s*0.4} {cx-s*0.2},{cy+s}" fill="{shade(color, 0.62)}"/>'
        inner += f'<circle cx="{x0 + w*0.35:.1f}" cy="{y0 + h*0.6:.1f}" r="1.6" fill="{shade(color, 1.3)}"/>'
    elif kind == "wood":
        for k in (0.3, 0.55, 0.8):
            inner += f'<path d="M{x0:.1f} {y0 + h*k:.1f} Q{x0 + w*0.5:.1f} {y0 + h*k - 4:.1f} {x1:.1f} {y0 + h*k:.1f}" fill="none" stroke="{shade(color, 0.7)}" stroke-width="1.4"/>'
    elif kind == "gem":
        cx = x0 + w * 0.45
        inner += f'<path d="M{x0:.1f} {y0 + h*0.5:.1f} L{cx:.1f} {y0:.1f} L{x1:.1f} {y0 + h*0.6:.1f} M{cx:.1f} {y0:.1f} L{cx + w*0.1:.1f} {y1:.1f}" fill="none" stroke="{INK}" stroke-width="1.2" stroke-opacity="0.45"/>'
    out = clipped(shape_d, inner)
    if kind in ("metal", "gem"):
        out += glint(x0 + w * 0.3, y0 + h * 0.3, 4 if kind == "metal" else 5)
    return out


# --- tools --------------------------------------------------------------------------------------

HANDLE = R(46, 12, 8, 84, 3)
CAP = R(44.5, 88, 11, 8, 3)
WRAP = R(44.5, 40, 11, 8, 2)


def _handle_fills() -> str:
    out = fill(HANDLE, shade(WOOD, MID))
    out += f'<rect x="46" y="14" width="3.5" height="80" rx="1.5" fill="{shade(WOOD, LIGHT)}"/>'
    out += f'<ellipse cx="51.5" cy="66" rx="1.6" ry="3" fill="{shade(WOOD, DARK)}"/>'
    out += fill(CAP, shade(WOOD, DARK))
    return out


def _wrap_fills(y=40) -> str:
    out = fill(R(44.5, y, 11, 8, 2), shade(LEATHER, MID))
    out += f'<path d="M45 {y+3} L55 {y+1} M45 {y+6.5} L55 {y+4.5}" stroke="{shade(LEATHER, 1.35)}" stroke-width="1.4"/>'
    return out


TOOL_HEADS = {
    # outline, light facet, dark facet, bbox, extra bare shapes (socket/poll)
    "pickaxe": (
        "M8 38 Q50 0 92 38 L84 46 Q50 16 16 46 Z",
        "M8 38 Q50 0 92 38 L90 40 Q50 9 10 41 Z",
        "M68 24 Q84 30 92 38 L84 46 Q78 37 66 31 Z",
        (8, 10, 92, 46),
        [R(41, 14, 18, 24, 3)],
    ),
    "axe": (
        "M48 18 L38 18 Q32 10 18 4 Q4 26 16 54 Q30 48 38 38 L48 38 Z",
        "M48 18 L38 18 Q32 10 18 4 Q10 16 9 30 L48 28 Z",
        "M16 54 Q10 46 9.5 40 L48 34 L48 38 L38 38 Q30 48 16 54 Z",
        (8, 4, 48, 54),
        [R(46, 14, 16, 28, 3)],
    ),
    "shovel": (
        "M50 0 Q67 6 67 30 L58 46 H42 L33 30 Q33 6 50 0 Z",
        "M50 0 Q33 6 33 30 L42 46 H48 L47 4 Z",
        "M58 46 L67 30 Q67 16 62 9 Q62 32 54 46 Z",
        (33, 0, 67, 46),
        [R(44, 42, 12, 12, 2)],
    ),
    "hoe": (
        "M56 12 H22 Q12 12 12 22 V46 H25 V26 H56 Z",
        "M56 12 H22 Q12 12 12 22 V31 H18 Q18 18 27 18 H56 Z",
        "M12 39 V46 H25 V39 Z",
        (12, 12, 56, 46),
        [R(44, 9, 14, 22, 3)],
    ),
}


def tool(kind: str, tier: str) -> str:
    color, surf = TIERS[tier]
    if kind == "sword":
        return turned(_sword(color, surf, tier))
    if kind == "spear":
        return turned(_spear(color, surf))
    outline, light, dark, box, extras = TOOL_HEADS[kind]
    body = sil(HANDLE, CAP, WRAP, P(outline), *extras)
    body += _handle_fills()
    sock = shade(color, 0.78) if surf != "wood" else shade(WOOD, 0.85)
    for e in extras:
        body += fill(e, sock)
    body += toned(outline, color, light, dark)
    body += surface(surf, color, outline, box)
    if kind == "shovel":
        body += f'<path d="M50 8 V42" stroke="{shade(color, 0.72)}" stroke-width="2.4" stroke-linecap="round"/>'
    if kind == "axe":
        body += f'<path d="M18 7 Q7 27 17 51" fill="none" stroke="{shade(color, HI)}" stroke-width="2.4" stroke-linecap="round"/>'
    body += _wrap_fills()
    return turned(body)


def _sword(color: str, surf: str, tier: str) -> str:
    blade = "M50 2 L60 14 V62 H40 V14 Z"
    guard = R(26, 60, 48, 9, 3)
    grip = R(45, 68, 10, 20, 2)
    pommel = Ci(50, 91, 6)
    guard_c = shade(WOOD, 0.8) if tier == "wooden" else ("#8a6a3e" if tier == "stone" else shade(color, 0.75))
    body = sil(P(blade), guard, grip, pommel)
    body += toned(blade, color, "M50 2 L40 14 V62 H50 Z", "M57 14 L60 14 V62 H57 Z")
    body += f'<rect x="48.6" y="16" width="2.8" height="40" rx="1.4" fill="{shade(color, 0.7)}"/>'
    body += surface(surf, color, blade, (40, 2, 60, 62))
    body += fill(guard, guard_c) + f'<rect x="27" y="61" width="46" height="3" rx="1.5" fill="{shade(guard_c, 1.25)}"/>'
    body += fill(grip, shade(LEATHER, MID))
    body += "".join(f'<path d="M45 {y} L55 {y-3}" stroke="{shade(LEATHER, 1.4)}" stroke-width="1.5"/>' for y in (73, 78, 83, 88))
    body += fill(pommel, guard_c) + f'<circle cx="48" cy="89" r="2" fill="{shade(guard_c, 1.35)}"/>'
    return body


def _spear(color: str, surf: str) -> str:
    shaft = R(47, 28, 6, 70, 3)
    head = "M50 0 Q65 16 57 34 H43 Q35 16 50 0 Z"
    bind = R(44.5, 32, 11, 9, 2)
    body = sil(shaft, P(head), bind)
    body += fill(shaft, shade(WOOD, MID)) + f'<rect x="47" y="30" width="2.6" height="66" rx="1.3" fill="{shade(WOOD, LIGHT)}"/>'
    body += toned(head, color, "M50 0 Q35 16 43 34 H50 Z", "M55 10 Q65 18 57 34 H54 Q60 22 55 10 Z")
    body += surface(surf, color, head, (36, 0, 64, 34))
    body += _wrap_fills(32)
    return body


# --- armour -------------------------------------------------------------------------------------

ARMOUR_SETS = {
    "leather": ("#a8683a", "stitch"),
    "copper": ("#d8824a", "rivets"),
    "chainmail": ("#a9a296", "rings"),
    "iron": ("#d8d4cc", "rivets"),
    "golden": ("#efc85a", "rivets"),
    "diamond": ("#7fd6d6", "facets"),
}

ARMOUR_SHAPES = {
    "helmet": "M16 58 Q16 14 50 12 Q84 14 84 58 V78 L66 82 V60 H34 V82 L16 78 Z",
    "chestplate": "M28 14 L40 10 Q50 22 60 10 L72 14 L90 28 L80 46 L72 40 V90 H28 V40 L20 46 L10 28 Z",
    "leggings": "M22 12 H78 V30 L73 92 H56 L50 42 L44 92 H27 L22 30 Z",
    "boots": "M10 24 H32 V58 L46 62 Q50 72 44 80 H10 Z M54 24 H76 V58 L90 62 Q94 72 88 80 H54 Z",
}


def _trim(style: str, color: str, shape_d: str, piece: str) -> str:
    inner = ""
    if style == "stitch":
        inner += f'<path d="{shape_d}" fill="none" stroke="{shade(color, 1.45)}" stroke-width="1.6" stroke-dasharray="3.5 3" transform="translate(50 50) scale(0.86) translate(-50 -50)"/>'
    elif style == "rings":
        for y in range(10, 96, 7):
            for x in range(6 + (y // 7 % 2) * 3, 98, 7):
                inner += f'<circle cx="{x}" cy="{y}" r="2.6" fill="none" stroke="{shade(color, 0.62)}" stroke-width="1.1"/>'
    elif style == "rivets":
        pts = {
            "helmet": ((24, 54), (50, 20), (76, 54), (37, 30), (63, 30)),
            "chestplate": ((36, 30), (64, 30), (36, 80), (64, 80), (50, 55)),
            "leggings": ((30, 18), (50, 18), (70, 18), (35, 60), (65, 60)),
            "boots": ((16, 32), (26, 32), (60, 32), (70, 32)),
        }[piece]
        for x, y in pts:
            inner += f'<circle cx="{x}" cy="{y}" r="2.4" fill="{shade(color, 0.6)}"/><circle cx="{x-0.8}" cy="{y-0.8}" r="0.9" fill="#ffffff"/>'
    elif style == "facets":
        inner += f'<path d="M10 10 L50 50 L90 10 M50 50 V100 M10 70 L50 50 L90 70" stroke="{INK}" stroke-width="1.2" stroke-opacity="0.35" fill="none"/>'
    return clipped(shape_d, inner)


def armour(piece: str, material: str) -> str:
    color, style = ARMOUR_SETS[material]
    d = ARMOUR_SHAPES[piece]
    out = sil(P(d)) + _lit(d, color) + _trim(style, color, d, piece)
    band = shade(color, 0.72)
    if piece == "helmet":
        out += clipped(d, f'<rect x="0" y="50" width="100" height="10" fill="{band}"/>')
        out += sil(P("M46 60 H54 V74 L50 78 L46 74 Z")) + fill(P("M46 60 H54 V74 L50 78 L46 74 Z"), shade(color, MID))
    elif piece == "chestplate":
        out += clipped(d, f'<path d="M10 28 L28 14 L28 40 L20 46 Z M90 28 L72 14 L72 40 L80 46 Z" fill="{band}"/><rect x="48.5" y="24" width="3" height="66" fill="{shade(color, 0.65)}"/>')
    elif piece == "leggings":
        out += clipped(d, f'<rect x="0" y="12" width="100" height="10" fill="{band}"/><rect x="46" y="14" width="8" height="6" rx="1" fill="#d9c088"/>')
    elif piece == "boots":
        out += clipped(d, f'<rect x="0" y="24" width="100" height="8" fill="{band}"/><rect x="0" y="74" width="100" height="6" fill="{shade(color, 0.55)}"/>')
    out += f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{EDGE}" stroke-opacity="0.75" stroke-linejoin="round"/>'
    if style in ("rivets", "facets"):
        out += glint(34, 30 if piece != "boots" else 40, 4)
    return out


# --- stroked parts ------------------------------------------------------------------------------


def bow() -> str:
    limb = "M34 6 Q82 50 34 94"
    out = f'<path d="M34 6 L34 94" stroke="{INK}" stroke-width="5"/><path d="M34 6 L34 94" stroke="#f2ece0" stroke-width="2"/>'
    out += line_part(limb, shade(WOOD, MID), 9)
    out += f'<path d="M37 10 Q76 50 37 90" fill="none" stroke="{shade(WOOD, 1.25)}" stroke-width="2.5" stroke-linecap="round"/>'
    out += sil(R(52, 42, 12, 16, 3)) + fill(R(52, 42, 12, 16, 3), shade(LEATHER, MID))
    out += f'<path d="M53 47 L63 45 M53 52 L63 50" stroke="{shade(LEATHER, 1.4)}" stroke-width="1.4"/>'
    return out


def crossbow() -> str:
    stock = R(45, 26, 10, 70, 3)
    out = sil(stock) + fill(stock, shade(WOOD, MID)) + f'<rect x="45" y="28" width="4" height="66" rx="2" fill="{shade(WOOD, LIGHT)}"/>'
    out += line_part("M10 40 Q50 18 90 40", shade("#8f8a80", MID), 7)
    out += f'<path d="M10 40 L50 54 L90 40" stroke="{INK}" stroke-width="4.5" fill="none"/><path d="M10 40 L50 54 L90 40" stroke="#f2ece0" stroke-width="1.8" fill="none"/>'
    out += line_part("M50 52 L50 10", shade(WOOD, 1.1), 3.5)
    out += sil(P("M50 2 L56 12 H44 Z")) + fill(P("M50 2 L56 12 H44 Z"), "#d8d4cc")
    out += sil(R(42, 60, 16, 8, 2)) + fill(R(42, 60, 16, 8, 2), "#8f8a80")
    return out


def arrow(tip="#d8d4cc", dipped=None) -> str:
    shaft = R(48, 18, 4, 72, 2)
    head = "M50 2 L59 20 H41 Z"
    fl = "M48 72 L38 86 L38 96 L48 86 Z M52 72 L62 86 L62 96 L52 86 Z"
    body = sil(shaft, P(head), P(fl))
    body += fill(shaft, shade(WOOD, MID)) + toned(fl, "#f2ece0", "M48 72 L38 86 L38 96 L48 86 Z", None)
    body += f'<path d="M50 74 V94" stroke="#c0533a" stroke-width="2"/>'
    body += toned(head, tip, "M50 2 L41 20 H50 Z", "M50 2 L59 20 H55 Z") + glint(47, 12, 2.5)
    if dipped:
        body += f'<rect x="46" y="20" width="8" height="6" rx="2" fill="{dipped}" stroke="{INK}" stroke-width="1.4"/>'
    return turned(body)


def shield() -> str:
    d = "M50 6 L86 18 Q88 64 50 94 Q12 64 14 18 Z"
    out = sil(P(d)) + _lit(d, "#c9a57a")
    out += clipped(d, '<path d="M0 0 H100 V40 H0 Z" fill="#d8573c"/><path d="M0 0 H42 V40 H0 Z" fill="#e47a5e"/>' + "".join(f'<rect x="{x}" y="40" width="1.6" height="60" fill="{shade("#c9a57a", 0.7)}"/>' for x in (32, 50, 68)))
    out += f'<path d="{d}" fill="none" stroke="#a9a296" stroke-width="5"/><path d="{d}" fill="none" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += sil(Ci(50, 52, 10)) + fill(Ci(50, 52, 10), "#d8d4cc") + f'<circle cx="47" cy="49" r="3.5" fill="#ffffff" fill-opacity="0.7"/>'
    return out


def shears() -> str:
    blade1 = "M50 52 L82 14 L88 18 L56 58 Z"
    blade2 = "M50 52 L18 14 L12 18 L44 58 Z"
    loops = Ci(36, 76, 13) + Ci(64, 76, 13)
    out = sil(P(blade1), P(blade2), loops)
    out += toned(blade2, "#d8d4cc", "M50 52 L18 14 L15 16 L46 55 Z", None)
    out += toned(blade1, "#d8d4cc", None, "M50 52 L82 14 L88 18 L56 58 L53 56 Z")
    for x in (36, 64):
        out += f'<circle cx="{x}" cy="76" r="13" fill="{shade("#c0533a", MID)}" stroke="{INK}" stroke-width="{EDGE}"/><circle cx="{x}" cy="76" r="6.5" fill="#f3ead8" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += f'<circle cx="50" cy="54" r="3" fill="{INK}"/>' + glint(30, 26, 3)
    return out


def compass() -> str:
    out = sil(Ci(50, 50, 38)) + f'<circle cx="50" cy="50" r="38" fill="{shade("#d8824a", MID)}"/>'
    out += f'<path d="M14 50 A36 36 0 0 1 86 50" fill="{shade("#d8824a", LIGHT)}"/>'
    out += f'<circle cx="50" cy="50" r="29" fill="#f6f1e6" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += "".join(f'<rect x="49" y="{y}" width="2" height="5" fill="#8f8a80" transform="rotate({a} 50 50)"/>' for a in (0, 90, 180, 270) for y in (22,))
    out += f'<polygon points="50,24 57,50 50,50" fill="#d8573c" stroke="{INK}" stroke-width="1.2"/><polygon points="50,24 43,50 50,50" fill="#e47a5e" stroke="{INK}" stroke-width="1.2"/>'
    out += f'<polygon points="50,76 57,50 50,50" fill="#b9b3a8" stroke="{INK}" stroke-width="1.2"/><polygon points="50,76 43,50 50,50" fill="#e2ddd4" stroke="{INK}" stroke-width="1.2"/>'
    return out + f'<circle cx="50" cy="50" r="3" fill="{INK}"/>' + glint(30, 28, 4)


def clock() -> str:
    out = sil(Ci(50, 50, 38)) + f'<circle cx="50" cy="50" r="38" fill="{shade("#efc85a", MID)}"/>'
    out += f'<path d="M14 50 A36 36 0 0 1 86 50" fill="{shade("#efc85a", LIGHT)}"/>'
    out += f'<circle cx="50" cy="50" r="29" fill="#f6f1e6" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += f'<path d="M50 50 L50 58 A8 8 0 0 0 58 50 Z" fill="#a9cfd8" fill-opacity="0.0"/>'
    out += f'<path d="M22 50 A28 28 0 0 0 78 50 Z" fill="#3d5a80" fill-opacity="0.18"/>'
    out += "".join(f'<circle cx="{50 + 24*math.cos(math.radians(a)):.1f}" cy="{50 + 24*math.sin(math.radians(a)):.1f}" r="1.6" fill="{INK}"/>' for a in range(0, 360, 30))
    out += f'<path d="M50 50 L50 30 M50 50 L64 56" stroke="{INK}" stroke-width="3.5" stroke-linecap="round"/>'
    return out + f'<circle cx="50" cy="50" r="3" fill="#d8573c"/>' + glint(30, 28, 4)


def spyglass() -> str:
    brass = "#d9a84a"
    segs = [(R(46, 10, 8, 24, 2), 1.15), (R(44, 32, 12, 26, 2), 1.0), (R(42, 56, 16, 34, 3), 0.9)]
    body = sil(*[s for s, _ in segs])
    for s, k in segs:
        body += fill(s, shade(brass, MID * k))
    body += '<rect x="44" y="58" width="5" height="30" rx="2" fill="#f0cf7a"/><rect x="45.5" y="34" width="4" height="22" rx="2" fill="#f0cf7a"/>'
    body += f'<rect x="41" y="80" width="18" height="6" fill="{shade(LEATHER, MID)}" stroke="{INK}" stroke-width="{EDGE}"/>'
    body += f'<ellipse cx="50" cy="10" rx="4" ry="1.6" fill="#a9cfd8" stroke="{INK}" stroke-width="1.2"/>'
    return turned(body) + glint(64, 26, 3.5)


def brush() -> str:
    body = sil(R(46, 44, 8, 50, 3), R(36, 8, 28, 30, 4), R(40, 34, 20, 12, 3))
    body += fill(R(46, 44, 8, 50, 3), shade(WOOD, MID)) + '<rect x="46" y="46" width="3" height="46" rx="1.5" fill="#c9a57a"/>'
    body += fill(R(40, 34, 20, 12, 3), shade("#d8824a", MID))
    body += fill(R(36, 8, 28, 30, 4), "#e8d8a8") + "".join(f'<rect x="{x}" y="10" width="1.4" height="26" fill="#c8b480"/>' for x in range(40, 62, 4))
    return turned(body)


def lead() -> str:
    rope = "#c9a46a"
    out = line_part("M50 20 C14 20 14 70 50 70 C86 70 86 28 54 28 C30 28 30 60 50 60", rope, 7)
    out += f'<path d="M50 20 C14 20 14 70 50 70 C86 70 86 28 54 28 C30 28 30 60 50 60" fill="none" stroke="{shade(rope, 0.7)}" stroke-width="1.4" stroke-dasharray="3 4"/>'
    out += line_part("M50 60 Q60 80 80 88", rope, 6)
    out += sil(Ci(80, 88, 6)) + f'<circle cx="80" cy="88" r="6" fill="#a9a296"/>'
    return out


def name_tag() -> str:
    d = "M30 22 H82 Q88 22 88 28 V72 Q88 78 82 78 H30 L12 50 Z"
    out = line_part("M24 50 Q10 30 22 12", "#f2ece0", 3)
    out += sil(P(d)) + _lit(d, "#e8d8a8")
    out += f'<circle cx="26" cy="50" r="4.5" fill="#f3ead8" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += "".join(f'<rect x="42" y="{y}" width="{w}" height="3.5" rx="1.5" fill="#8a6544"/>' for y, w in ((40, 34), (52, 26)))
    return out + f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{EDGE}"/>'


def fishing_rod() -> str:
    out = line_part("M14 92 Q50 40 82 10", shade(WOOD, MID), 6)
    out += f'<path d="M82 10 Q90 40 74 70" fill="none" stroke="{INK}" stroke-width="1.6"/>'
    out += sil(R(18, 70, 10, 16, 2)) + f'<rect x="18" y="70" width="10" height="16" rx="2" fill="{shade(LEATHER, MID)}" transform="rotate(35 23 78)"/>'
    out += sil(Ci(74, 74, 6)) + f'<circle cx="74" cy="74" r="6" fill="#f2ece0"/><path d="M68 74 A6 6 0 0 1 80 74 Z" fill="#d8573c"/>'
    return out


def parchment(filled=False) -> str:
    d = "M16 18 Q30 12 44 18 Q58 24 72 18 Q80 15 86 18 V82 Q72 88 58 82 Q44 76 30 82 Q22 85 16 82 Z"
    out = sil(P(d)) + _lit(d, "#e8d8b0")
    if filled:
        out += clipped(d, '<path d="M16 50 Q30 34 46 46 Q60 58 86 40 V100 H16 Z" fill="#a9cfd8"/><path d="M30 30 Q40 40 36 54 Q48 60 60 50" fill="none" stroke="#6f8f4e" stroke-width="2.5"/>')
        out += f'<path d="M62 30 l6 6 m0 -6 l-6 6" stroke="#d8573c" stroke-width="3" stroke-linecap="round"/>'
    else:
        out += "".join(f'<path d="M26 {y} H76" stroke="#d0c098" stroke-width="1.6" stroke-dasharray="4 3"/>' for y in (38, 50, 62))
    return out + f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{EDGE}"/>'


def bucket(content: str | None = None, fish: str | None = None) -> str:
    pail = "M18 36 H82 L74 88 Q50 94 26 88 Z"
    out = line_part("M20 36 Q50 -2 80 36", "#8f8a80", 3.5)
    out += sil(P(pail)) + _lit(pail, "#d8d4cc")
    out += clipped(pail, f'<rect x="0" y="54" width="100" height="5" fill="{shade("#d8d4cc", 0.7)}"/>')
    out += f'<path d="{pail}" fill="none" stroke="{INK}" stroke-width="{EDGE}"/>'
    inner = {"water": "#5d8fa8", "lava": "#e07a3a", "milk": "#fbf8f0", "snow": "#f6f1e6"}.get(content or "", None)
    out += f'<ellipse cx="50" cy="36" rx="32" ry="8" fill="{shade("#d8d4cc", 0.55)}" stroke="{INK}" stroke-width="{EDGE}"/>'
    if inner:
        out += f'<ellipse cx="50" cy="37" rx="28" ry="6" fill="{inner}"/><ellipse cx="42" cy="36" rx="10" ry="2" fill="{shade(inner, 1.35)}"/>'
        if content == "lava":
            out += '<circle cx="58" cy="37" r="2" fill="#f3cf6a"/><circle cx="40" cy="38" r="1.6" fill="#f3cf6a"/>'
        if content == "snow":
            out += f'<path d="M24 37 Q36 22 50 26 Q66 22 76 37 Z" fill="#fbf8f0" stroke="{INK}" stroke-width="{EDGE}"/>'
    if fish:
        out += _fish(fish)
    return out + glint(30, 50, 3.5)


def _fish(c: str) -> str:
    d = "M38 30 Q50 12 66 22 L76 14 L74 30 L76 42 L66 34 Q50 46 38 30 Z"
    return sil(P(d)) + toned(d, c, "M38 30 Q50 12 66 22 L60 26 Q50 22 38 30 Z", None) + '<circle cx="46" cy="27" r="2" fill="#2a221d"/>'


def saddle() -> str:
    seat = "M14 44 Q30 26 50 36 Q70 26 86 44 Q80 62 50 62 Q20 62 14 44 Z"
    out = line_part("M30 58 V80", STRAP, 4) + line_part("M70 58 V80", STRAP, 4)
    out += sil(R(22, 78, 16, 12, 3), R(62, 78, 16, 12, 3))
    out += fill(R(22, 78, 16, 12, 3), "#a9a296") + fill(R(62, 78, 16, 12, 3), "#a9a296")
    out += sil(P(seat)) + _lit(seat, "#8a4e2e")
    out += clipped(seat, '<path d="M14 44 Q30 26 50 36 Q70 26 86 44 L86 48 Q70 32 50 42 Q30 32 14 48 Z" fill="#c07a4a"/>')
    return out + f'<path d="{seat}" fill="none" stroke="{INK}" stroke-width="{EDGE}"/>' + glint(34, 38, 3)


def horse_armour(material: str) -> str:
    color = {"leather": "#a8683a", "copper": "#d8824a", "iron": "#d8d4cc", "gold": "#efc85a", "diamond": "#7fd6d6"}[material]
    d = "M18 86 L24 46 Q30 18 56 12 L82 20 L92 36 L78 44 L64 38 L56 58 L60 86 Z"
    out = sil(P(d)) + _lit(d, color)
    out += clipped(d, f'<path d="M24 46 Q30 18 56 12 L60 22 Q38 28 34 52 Z" fill="{shade(color, 1.15)}"/><rect x="0" y="70" width="100" height="6" fill="{shade(color, 0.7)}"/>')
    out += f'<path d="M66 24 l6 2" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
    out += f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{EDGE}"/>'
    if material != "leather":
        out += glint(40, 30, 4)
    else:
        out += f'<path d="{d}" fill="none" stroke="{shade(color, 1.45)}" stroke-width="1.5" stroke-dasharray="3.5 3" transform="translate(52 50) scale(0.84) translate(-52 -50)"/>'
    return out


def pouch(color="#a8683a") -> str:
    sack = "M30 34 Q12 60 22 82 Q50 96 78 82 Q88 60 70 34 Z"
    neck = "M32 26 Q50 32 68 26 L72 36 Q50 42 28 36 Z"
    out = sil(P(sack), P(neck)) + _lit(sack, color)
    out += f'<path d="{sack}" fill="none" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += toned(neck, shade(color, 0.85))
    out += line_part("M50 34 Q40 18 34 22 M50 34 Q60 18 66 22", "#e8d8a8", 2.5)
    out += f'<path d="M36 58 Q50 66 64 58" fill="none" stroke="{shade(color, 0.6)}" stroke-width="2"/>'
    return out


def fire_striker() -> str:
    ring = "M30 30 A22 22 0 1 0 60 60"
    out = line_part(ring, "#a9a296", 8)
    out += f'<path d="M32 33 A19 19 0 0 0 30 52" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.7"/>'
    flint = [(58, 14), (84, 30), (78, 56), (56, 50), (50, 30)]
    from itemkit import faceted

    out += faceted(flint, [([(58, 14), (84, 30), (66, 34)], 1.5), ([(50, 30), (58, 14), (66, 34), (56, 50)], 1.25)], "#4a4652")
    return out + '<path d="M44 58 l6 -4 M48 66 l8 -2" stroke="#e8b85a" stroke-width="2.5" stroke-linecap="round"/>'


def carrot_lure() -> str:
    out = line_part("M14 92 Q50 40 82 10", shade(WOOD, MID), 6)
    out += f'<path d="M82 10 Q88 34 76 54" fill="none" stroke="{INK}" stroke-width="1.6"/>'
    d = "M70 54 Q84 54 82 66 L72 90 Q68 92 66 88 Z"
    out += sil(P(d)) + toned(d, "#df8a45", "M70 54 Q76 54 76 60 L68 88 Q66 90 66 88 Z", None)
    out += f'<path d="M74 54 L68 44 M76 54 L80 44" stroke="#6f8f4e" stroke-width="3.5" stroke-linecap="round"/>'
    return out


def snowball() -> str:
    out = sil(Ci(50, 52, 30)) + f'<circle cx="50" cy="52" r="30" fill="#c8d8e4"/><circle cx="45" cy="47" r="25" fill="#e8eef2"/><circle cx="41" cy="43" r="17" fill="#fbf8f0"/>'
    return out + "".join(f'<circle cx="{x}" cy="{y}" r="2" fill="#b8c8d4"/>' for x, y in ((58, 60), (64, 48), (52, 70)))


def firework_rocket() -> str:
    tube = R(36, 30, 28, 46, 3)
    cone = "M34 32 L50 6 L66 32 Z"
    out = line_part("M50 76 V96", shade(WOOD, MID), 4)
    out += sil(tube, P(cone)) + fill(tube, shade("#c0533a", MID))
    out += '<rect x="36" y="32" width="10" height="42" fill="#d8735a"/>'
    out += "".join(f'<rect x="36" y="{y}" width="28" height="5" fill="#f2ece0"/>' for y in (42, 58))
    out += toned(cone, "#e8c45a", "M34 32 L50 6 L50 32 Z", None)
    return out + glint(42, 22, 3)


def firework_star() -> str:
    out = sil(Ci(50, 52, 26)) + f'<circle cx="50" cy="52" r="26" fill="{shade("#5a5652", MID)}"/><circle cx="46" cy="48" r="18" fill="{shade("#5a5652", 1.3)}"/>'
    for a, c in ((0, "#e8c45a"), (72, "#d8573c"), (144, "#4f9a9a"), (216, "#b4609e"), (288, "#a8c262")):
        x, y = 50 + 36 * math.cos(math.radians(a - 90)), 52 + 36 * math.sin(math.radians(a - 90))
        out += f'<path d="M{x} {y-6} L{x+2} {y-2} L{x+6} {y} L{x+2} {y+2} L{x} {y+6} L{x-2} {y+2} L{x-6} {y} L{x-2} {y-2} Z" fill="{c}" stroke="{INK}" stroke-width="1.4"/>'
    return out


# --- catalogue ----------------------------------------------------------------------------------

TOOL_KINDS = ["sword", "spear", "pickaxe", "axe", "shovel", "hoe"]
TIER_NAMES = {"wooden": "Wooden", "stone": "Stone", "copper": "Copper", "iron": "Iron", "golden": "Golden", "diamond": "Diamond"}
TIER_STATS = {  # durability, mining speed, damage bonus
    "wooden": (40, 1.0, 0),
    "stone": (100, 2.0, 1),
    "copper": (160, 2.5, 1.5),
    "iron": (240, 3.0, 2),
    "golden": (60, 4.5, 1),
    "diamond": (900, 4.0, 3),
}
BASE_DAMAGE = {"sword": 4, "spear": 3, "axe": 3, "pickaxe": 2, "shovel": 2, "hoe": 1}
ARMOUR_NAMES = {"leather": "Leather", "copper": "Copper", "chainmail": "Chainmail", "iron": "Iron", "golden": "Golden", "diamond": "Diamond"}
ARMOUR_WEIGHT = {"helmet": 2, "chestplate": 4, "leggings": 3, "boots": 1}
ARMOUR_MULT = {"leather": 0.5, "copper": 0.75, "chainmail": 0.9, "golden": 0.8, "iron": 1.0, "diamond": 1.5}
ARMOUR_DUR = {"leather": 50, "copper": 120, "chainmail": 160, "golden": 80, "iron": 180, "diamond": 400}
PIECE_DUR = {"helmet": 0.8, "chestplate": 1.2, "leggings": 1.1, "boots": 0.9}
PIECE_NAMES = {"helmet": "Helmet", "chestplate": "Chestplate", "leggings": "Leggings", "boots": "Boots"}


def gear_catalogue() -> list[dict]:
    """Every batch-2 entry: reference id, Sōzō name, category, tier and stats, and its drawing."""
    rows: list[dict] = []

    def add(src, name, category, draw, tier="", damage=None, durability=None, speed=None, defence=None, bind="No"):
        rows.append(dict(src=src, name=name, category=category, draw=draw, tier=tier, damage=damage, durability=durability, speed=speed, defence=defence, bind=bind))

    for tier in TIERS:
        dur, speed, bonus = TIER_STATS[tier]
        for kind in TOOL_KINDS:
            cat = "Weapon" if kind in ("sword", "spear") else "Tool"
            add(
                f"{tier}_{kind}",
                f"{TIER_NAMES[tier]} {kind.title()}",
                cat,
                (lambda k=kind, t=tier: tool(k, t)),
                TIER_NAMES[tier],
                BASE_DAMAGE[kind] + bonus,
                dur,
                speed if cat == "Tool" else None,
                bind="Yes",
            )
    for mat in ARMOUR_SETS:
        for piece in ARMOUR_SHAPES:
            add(
                f"{mat}_{piece}",
                f"{ARMOUR_NAMES[mat]} {PIECE_NAMES[piece]}",
                "Armour",
                (lambda p=piece, m=mat: armour(p, m)),
                ARMOUR_NAMES[mat],
                durability=round(ARMOUR_DUR[mat] * PIECE_DUR[piece]),
                defence=round(ARMOUR_WEIGHT[piece] * ARMOUR_MULT[mat], 1),
            )
    add("bow", "Bow", "Ranged", bow, damage=5, durability=300, bind="Yes")
    add("crossbow", "Crossbow", "Ranged", crossbow, damage=7, durability=360, bind="Yes")
    add("arrow", "Arrow", "Ranged", arrow)
    add("tipped_arrow", "Dipped Arrow", "Ranged", lambda: arrow(dipped="#86629e"))
    add("shield", "Shield", "Weapon", shield, defence=3, durability=300, bind="Yes")
    add("flint_and_steel", "Fire Striker", "Utility", fire_striker, durability=60)
    add("shears", "Shears", "Utility", shears, durability=200)
    add("compass", "Compass", "Utility", compass)
    add("clock", "Clock", "Utility", clock)
    add("spyglass", "Spyglass", "Utility", spyglass)
    add("brush", "Brush", "Utility", brush, durability=60)
    add("lead", "Lead", "Utility", lead)
    add("name_tag", "Name Tag", "Utility", name_tag)
    add("fishing_rod", "Fishing Rod", "Utility", fishing_rod, durability=60)
    add("carrot_on_a_stick", "Carrot Lure", "Riding", carrot_lure, durability=25)
    add("map", "Blank Map", "Utility", parchment)
    add("filled_map", "Map", "Utility", lambda: parchment(True))
    add("bucket", "Bucket", "Container", bucket)
    add("water_bucket", "Water Bucket", "Container", lambda: bucket("water"))
    add("lava_bucket", "Lava Bucket", "Container", lambda: bucket("lava"))
    add("milk_bucket", "Milk Bucket", "Container", lambda: bucket("milk"))
    add("powder_snow_bucket", "Powder Snow Bucket", "Container", lambda: bucket("snow"))
    for src, name, c in (("cod_bucket", "Bucket of Cod", "#b8a07a"), ("salmon_bucket", "Bucket of Salmon", "#c0634a"), ("tropical_fish_bucket", "Bucket of Tropical Fish", "#e8a03a"), ("pufferfish_bucket", "Bucket of Pufferfish", "#e8c45a")):
        add(src, name, "Container", (lambda c=c: bucket("water", c)))
    add("saddle", "Saddle", "Riding", saddle)
    for mat, ref, label in (("leather", "leather_horse_armor", "Leather"), ("copper", "copper_horse_armor", "Copper"), ("iron", "iron_horse_armor", "Iron"), ("gold", "gold_horse_armor", "Golden"), ("diamond", "diamond_horse_armor", "Diamond")):
        add(ref, f"{label} Horse Barding", "Riding", (lambda m=mat: horse_armour(m)), label, defence={"leather": 2, "copper": 3, "iron": 4, "gold": 4, "diamond": 7}[mat])
    add("bundle", "Pouch", "Container", pouch)
    for col, hexc in DYES.items():
        add(f"{col}_bundle", f"{col.replace('_', ' ').title()} Pouch", "Container", (lambda h=hexc: pouch(h)))
    add("snowball", "Snowball", "Throwable", snowball)
    add("firework_rocket", "Firework Rocket", "Throwable", firework_rocket)
    add("firework_star", "Firework Star", "Throwable", firework_star)
    return rows


# Reference items considered for batch 2 but left out, with the reason.
GEAR_EXCLUDED_RE = (
    r"netherite|trident|^mace$|elytra|totem|turtle_helmet|goat_horn|recovery_compass|warped_fungus_on_a_stick|"
    r"nautilus_armor|wolf_armor|_harness$|spectral_arrow|fire_charge|wind_charge|ender_pearl|_map$(?<!filled_map)|spawn_egg"
)
