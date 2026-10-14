"""Batch 3 item sprites: food, in the batch-1 materials recipe (see itemkit.py)."""

from __future__ import annotations

import math

from geometry import INK, shade
from itemkit import DARK, EDGE, HI, LIGHT, MID, Ci, R, clipped, fill, glint, line_part, sil, toned, turned
from itemkit import Pd as P

STEM = "#6e5440"
LEAF = "#6f8f4e"
WOODBOWL = "#b88a5a"


def leaf(d: str, color: str = LEAF) -> str:
    return sil(P(d)) + toned(d, color, None, None) + f'<path d="{d}" fill="none" stroke="{shade(color, 0.7)}" stroke-width="0" />'


def _leaf_shape(x, y, ang, size=14) -> str:
    return f'M{x} {y} Q{x + size * math.cos(math.radians(ang - 30)):.1f} {y + size * math.sin(math.radians(ang - 30)):.1f} {x + size * 1.6 * math.cos(math.radians(ang)):.1f} {y + size * 1.6 * math.sin(math.radians(ang)):.1f} Q{x + size * math.cos(math.radians(ang + 30)):.1f} {y + size * math.sin(math.radians(ang + 30)):.1f} {x} {y} Z'


# --- produce ------------------------------------------------------------------------------------

APPLE = "M50 30 Q66 18 80 32 Q92 50 82 72 Q72 92 56 86 Q50 84 44 86 Q28 92 18 72 Q8 50 20 32 Q34 18 50 30 Z"


def fruit(color: str, gilded=False) -> str:
    out = line_part("M50 32 Q50 18 56 10", STEM, 4)
    out += sil(P(APPLE))
    out += toned(APPLE, color, "M8 20 Q40 14 46 40 Q44 70 30 96 L8 96 Z", "M66 24 Q98 50 70 96 H100 V20 Z")
    out += f'<ellipse cx="34" cy="46" rx="7" ry="11" fill="{shade(color, 1.35)}" transform="rotate(20 34 46)"/>'
    lf = _leaf_shape(54, 22, -20, 13)
    out += sil(P(lf)) + toned(lf, LEAF, None, None)
    out += glint(30, 40, 4)
    if gilded:
        out += glint(68, 62, 5) + glint(44, 74, 3)
    return out


def carrot(color="#df8a45", gilded=False) -> str:
    body = "M38 28 Q50 22 62 28 L53 94 Q50 97 47 94 Z"
    tops = "".join(_leaf_shape(50, 26, a, 10) for a in (-115, -90, -65))
    b = sil(P(body), *[P(_leaf_shape(50, 26, a, 10)) for a in (-115, -90, -65)])
    b += "".join(toned(_leaf_shape(50, 26, a, 10), LEAF) for a in (-115, -90, -65))
    b += toned(body, color, "M38 28 Q44 24 50 24 L49 96 L47 94 Z", "M56 26 Q60 27 62 28 L53 94 L51 95 Z")
    b += "".join(f'<path d="M{42 + k*0.6:.1f} {40 + k*12} l7 2" stroke="{shade(color, 0.7)}" stroke-width="1.8" stroke-linecap="round"/>' for k in range(4))
    if gilded:
        b += glint(44, 44, 4) + glint(52, 70, 3)
    _ = tops
    return turned(b)


POTATO = "M20 56 Q18 34 40 30 Q62 24 78 38 Q90 54 78 70 Q62 84 40 80 Q22 76 20 56 Z"


def potato(color="#c8a46a", green=False, baked=False) -> str:
    out = sil(P(POTATO)) + toned(POTATO, color, "M10 30 Q40 22 50 44 Q36 60 30 90 H10 Z", "M70 30 Q100 56 70 90 H100 V30 Z")
    if green:
        out += clipped(POTATO, '<ellipse cx="62" cy="44" rx="14" ry="9" fill="#9aae5a"/><ellipse cx="38" cy="66" rx="9" ry="6" fill="#9aae5a"/>')
    if baked:
        split = "M30 46 Q50 36 70 46 Q50 60 30 46 Z"
        out += fill(P(split), "#f0d68a") + f'<rect x="44" y="40" width="12" height="9" rx="2" fill="#f8e8a0" stroke="{INK}" stroke-width="{EDGE}"/>'
    else:
        out += "".join(f'<path d="M{x} {y} q3 -2 6 0" stroke="{shade(color, 0.6)}" stroke-width="2" fill="none" stroke-linecap="round"/>' for x, y in ((34, 48), (58, 40), (64, 62), (40, 66)))
    return out + glint(34, 40, 3.5)


def beetroot() -> str:
    bulb = "M50 38 Q76 42 74 64 Q70 84 52 90 L50 98 L48 90 Q30 84 26 64 Q24 42 50 38 Z"
    out = line_part("M50 40 Q44 22 34 12", "#a8344a", 3.5) + line_part("M50 40 Q58 22 68 12", "#a8344a", 3.5)
    for x, y, a in ((34, 12, -120), (68, 12, -60)):
        d = _leaf_shape(x, y, a, 9)
        out += sil(P(d)) + toned(d, LEAF)
    out += sil(P(bulb)) + toned(bulb, "#a8344a", "M20 40 Q42 38 46 56 Q40 76 36 96 H20 Z", "M62 40 Q86 60 60 96 H100 V40 Z")
    return out + glint(36, 54, 3.5)


def melon_slice() -> str:
    rind = "M10 34 Q50 104 90 34 Z"
    flesh = "M18 36 Q50 90 82 36 Z"
    out = sil(P(rind)) + fill(P(rind), shade("#6f9a4e", MID))
    out += fill(P("M14 35 Q50 97 86 35 Z"), "#e8eccc", edge=False)
    out += toned(flesh, "#e0564a", "M18 36 Q30 60 46 72 L50 36 Z", None)
    out += "".join(f'<ellipse cx="{x}" cy="{y}" rx="1.8" ry="3" fill="{INK}"/>' for x, y in ((36, 46), (50, 54), (64, 46), (44, 62), (58, 62)))
    return out + glint(30, 40, 3)


def berries() -> str:
    pts = ((38, 58, 12), (60, 54, 12), (48, 74, 12), (50, 40, 10))
    out = sil(*[Ci(x, y, r) for x, y, r in pts])
    for x, y, r in pts:
        out += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{shade("#c0334a", DARK)}" stroke="{INK}" stroke-width="{EDGE}" stroke-opacity="0.75"/>'
        out += f'<circle cx="{x-2}" cy="{y-2}" r="{r*0.72:.1f}" fill="{shade("#c0334a", LIGHT)}"/><circle cx="{x-4}" cy="{y-4}" r="2.4" fill="#ffffff" fill-opacity="0.85"/>'
    d = _leaf_shape(56, 32, -40, 10)
    return line_part("M50 32 Q52 20 60 14", STEM, 3) + out + sil(P(d)) + toned(d, LEAF)


def dried_kelp() -> str:
    out = ""
    for k, y in enumerate((30, 50, 70)):
        d = f"M16 {y} Q50 {y-14} 84 {y} L84 {y+12} Q50 {y-2} 16 {y+12} Z"
        out += sil(P(d)) + toned(d, "#4e5a3a", f"M16 {y} Q50 {y-14} 84 {y} L84 {y+4} Q50 {y-10} 16 {y+4} Z", None)
    return out


def cocoa_beans() -> str:
    out = ""
    for x, y, a in ((36, 42, -30), (62, 46, 25), (48, 68, -5)):
        e = f'<ellipse cx="{x}" cy="{y}" rx="11" ry="15" transform="rotate({a} {x} {y})"/>'
        out += sil(e)
    for x, y, a in ((36, 42, -30), (62, 46, 25), (48, 68, -5)):
        out += f'<ellipse cx="{x}" cy="{y}" rx="11" ry="15" transform="rotate({a} {x} {y})" fill="{shade("#7a4a2a", MID)}" stroke="{INK}" stroke-width="{EDGE}"/>'
        out += f'<ellipse cx="{x-3}" cy="{y-3}" rx="6" ry="10" transform="rotate({a} {x} {y})" fill="{shade("#7a4a2a", 1.25)}"/>'
        out += f'<path d="M{x} {y-12} L{x} {y+12}" transform="rotate({a} {x} {y})" stroke="{shade("#7a4a2a", 0.55)}" stroke-width="1.6"/>'
    return out


def seeds(color: str, shape="drop") -> str:
    pts = ((34, 40, -20), (56, 34, 15), (66, 56, 40), (44, 60, -5), (52, 78, 20))
    out = ""
    for x, y, a in pts:
        if shape == "flat":
            e = f'<ellipse cx="{x}" cy="{y}" rx="8" ry="11" transform="rotate({a} {x} {y})"/>'
        else:
            e = f'<path d="M{x} {y-11} Q{x+8} {y+2} {x} {y+9} Q{x-8} {y+2} {x} {y-11} Z" transform="rotate({a} {x} {y})"/>'
        out += sil(e)
    for x, y, a in pts:
        if shape == "flat":
            out += f'<ellipse cx="{x}" cy="{y}" rx="8" ry="11" transform="rotate({a} {x} {y})" fill="{shade(color, MID)}" stroke="{INK}" stroke-width="{EDGE}"/>'
            out += f'<ellipse cx="{x-2}" cy="{y-2}" rx="4" ry="7" transform="rotate({a} {x} {y})" fill="{shade(color, HI)}"/>'
        else:
            out += f'<path d="M{x} {y-11} Q{x+8} {y+2} {x} {y+9} Q{x-8} {y+2} {x} {y-11} Z" transform="rotate({a} {x} {y})" fill="{shade(color, MID)}" stroke="{INK}" stroke-width="{EDGE}"/>'
            out += f'<path d="M{x-1} {y-8} Q{x-5} {y+1} {x-1} {y+6} Z" transform="rotate({a} {x} {y})" fill="{shade(color, HI)}"/>'
    return out


# --- meat & fish --------------------------------------------------------------------------------

RAW = "#d8706a"
COOKED = "#9a5a32"
STEAK = "M16 52 Q14 26 42 22 Q74 18 84 40 Q92 62 70 76 Q48 90 28 78 Q16 70 16 52 Z"


def _meat_surface(d: str, cooked: bool) -> str:
    if cooked:
        return clipped(d, "".join(f'<path d="M{x} 20 L{x-26} 90" stroke="{shade(COOKED, 0.55)}" stroke-width="3.5" stroke-linecap="round"/>' for x in (46, 62, 78)))
    return clipped(d, '<path d="M30 46 Q44 40 50 52 Q60 62 72 52 M36 64 Q48 58 58 66" fill="none" stroke="#f3d8d0" stroke-width="2.4" stroke-linecap="round"/>')


def steak(cooked=False) -> str:
    c = COOKED if cooked else RAW
    out = sil(P(STEAK)) + toned(STEAK, c, "M10 20 Q40 16 46 36 Q34 56 30 96 H10 Z", "M70 26 Q100 58 70 96 H100 V20 Z")
    out += f'<path d="M20 50 Q20 30 42 26 Q70 22 80 40" fill="none" stroke="{"#e8c49a" if cooked else "#f6e6dc"}" stroke-width="4" stroke-linecap="round"/>'
    out += _meat_surface(STEAK, cooked)
    out += f'<circle cx="62" cy="58" r="7" fill="#f2ece0" stroke="{INK}" stroke-width="{EDGE}"/><circle cx="62" cy="58" r="3" fill="#d8a8a0"/>'
    return out + glint(32, 40, 3.5)


def chop(cooked=False) -> str:
    c = COOKED if cooked else "#e08a86"
    body = "M14 46 Q14 22 40 22 Q66 22 70 44 Q72 66 48 72 Q22 74 14 46 Z"
    bone = R(62, 50, 30, 10, 5)
    out = sil(P(body), bone, Ci(90, 50, 7), Ci(90, 61, 7))
    out += fill(bone, "#f2ece0") + f'<circle cx="90" cy="50" r="7" fill="#f2ece0"/><circle cx="90" cy="61" r="7" fill="#f2ece0"/>'
    out += toned(body, c, "M8 20 Q34 18 38 34 Q30 52 24 80 H8 Z", "M52 24 Q78 44 56 80 H100 V24 Z")
    out += f'<path d="M18 44 Q18 26 40 26 Q60 26 66 40" fill="none" stroke="{"#e8c49a" if cooked else "#f6e6dc"}" stroke-width="4" stroke-linecap="round"/>'
    out += _meat_surface(body, cooked)
    return out + glint(30, 36, 3.5)


def rack(cooked=False) -> str:
    c = COOKED if cooked else "#d8807a"
    body = "M12 60 Q14 40 36 38 H70 Q86 40 86 58 Q84 78 60 80 H34 Q12 78 12 60 Z"
    bones = [R(34, 14, 7, 28, 3), R(50, 12, 7, 30, 3), R(66, 14, 7, 28, 3)]
    out = sil(P(body), *bones)
    out += "".join(fill(b, "#f2ece0") for b in bones)
    out += toned(body, c, "M8 36 Q30 36 34 50 Q30 66 26 90 H8 Z", "M66 38 Q96 56 66 90 H100 V36 Z")
    out += f'<path d="M16 56 Q18 44 36 42 H70" fill="none" stroke="{"#e8c49a" if cooked else "#f6e6dc"}" stroke-width="4" stroke-linecap="round"/>'
    out += _meat_surface(body, cooked)
    return out + glint(28, 54, 3.5)


def drumstick(cooked=False) -> str:
    c = "#c8843a" if cooked else "#f0c0b0"
    meat = "M50 4 Q72 6 70 34 Q68 56 56 62 H44 Q32 56 30 34 Q28 6 50 4 Z"
    bone = R(46, 60, 8, 26, 3)
    knobs = [Ci(44, 90, 6), Ci(56, 90, 6)]
    b = sil(P(meat), bone, *knobs)
    b += fill(bone, "#f2ece0") + "".join(fill(k, "#f2ece0") for k in knobs)
    b += toned(meat, c, "M28 4 Q46 6 48 30 Q42 50 40 64 H28 Z", "M60 8 Q76 30 58 64 H76 V4 Z")
    if cooked:
        b += clipped(meat, "".join(f'<path d="M30 {y} L70 {y-8}" stroke="{shade(c, 0.6)}" stroke-width="3"/>' for y in (26, 40)))
    b += glint(40, 18, 3.5)
    return turned(b)


def haunch(cooked=False) -> str:
    c = COOKED if cooked else "#e09a90"
    d = "M20 30 Q30 12 52 18 Q76 26 80 50 Q82 70 66 76 L58 90 Q50 94 46 86 L44 72 Q22 62 20 30 Z"
    out = sil(P(d)) + toned(d, c, "M14 14 Q36 14 40 32 Q36 52 34 90 H14 Z", "M64 24 Q92 52 66 90 H100 V20 Z")
    out += _meat_surface(d, cooked)
    out += f'<circle cx="52" cy="88" r="4.5" fill="#f2ece0" stroke="{INK}" stroke-width="{EDGE}"/>'
    return out + glint(32, 30, 3.5)


FISH = "M12 52 Q32 26 62 34 L82 20 L78 52 L82 82 L62 68 Q32 78 12 52 Z"


def fish(color: str, cooked=False, stripes=None) -> str:
    c = "#c88a4a" if cooked else color
    out = sil(P(FISH), P("M34 36 L44 20 L54 34 Z"), P("M36 66 L42 80 L52 68 Z"))
    out += toned("M34 36 L44 20 L54 34 Z", shade(c, 0.85)) + toned("M36 66 L42 80 L52 68 Z", shade(c, 0.85))
    out += toned(FISH, c, "M12 52 Q32 26 62 34 L62 46 Q36 40 12 52 Z", "M12 52 Q32 78 62 68 L82 82 L78 60 Q40 66 12 52 Z")
    if stripes:
        out += clipped(FISH, "".join(f'<rect x="{x}" y="10" width="7" height="90" fill="{stripes}" stroke="{INK}" stroke-width="1.2"/>' for x in (34, 54)))
    if cooked:
        out += clipped(FISH, "".join(f'<path d="M{x} 30 L{x-10} 76" stroke="{shade(c, 0.55)}" stroke-width="3" stroke-linecap="round"/>' for x in (40, 56, 70)))
        out += f'<path d="M24 52 l6 -2" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>'
    else:
        out += f'<circle cx="26" cy="48" r="4.5" fill="#f2ece0" stroke="{INK}" stroke-width="{EDGE}"/><circle cx="25" cy="48" r="2" fill="{INK}"/>'
        out += f'<path d="M36 44 Q40 52 36 60" fill="none" stroke="{shade(c, 0.6)}" stroke-width="2"/>'
    return out + glint(44, 40, 3)


def pufferfish() -> str:
    c = "#e8c45a"
    spikes = "".join(
        f'<polygon points="{50 + 30*math.cos(math.radians(a - 8)):.1f},{54 + 30*math.sin(math.radians(a - 8)):.1f} {50 + 42*math.cos(math.radians(a)):.1f},{54 + 42*math.sin(math.radians(a)):.1f} {50 + 30*math.cos(math.radians(a + 8)):.1f},{54 + 30*math.sin(math.radians(a + 8)):.1f}"/>'
        for a in range(0, 360, 30)
    )
    out = sil(spikes, Ci(50, 54, 32))
    out += f'<g fill="{shade(c, 0.8)}">{spikes}</g>'
    out += f'<circle cx="50" cy="54" r="32" fill="{shade(c, DARK)}"/><circle cx="45" cy="49" r="27" fill="{shade(c, MID)}"/><circle cx="41" cy="45" r="18" fill="{shade(c, LIGHT)}"/>'
    out += f'<circle cx="34" cy="48" r="5" fill="#f2ece0" stroke="{INK}" stroke-width="{EDGE}"/><circle cx="33" cy="48" r="2.4" fill="{INK}"/>'
    out += f'<ellipse cx="22" cy="58" rx="4" ry="3" fill="#c0634a" stroke="{INK}" stroke-width="{EDGE}"/>'
    return out + glint(46, 36, 4)


def spoiled_meat() -> str:
    c = "#8a9a6e"
    out = sil(P(STEAK)) + toned(STEAK, c, "M10 20 Q40 16 46 36 Q34 56 30 96 H10 Z", "M70 26 Q100 58 70 96 H100 V20 Z")
    out += clipped(STEAK, '<ellipse cx="40" cy="50" rx="10" ry="6" fill="#6e7a52"/><ellipse cx="64" cy="64" rx="8" ry="5" fill="#a8ae7a"/>')
    for x, y in ((24, 14), (78, 18), (88, 70)):
        out += f'<ellipse cx="{x-3}" cy="{y-3}" rx="3.5" ry="2" fill="#e2ecf2" stroke="{INK}" stroke-width="1"/><ellipse cx="{x+3}" cy="{y-3}" rx="3.5" ry="2" fill="#e2ecf2" stroke="{INK}" stroke-width="1"/><circle cx="{x}" cy="{y}" r="2.6" fill="{INK}"/>'
    return out


def spider_eye() -> str:
    c = "#b0303a"
    out = sil(Ci(50, 52, 32)) + f'<circle cx="50" cy="52" r="32" fill="{shade(c, DARK)}"/><circle cx="45" cy="47" r="27" fill="{shade(c, MID)}"/><circle cx="41" cy="43" r="18" fill="{shade(c, LIGHT)}"/>'
    out += "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#2a1a22"/><circle cx="{x-r*0.35:.1f}" cy="{y-r*0.35:.1f}" r="{r*0.3:.1f}" fill="#ffffff"/>' for x, y, r in ((50, 50, 8), (34, 60, 5), (66, 62, 5), (52, 72, 4)))
    out += '<path d="M24 40 q8 4 10 12 M76 38 q-6 6 -8 14" fill="none" stroke="#7a1a2a" stroke-width="1.6"/>'
    return out + glint(36, 34, 3.5)


# --- baked & meals ------------------------------------------------------------------------------


def bread() -> str:
    d = "M8 62 Q10 34 50 30 Q90 34 92 62 Q90 78 50 80 Q10 78 8 62 Z"
    c = "#d8a050"
    out = sil(P(d)) + toned(d, c, "M8 30 H100 V50 Q50 40 8 52 Z", "M8 66 Q50 76 92 66 V100 H8 Z")
    out += "".join(f'<path d="M{x} 40 Q{x+8} 46 {x+4} 56" fill="none" stroke="{shade(c, 1.3)}" stroke-width="4" stroke-linecap="round"/>' for x in (26, 44, 62))
    return out + glint(30, 40, 3)


def cookie() -> str:
    c = "#d8a868"
    out = sil(Ci(50, 52, 34)) + toned(f"M16 52 A34 34 0 1 0 84 52 A34 34 0 1 0 16 52 Z", c, "M10 10 H50 V100 H10 Z", "M70 10 H100 V100 H70 Z")
    out += "".join(f'<ellipse cx="{x}" cy="{y}" rx="5" ry="4" fill="#5a3a26" stroke="{INK}" stroke-width="1.2"/>' for x, y in ((36, 40), (60, 36), (64, 60), (40, 64), (52, 50), (30, 54)))
    return out


def pie() -> str:
    tin = "M8 60 Q8 82 50 84 Q92 82 92 60 Z"
    out = sil(P(tin), '<ellipse cx="50" cy="56" rx="42" ry="20"/>')
    out += toned(tin, "#a9a296", "M8 60 Q20 78 40 82 L40 60 Z", "M70 60 V82 Q90 78 92 60 Z")
    out += f'<ellipse cx="50" cy="56" rx="42" ry="20" fill="{shade("#d8a050", MID)}" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += f'<ellipse cx="50" cy="55" rx="34" ry="15" fill="#df8a45" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += f'<ellipse cx="44" cy="52" rx="20" ry="7" fill="#eaa060"/>'
    out += "".join(f'<path d="M{x} 44 L{x+6} 66" stroke="#e8c080" stroke-width="3.5" stroke-linecap="round"/>' for x in (32, 46, 60))
    return out + glint(34, 46, 3)


def bowl(contents: str | None = None) -> str:
    body = "M10 46 Q12 88 50 88 Q88 88 90 46 Z"
    out = sil(P(body), '<ellipse cx="50" cy="46" rx="40" ry="13"/>')
    out += toned(body, WOODBOWL, "M10 46 Q14 82 42 88 L36 46 Z", "M70 46 L64 88 Q88 82 90 46 Z")
    out += f'<ellipse cx="50" cy="46" rx="40" ry="13" fill="{shade(WOODBOWL, DARK)}" stroke="{INK}" stroke-width="{EDGE}"/>'
    if contents:
        col, bits = {
            "mushroom": ("#8a6a4a", [("#d9c8a8", 40, 44), ("#c0533a", 58, 46)]),
            "rabbit": ("#a8703a", [("#df8a45", 38, 46), ("#e8d098", 56, 44), ("#6f8f4e", 64, 48)]),
            "beetroot": ("#a8344a", [("#d8606a", 44, 45), ("#6f8f4e", 60, 46)]),
            "mystery": ("#6a5a7a", [("#e8c45a", 40, 45), ("#5fa8d0", 58, 46), ("#c0533a", 50, 49)]),
        }[contents]
        out += f'<ellipse cx="50" cy="47" rx="34" ry="9.5" fill="{col}"/><ellipse cx="44" cy="45" rx="16" ry="4" fill="{shade(col, 1.3)}"/>'
        for bc, x, y in bits:
            out += f'<ellipse cx="{x}" cy="{y}" rx="5" ry="3" fill="{bc}" stroke="{INK}" stroke-width="1.2"/>'
        out += "".join(f'<path d="M{x} 30 q-5 -8 0 -14 q5 -6 0 -12" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.85"/>' for x in (40, 58))
    return out


def bottle(honey=False) -> str:
    glass = "M40 22 H60 V32 Q78 40 78 62 Q78 90 50 90 Q22 90 22 62 Q22 40 40 32 Z"
    cork = R(40, 8, 20, 14, 3)
    out = sil(P(glass), cork)
    out += fill(P(glass), "#d8eaec")
    if honey:
        out += clipped(glass, f'<rect x="0" y="50" width="100" height="50" fill="#e8a83a"/><ellipse cx="50" cy="50" rx="30" ry="4" fill="#f3c86a"/>')
    out += clipped(glass, '<path d="M60 30 Q78 44 74 80 L100 80 V20 Z" fill="#000000" fill-opacity="0.12"/>')
    out += f'<path d="{glass}" fill="none" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += fill(cork, "#b8885a") + '<rect x="42" y="10" width="5" height="10" rx="2" fill="#d8a878"/>'
    out += '<path d="M32 50 Q30 64 36 78" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-opacity="0.85"/>'
    return out + glint(64, 46, 3.5)


def egg(color="#f2ece0", speckle=None) -> str:
    d = "M50 12 Q76 14 78 56 Q78 88 50 90 Q22 88 22 56 Q24 14 50 12 Z"
    out = sil(P(d)) + toned(d, color, "M20 10 Q40 12 44 40 Q40 66 36 96 H20 Z", "M62 16 Q90 50 64 96 H100 V10 Z")
    if speckle:
        out += clipped(d, "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{speckle}"/>' for x, y, r in ((40, 40, 2.2), (58, 34, 1.8), (62, 60, 2.4), (44, 70, 2), (54, 50, 1.6))))
    return out + f'<ellipse cx="38" cy="38" rx="6" ry="10" fill="{shade(color, 1.4)}" transform="rotate(15 38 38)"/>'


# --- catalogue ----------------------------------------------------------------------------------


def food_catalogue() -> list[dict]:
    rows: list[dict] = []

    def add(src, name, category, draw, energy, size, cooks="", effect=""):
        rows.append(dict(src=src, name=name, category=category, draw=draw, energy=energy, size=size, cooks=cooks, effect=effect))

    add("apple", "Apple", "Produce", lambda: fruit("#c0433a"), 3, "Light")
    add("golden_apple", "Gilded Apple", "Produce", lambda: fruit("#e8bf4a", gilded=True), 6, "Meal", effect="Regeneration")
    add("sweet_berries", "Sweet Berries", "Produce", berries, 2, "Snack")
    add("carrot", "Carrot", "Produce", carrot, 3, "Light")
    add("golden_carrot", "Gilded Carrot", "Produce", lambda: carrot("#e8bf4a", gilded=True), 6, "Meal", effect="Night Sight")
    add("potato", "Potato", "Produce", potato, 2, "Snack", cooks="Baked Potato")
    add("baked_potato", "Baked Potato", "Produce", lambda: potato("#b8803a", baked=True), 5, "Meal")
    add("poisonous_potato", "Green Potato", "Produce", lambda: potato("#b8b07a", green=True), 1, "Snack", effect="May cause Poison")
    add("beetroot", "Beetroot", "Produce", beetroot, 2, "Snack")
    add("melon_slice", "Melon Slice", "Produce", melon_slice, 2, "Snack")
    add("dried_kelp", "Dried Kelp", "Produce", dried_kelp, 1, "Snack")
    add("cocoa_beans", "Cocoa Beans", "Seeds", cocoa_beans, 0, "Ingredient")
    add("wheat_seeds", "Wheat Seeds", "Seeds", lambda: seeds("#a8b05a"), 0, "Ingredient")
    add("beetroot_seeds", "Beetroot Seeds", "Seeds", lambda: seeds("#8a4a3a"), 0, "Ingredient")
    add("pumpkin_seeds", "Pumpkin Seeds", "Seeds", lambda: seeds("#ece2c0", "flat"), 0, "Ingredient")
    add("melon_seeds", "Melon Seeds", "Seeds", lambda: seeds("#3a3633", "flat"), 0, "Ingredient")
    for raw_id, raw_name, cooked_id, cooked_name, fn, e_raw, e_cooked in (
        ("beef", "Raw Beef", "cooked_beef", "Steak", steak, 2, 8),
        ("porkchop", "Raw Pork Chop", "cooked_porkchop", "Cooked Pork Chop", chop, 2, 8),
        ("mutton", "Raw Mutton", "cooked_mutton", "Cooked Mutton", rack, 2, 6),
        ("chicken", "Raw Chicken", "cooked_chicken", "Roast Chicken", drumstick, 2, 6),
        ("rabbit", "Raw Rabbit", "cooked_rabbit", "Cooked Rabbit", haunch, 2, 5),
    ):
        add(raw_id, raw_name, "Meat", (lambda f=fn: f(False)), e_raw, "Light", cooks=cooked_name, effect="May cause Queasy" if raw_id == "chicken" else "")
        add(cooked_id, cooked_name, "Meat", (lambda f=fn: f(True)), e_cooked, "Feast" if e_cooked >= 8 else "Meal")
    add("cod", "Raw Cod", "Fish", lambda: fish("#b8a888"), 2, "Light", cooks="Cooked Cod")
    add("cooked_cod", "Cooked Cod", "Fish", lambda: fish("#b8a888", cooked=True), 5, "Meal")
    add("salmon", "Raw Salmon", "Fish", lambda: fish("#d0705a"), 2, "Light", cooks="Cooked Salmon")
    add("cooked_salmon", "Cooked Salmon", "Fish", lambda: fish("#d0705a", cooked=True), 6, "Meal")
    add("tropical_fish", "Tropical Fish", "Fish", lambda: fish("#e8903a", stripes="#f2ece0"), 1, "Snack")
    add("pufferfish", "Pufferfish", "Fish", pufferfish, 1, "Snack", effect="Poison")
    add("rotten_flesh", "Spoiled Meat", "Meat", spoiled_meat, 2, "Light", effect="May cause Queasy")
    add("spider_eye", "Spider Eye", "Meat", spider_eye, 1, "Snack", effect="May cause Poison")
    add("bread", "Bread", "Baked", bread, 5, "Meal")
    add("cookie", "Cookie", "Baked", cookie, 2, "Snack")
    add("pumpkin_pie", "Pumpkin Pie", "Baked", pie, 7, "Feast")
    add("bowl", "Bowl", "Meals", bowl, 0, "Container")
    add("mushroom_stew", "Mushroom Stew", "Meals", lambda: bowl("mushroom"), 7, "Feast")
    add("rabbit_stew", "Rabbit Stew", "Meals", lambda: bowl("rabbit"), 9, "Feast")
    add("beetroot_soup", "Beetroot Soup", "Meals", lambda: bowl("beetroot"), 7, "Feast")
    add("suspicious_stew", "Mystery Stew", "Meals", lambda: bowl("mystery"), 6, "Meal", effect="Random effect")
    add("egg", "Egg", "Eggs", egg, 0, "Ingredient")
    add("brown_egg", "Brown Egg", "Eggs", lambda: egg("#d8b088", "#a87a4a"), 0, "Ingredient")
    add("blue_egg", "Blue Egg", "Eggs", lambda: egg("#a9cfd8", "#6a9aaa"), 0, "Ingredient")
    add("glass_bottle", "Glass Bottle", "Drinks", bottle, 0, "Container")
    add("honey_bottle", "Honey Bottle", "Drinks", lambda: bottle(True), 4, "Light", effect="Cures Poison")
    return rows


FOOD_EXCLUDED = {
    "chorus_fruit": "Minecraft-only concept",
    "glow_berries": "Minecraft-only concept",
    "enchanted_golden_apple": "Minecraft-only concept (enchanting)",
    "sniffer_egg": "Minecraft-only concept",
    "dragon_egg": "Minecraft-only concept",
    "turtle_egg": "Already in the Blocks sheet",
    "cake": "Already in the Blocks sheet",
}
