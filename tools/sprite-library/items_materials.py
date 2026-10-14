"""Batch 1 item sprites: crafting materials, drawn to match the block sprites.

Every item uses the same recipe as the blocks: a bold ink silhouette, faces in three toon tones
(light 1.0 / mid 0.86 / dark 0.7, with a 1.2 highlight), thinner ink lines on inner edges, and a
small specular glint on shiny things.
"""

from __future__ import annotations

import math

from geometry import INK, shade
from materials import DYES

LIGHT, MID, DARK, HI = 1.0, 0.86, 0.7, 1.22
OUT = 5.2  # silhouette stroke
EDGE = 1.6  # inner edge stroke


def P(points) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def poly(points, fill, edge=True) -> str:
    e = f' stroke="{INK}" stroke-width="{EDGE}" stroke-linejoin="round" stroke-opacity="0.75"' if edge else ""
    return f'<polygon points="{P(points)}" fill="{fill}"{e}/>'


def path(d, fill, edge=True) -> str:
    e = f' stroke="{INK}" stroke-width="{EDGE}" stroke-linejoin="round" stroke-opacity="0.75"' if edge else ""
    return f'<path d="{d}" fill="{fill}"{e}/>'


def silhouette(shape: str) -> str:
    """A shape (any SVG element string) drawn as a thick ink outline underneath everything."""
    return f'<g fill="{INK}" stroke="{INK}" stroke-width="{OUT * 2}" stroke-linejoin="round" stroke-linecap="round">{shape}</g>'


def glint(x, y, s=5) -> str:
    return (
        f'<path d="M{x} {y-s} Q{x} {y} {x+s} {y} Q{x} {y} {x} {y+s} Q{x} {y} {x-s} {y} Q{x} {y} {x} {y-s}Z" fill="#ffffff"/>'
    )


def faceted(outline_pts, facets, color) -> str:
    """outline_pts: silhouette polygon. facets: list of (points, tone)."""
    out = silhouette(f'<polygon points="{P(outline_pts)}"/>')
    out += f'<polygon points="{P(outline_pts)}" fill="{shade(color, MID)}"/>'
    for pts, k in facets:
        out += poly(pts, shade(color, k))
    return out


# --- metals -------------------------------------------------------------------------------------


def ingot(c: str) -> str:
    # A trapezoid bar in iso: top face, front face, right end.
    top = [(28, 36), (70, 28), (84, 42), (42, 50)]
    front = [(42, 50), (84, 42), (80, 64), (36, 74)]
    left = [(28, 36), (42, 50), (36, 74), (18, 56)]
    sil = [(28, 36), (70, 28), (84, 42), (80, 64), (36, 74), (18, 56)]
    out = silhouette(f'<polygon points="{P(sil)}"/>')
    out += poly(left, shade(c, MID)) + poly(front, shade(c, DARK)) + poly(top, shade(c, LIGHT))
    out += poly([(36, 38), (64, 33), (70, 39), (42, 44)], shade(c, HI), edge=False)  # stamped face
    out += f'<path d="M34 41 L60 36" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/>'
    return out + glint(72, 34, 4)


def nugget(c: str) -> str:
    out = ""
    for cx, cy, r in ((40, 60, 17), (62, 54, 15), (52, 38, 12)):
        out += silhouette(f'<circle cx="{cx}" cy="{cy}" r="{r}"/>')
    for cx, cy, r in ((40, 60, 17), (62, 54, 15), (52, 38, 12)):
        out += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{shade(c, DARK)}" stroke="{INK}" stroke-width="{EDGE}" stroke-opacity="0.75"/>'
        out += f'<circle cx="{cx - r*0.18:.1f}" cy="{cy - r*0.18:.1f}" r="{r*0.78:.1f}" fill="{shade(c, LIGHT)}"/>'
        out += f'<circle cx="{cx - r*0.4:.1f}" cy="{cy - r*0.4:.1f}" r="{r*0.28:.1f}" fill="{shade(c, HI)}"/>'
    return out + glint(46, 32, 4)


def raw(c: str, host="#8f8a80") -> str:
    sil = [(16, 58), (24, 30), (50, 18), (78, 28), (86, 56), (68, 82), (34, 84)]
    facets = [
        ([(24, 30), (50, 18), (78, 28), (54, 42)], LIGHT),
        ([(16, 58), (24, 30), (54, 42), (40, 62)], MID),
        ([(54, 42), (78, 28), (86, 56), (64, 60)], DARK),
        ([(40, 62), (54, 42), (64, 60), (68, 82), (34, 84)], 0.78),
    ]
    out = faceted(sil, facets, c)
    for x, y, r in ((40, 30, 4), (66, 44, 3.5), (30, 54, 3), (52, 70, 4)):
        out += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{shade(c, 1.35)}" stroke="{INK}" stroke-width="1.2" stroke-opacity="0.6"/>'
    return out


# --- gems ---------------------------------------------------------------------------------------


def diamond(c: str) -> str:
    sil = [(26, 22), (74, 22), (92, 42), (50, 92), (8, 42)]
    facets = [
        ([(26, 22), (74, 22), (64, 42), (36, 42)], HI),
        ([(8, 42), (26, 22), (36, 42)], LIGHT),
        ([(74, 22), (92, 42), (64, 42)], MID),
        ([(8, 42), (36, 42), (50, 92)], LIGHT),
        ([(36, 42), (64, 42), (50, 92)], MID),
        ([(64, 42), (92, 42), (50, 92)], DARK),
    ]
    return faceted(sil, facets, c) + glint(40, 30, 6)


def emerald(c: str) -> str:
    sil = [(50, 6), (78, 24), (78, 76), (50, 94), (22, 76), (22, 24)]
    facets = [
        ([(50, 6), (78, 24), (64, 32), (50, 22)], LIGHT),
        ([(22, 24), (50, 6), (50, 22), (36, 32)], HI),
        ([(22, 24), (36, 32), (36, 68), (22, 76)], LIGHT),
        ([(78, 24), (78, 76), (64, 68), (64, 32)], DARK),
        ([(36, 32), (50, 22), (64, 32), (64, 68), (50, 78), (36, 68)], MID),
        ([(22, 76), (36, 68), (50, 78), (50, 94)], MID),
        ([(50, 78), (64, 68), (78, 76), (50, 94)], DARK),
    ]
    return faceted(sil, facets, c) + glint(42, 40, 5)


def shard(c: str) -> str:
    sil = [(58, 6), (76, 38), (54, 94), (28, 52)]
    facets = [([(58, 6), (54, 94), (28, 52)], LIGHT), ([(58, 6), (76, 38), (54, 94)], DARK), ([(58, 6), (46, 34), (40, 56), (28, 52)], HI)]
    return faceted(sil, facets, c) + glint(48, 30, 4)


def quartz(c: str) -> str:
    sil = [(50, 4), (66, 22), (64, 90), (36, 90), (34, 22)]
    facets = [([(50, 4), (66, 22), (50, 26)], MID), ([(50, 4), (50, 26), (34, 22)], HI), ([(34, 22), (50, 26), (50, 90), (36, 90)], LIGHT), ([(50, 26), (66, 22), (64, 90), (50, 90)], 0.8)]
    return faceted(sil, facets, c) + glint(42, 34, 4)


def lapis(c: str) -> str:
    sil = [(18, 54), (28, 28), (54, 20), (80, 32), (84, 60), (62, 82), (32, 80)]
    facets = [
        ([(28, 28), (54, 20), (80, 32), (52, 44)], LIGHT),
        ([(18, 54), (28, 28), (52, 44), (42, 62)], MID),
        ([(52, 44), (80, 32), (84, 60), (62, 62)], DARK),
        ([(42, 62), (52, 44), (62, 62), (62, 82), (32, 80)], 0.78),
    ]
    out = faceted(sil, facets, c)
    for x, y in ((40, 34), (64, 40), (32, 58), (54, 70), (70, 56)):
        out += f'<circle cx="{x}" cy="{y}" r="2.6" fill="#e8c45a"/>'
    return out


# --- fuel ---------------------------------------------------------------------------------------


def coal(c="#3a3633", char=False) -> str:
    sil = [(18, 60), (22, 34), (46, 20), (76, 26), (86, 54), (70, 80), (36, 82)]
    facets = [
        ([(22, 34), (46, 20), (76, 26), (56, 44)], 1.55),
        ([(18, 60), (22, 34), (56, 44), (44, 62)], 1.25),
        ([(56, 44), (76, 26), (86, 54), (64, 62)], 0.95),
        ([(44, 62), (56, 44), (64, 62), (70, 80), (36, 82)], 1.1),
    ]
    out = faceted(sil, facets, c)
    if char:
        out += "".join(f'<path d="M{x} 30 L{x-6} 74" stroke="{INK}" stroke-width="1.6" stroke-opacity="0.6"/>' for x in (42, 58, 72))
    return out + glint(40, 30, 4)


# --- organic ------------------------------------------------------------------------------------


def stick(c="#c9a57a") -> str:
    body = '<rect x="44" y="6" width="13" height="88" rx="5" transform="rotate(40 50 50)"/>'
    out = silhouette(body)
    out += f'<g transform="rotate(40 50 50)"><rect x="44" y="6" width="13" height="88" rx="5" fill="{shade(c, MID)}"/>'
    out += f'<rect x="44" y="6" width="6" height="88" rx="3" fill="{shade(c, LIGHT)}"/>'
    out += f'<rect x="46" y="10" width="2" height="80" rx="1" fill="{shade(c, HI)}"/>'
    out += f'<ellipse cx="53" cy="36" rx="3" ry="4" fill="{shade(c, DARK)}"/><ellipse cx="49" cy="66" rx="2.5" ry="3.5" fill="{shade(c, DARK)}"/>'
    out += f'<path d="M57 26 l7 -6" stroke="{shade(c, MID)}" stroke-width="5" stroke-linecap="round"/></g>'
    return out


def string() -> str:
    # A wound skein of string.
    c = "#f2ece0"
    out = silhouette('<ellipse cx="50" cy="52" rx="34" ry="24"/>')
    out += f'<ellipse cx="50" cy="52" rx="34" ry="24" fill="{shade(c, MID)}"/>'
    out += f'<ellipse cx="46" cy="47" rx="27" ry="16" fill="{shade(c, LIGHT)}"/>'
    for k in range(-3, 4):
        out += f'<path d="M{50+k*8} 29 Q{44+k*8} 52 {50+k*8} 75" fill="none" stroke="{shade(c, 0.72)}" stroke-width="1.6"/>'
    out += f'<path d="M80 60 Q92 74 82 88" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
    out += f'<path d="M80 60 Q92 74 82 88" fill="none" stroke="{c}" stroke-width="3" stroke-linecap="round"/>'
    return out


def hide(c: str) -> str:
    d = "M20 18 Q50 28 80 18 Q74 50 86 84 Q50 72 14 84 Q26 50 20 18Z"
    out = silhouette(f'<path d="{d}"/>') + f'<path d="{d}" fill="{shade(c, MID)}"/>'
    out += f'<path d="M24 22 Q50 31 76 22 Q70 44 74 56 Q50 48 26 56 Q30 44 24 22Z" fill="{shade(c, LIGHT)}"/>'
    out += f'<path d="M30 70 Q50 62 72 70" fill="none" stroke="{shade(c, DARK)}" stroke-width="3"/>'
    out += f'<path d="{d}" fill="none" stroke="{shade(c, 1.35)}" stroke-width="1.6" stroke-dasharray="4 4" transform="translate(50 52) scale(0.84) translate(-50 -52)"/>'
    return out


def feather() -> str:
    c = "#f2ece0"
    d = "M82 8 Q34 18 22 74 L30 84 Q80 66 82 8Z"
    out = silhouette(f'<path d="{d}"/>') + f'<path d="{d}" fill="{shade(c, MID)}"/>'
    out += f'<path d="M82 8 Q40 22 26 76 Q50 40 82 8Z" fill="{shade(c, LIGHT)}"/>'
    for t in (0.2, 0.35, 0.5, 0.65, 0.8):
        x, y = 82 - 60 * t, 8 + 78 * t
        out += f'<path d="M{x:.1f} {y:.1f} l-12 -2 M{x:.1f} {y:.1f} l4 10" stroke="{shade(c, 0.72)}" stroke-width="1.4"/>'
    out += f'<path d="M84 6 L14 94" stroke="{INK}" stroke-width="5" stroke-linecap="round"/><path d="M84 6 L14 94" stroke="#b9b3a8" stroke-width="2.2" stroke-linecap="round"/>'
    return out


def bone() -> str:
    c = "#ece6da"
    shape = '<rect x="43" y="20" width="14" height="60" rx="6" transform="rotate(40 50 50)"/>' + "".join(
        f'<circle cx="{x}" cy="{y}" r="10"/>' for x, y in ((22, 68), (32, 82), (68, 18), (80, 30))
    )
    out = silhouette(shape)
    out += f'<g fill="{shade(c, MID)}">{shape}</g>'
    out += f'<g transform="rotate(40 50 50)"><rect x="43" y="20" width="7" height="60" rx="3" fill="{shade(c, LIGHT)}"/></g>'
    for x, y in ((22, 68), (32, 82), (68, 18), (80, 30)):
        out += f'<circle cx="{x-2}" cy="{y-2}" r="6.5" fill="{shade(c, LIGHT)}"/><circle cx="{x-4}" cy="{y-4}" r="2.5" fill="#ffffff"/>'
    return out


def mound(c: str, grains=None) -> str:
    d = "M12 78 Q30 30 50 28 Q70 30 88 78 Q50 90 12 78Z"
    out = silhouette(f'<path d="{d}"/>') + f'<path d="{d}" fill="{shade(c, DARK)}"/>'
    out += f'<path d="M12 78 Q30 30 50 28 Q58 30 62 40 Q46 56 44 84 Q24 84 12 78Z" fill="{shade(c, LIGHT)}"/>'
    out += f'<path d="M50 28 Q62 30 66 44 Q56 56 56 86 Q50 87 44 86 Q44 56 62 40 Q58 30 50 28Z" fill="{shade(c, MID)}"/>'
    for x, y in grains or ((36, 60), (52, 50), (64, 66), (46, 72), (30, 74), (72, 76)):
        out += f'<circle cx="{x}" cy="{y}" r="2.4" fill="{shade(c, 0.6)}"/>'
    return out + f'<ellipse cx="38" cy="46" rx="5" ry="3" fill="{shade(c, HI)}"/>'


def sphere(c: str, glossy=True) -> str:
    out = silhouette('<circle cx="50" cy="54" r="31"/>')
    out += f'<circle cx="50" cy="54" r="31" fill="{shade(c, DARK)}"/>'
    out += f'<circle cx="45" cy="49" r="26" fill="{shade(c, MID)}"/>'
    out += f'<circle cx="41" cy="45" r="18" fill="{shade(c, LIGHT)}"/>'
    if glossy:
        out += f'<ellipse cx="38" cy="40" rx="8" ry="5" fill="{shade(c, 1.45)}" transform="rotate(-30 38 40)"/>' + glint(62, 36, 4)
    return out


def brick() -> str:
    c = "#c0533a"
    top = [(14, 46), (60, 30), (88, 42), (42, 58)]
    left = [(14, 46), (42, 58), (42, 80), (14, 68)]
    right = [(42, 58), (88, 42), (88, 64), (42, 80)]
    out = silhouette(f'<polygon points="{P([(14, 46), (60, 30), (88, 42), (88, 64), (42, 80), (14, 68)])}"/>')
    out += poly(left, shade(c, MID)) + poly(right, shade(c, DARK)) + poly(top, shade(c, LIGHT))
    out += "".join(f'<circle cx="{x}" cy="{y}" r="1.6" fill="{shade(c, 0.6)}"/>' for x, y in ((30, 46), (52, 40), (62, 48), (70, 58), (26, 62)))
    return out


def paper() -> str:
    c = "#f6f1e6"
    d = "M22 10 H68 L80 22 V90 H22Z"
    out = silhouette(f'<path d="{d}"/>') + f'<path d="{d}" fill="{shade(c, LIGHT)}"/>'
    out += f'<path d="M22 70 H80 V90 H22Z" fill="{shade(c, 0.93)}"/>'
    out += f'<path d="M68 10 V22 H80Z" fill="{shade(c, DARK)}" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += "".join(f'<rect x="30" y="{y}" width="{w}" height="3" rx="1.5" fill="#b9b3a8"/>' for y, w in ((32, 40), (42, 34), (52, 40), (62, 28)))
    return out


def book(c="#8a3e2e") -> str:
    cover_top = [(18, 30), (62, 16), (86, 28), (42, 42)]
    pages = [(42, 42), (86, 28), (86, 40), (42, 54)]
    spine = [(18, 30), (42, 42), (42, 80), (18, 68)]
    front = [(42, 54), (86, 40), (86, 68), (42, 80)]
    sil = [(18, 30), (62, 16), (86, 28), (86, 68), (42, 80), (18, 68)]
    out = silhouette(f'<polygon points="{P(sil)}"/>')
    out += poly(spine, shade(c, MID)) + poly(front, shade("#f6f1e6", 0.9)) + poly(pages, shade("#f6f1e6", 0.8)) + poly(cover_top, shade(c, LIGHT))
    out += "".join(f'<path d="M44 {58+k*6} L84 {44+k*6}" stroke="#d9d0bc" stroke-width="1.4"/>' for k in range(3))
    out += poly([(30, 30), (54, 22), (60, 26), (36, 34)], "#e8c45a")
    out += f'<path d="M24 40 L24 64" stroke="{shade(c, 1.3)}" stroke-width="2.5"/>'
    out += poly([(68, 44), (74, 42), (74, 58), (71, 54), (68, 60)], "#c0533a")
    return out


def ink_sac() -> str:
    c = "#2e3448"
    d = "M50 12 Q82 30 78 62 Q74 90 50 90 Q26 90 22 62 Q18 30 50 12Z"
    out = silhouette(f'<path d="{d}"/>') + f'<path d="{d}" fill="{shade(c, 1.25)}"/>'
    out += f'<path d="M50 12 Q30 30 30 60 Q32 84 50 88 Q26 90 22 62 Q18 30 50 12Z" fill="{shade(c, 1.6)}"/>'
    out += f'<path d="M50 70 Q66 70 70 56 Q74 84 50 88 Q40 88 36 80 Q44 74 50 70Z" fill="{c}"/>'
    return out + f'<ellipse cx="38" cy="38" rx="6" ry="9" fill="{shade(c, 2.4)}" transform="rotate(20 38 38)"/>' + glint(64, 30, 3.5)


def honeycomb() -> str:
    c = "#e8b04a"
    cells = ((40, 32), (58, 32), (31, 48), (49, 48), (67, 48), (40, 64), (58, 64))

    def hexpts(x, y, r=10):
        return [(x + r * math.cos(math.radians(a)), y + r * math.sin(math.radians(a))) for a in range(-90, 270, 60)]

    out = silhouette("".join(f'<polygon points="{P(hexpts(x, y))}"/>' for x, y in cells))
    for x, y in cells:
        out += poly(hexpts(x, y), shade(c, LIGHT))
        out += poly(hexpts(x + 1, y + 1, 6), shade(c, DARK), edge=False)
    out += f'<path d="M58 74 Q58 86 54 90 Q50 86 52 74Z" fill="{shade(c, 0.9)}" stroke="{INK}" stroke-width="{EDGE}"/>'
    return out + glint(34, 26, 3.5)


def wheat() -> str:
    out = ""
    stalks = (-16, 0, 16)
    for ang in stalks:
        out += f'<g transform="rotate({ang} 50 90)">' + silhouette('<rect x="48" y="32" width="4" height="58"/>' + "".join(f'<ellipse cx="{50+(-4 if i%2 else 4)}" cy="{14+i*7}" rx="5" ry="7.5"/>' for i in range(4))) + "</g>"
    for ang in stalks:
        out += f'<g transform="rotate({ang} 50 90)"><rect x="48" y="32" width="4" height="58" fill="#c8a54a"/>'
        for i in range(4):
            x = 50 + (-4 if i % 2 else 4)
            y = 14 + i * 7
            out += f'<ellipse cx="{x}" cy="{y}" rx="5" ry="7.5" fill="#d9ae4a"/><ellipse cx="{x-1.5}" cy="{y-1.5}" rx="3" ry="5" fill="#f0cf6a"/>'
        out += "</g>"
    out += f'<rect x="38" y="64" width="24" height="7" rx="2" fill="#c0533a" stroke="{INK}" stroke-width="2.5"/>'
    return out


def sugar() -> str:
    out = mound("#fbf8f0", grains=())
    for x, y, s in ((36, 62, 7), (54, 54, 8), (62, 70, 6), (44, 74, 6)):
        out += poly([(x, y - s / 2), (x + s, y - s), (x + s, y), (x, y + s / 2)], "#e8e2d4")
        out += poly([(x - s, y - s), (x, y - s / 2), (x, y + s / 2), (x - s, y)], "#ffffff")
    return out


def dye(c: str) -> str:
    bowl_d = "M14 44 Q14 88 50 88 Q86 88 86 44Z"
    wood = "#b88a5a"
    out = silhouette(f'<path d="{bowl_d}"/><ellipse cx="50" cy="44" rx="36" ry="12"/>')
    out += f'<path d="{bowl_d}" fill="{shade(wood, MID)}"/>'
    out += f'<path d="M14 44 Q16 80 46 87 Q24 78 24 46Z" fill="{shade(wood, LIGHT)}"/>'
    out += f'<path d="M86 44 Q84 80 56 87 Q76 76 78 46Z" fill="{shade(wood, DARK)}"/>'
    out += f'<ellipse cx="50" cy="44" rx="36" ry="12" fill="{shade(wood, DARK)}" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += f'<ellipse cx="50" cy="45" rx="30" ry="9" fill="{shade(c, MID)}"/>'
    out += f'<ellipse cx="46" cy="43" rx="20" ry="5.5" fill="{shade(c, LIGHT)}"/>'
    out += f'<ellipse cx="40" cy="42" rx="6" ry="2" fill="{shade(c, 1.4)}"/>'
    return out


def flint() -> str:
    c = "#55515e"
    sil = [(50, 8), (82, 36), (72, 88), (30, 86), (18, 44)]
    facets = [([(50, 8), (82, 36), (56, 44)], 1.3), ([(50, 8), (56, 44), (34, 56), (18, 44)], 1.55), ([(56, 44), (82, 36), (72, 88)], 0.95), ([(18, 44), (34, 56), (30, 86)], 1.15), ([(34, 56), (56, 44), (72, 88), (30, 86)], 1.05)]
    return faceted(sil, facets, c) + glint(42, 28, 4)


C = {"iron": "#d8d2c8", "gold": "#efc85a", "copper": "#d8824a", "leather": "#a8683a"}

# reference id -> (Sōzō name, category, drawing)
MATERIALS = {
    "coal": ("Coal", "Minerals", lambda: coal()),
    "charcoal": ("Charcoal", "Minerals", lambda: coal("#4a3e36", True)),
    "raw_copper": ("Raw Copper", "Minerals", lambda: raw("#c8784a")),
    "copper_ingot": ("Copper Ingot", "Minerals", lambda: ingot(C["copper"])),
    "copper_nugget": ("Copper Nugget", "Minerals", lambda: nugget(C["copper"])),
    "raw_iron": ("Raw Iron", "Minerals", lambda: raw("#c8a890")),
    "iron_ingot": ("Iron Ingot", "Minerals", lambda: ingot(C["iron"])),
    "iron_nugget": ("Iron Nugget", "Minerals", lambda: nugget(C["iron"])),
    "raw_gold": ("Raw Gold", "Minerals", lambda: raw("#d8b04a")),
    "gold_ingot": ("Gold Ingot", "Minerals", lambda: ingot(C["gold"])),
    "gold_nugget": ("Gold Nugget", "Minerals", lambda: nugget(C["gold"])),
    "diamond": ("Diamond", "Minerals", lambda: diamond("#7fd6d6")),
    "emerald": ("Emerald", "Minerals", lambda: emerald("#4fb46a")),
    "lapis_lazuli": ("Lapis", "Minerals", lambda: lapis("#3d5a9e")),
    "quartz": ("Quartz", "Minerals", lambda: quartz("#efe9e0")),
    "amethyst_shard": ("Amethyst Shard", "Minerals", lambda: shard("#9a72c8")),
    "flint": ("Flint", "Minerals", lambda: flint()),
    "clay_ball": ("Clay Lump", "Crafting", lambda: sphere("#a9adb8", glossy=False)),
    "brick": ("Brick", "Crafting", lambda: brick()),
    "stick": ("Stick", "Crafting", lambda: stick()),
    "string": ("String", "Crafting", lambda: string()),
    "leather": ("Leather", "Crafting", lambda: hide(C["leather"])),
    "rabbit_hide": ("Rabbit Hide", "Crafting", lambda: hide("#c8a888")),
    "feather": ("Feather", "Crafting", lambda: feather()),
    "bone": ("Bone", "Crafting", lambda: bone()),
    "bone_meal": ("Bone Meal", "Crafting", lambda: mound("#ece6da")),
    "gunpowder": ("Blast Powder", "Crafting", lambda: mound("#6a6560")),
    "ink_sac": ("Ink Sac", "Crafting", lambda: ink_sac()),
    "slime_ball": ("Puff Gel", "Crafting", lambda: sphere("#c3a8f0")),
    "honeycomb": ("Honeycomb", "Crafting", lambda: honeycomb()),
    "paper": ("Paper", "Crafting", lambda: paper()),
    "book": ("Book", "Crafting", lambda: book()),
    "wheat": ("Wheat", "Farming", lambda: wheat()),
    "sugar": ("Sugar", "Farming", lambda: sugar()),
}
for _col, _hex in DYES.items():
    MATERIALS[f"{_col}_dye"] = (f"{_col.replace('_', ' ').title()} Dye", "Dyes", (lambda h=_hex: dye(h)))
