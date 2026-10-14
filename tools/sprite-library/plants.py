"""Plant sprites: flowers, grasses, saplings, mushrooms, coral, crops. Flat ink drawings."""

from __future__ import annotations

import math

from geometry import Rand, ink_group, shade

STEM = "#6f8f4e"
LEAF = "#7c9a5c"


def _leaf(x, y, ang, size=14, color=LEAF):
    return (
        f'<ellipse cx="{x}" cy="{y}" rx="{size}" ry="{size*0.42:.1f}" fill="{color}" '
        f'transform="rotate({ang} {x} {y})"/>'
    )


def _stem(x1=50, y1=92, x2=50, y2=36, color=STEM, w=5):
    return f'<path d="M{x1} {y1} Q{x1+4} {(y1+y2)/2} {x2} {y2}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round"/>'


def flower(petal: str, kind: str = "daisy", center: str = "#e8c45a", r: Rand | None = None) -> str:
    """Single flower on a stem. kinds: daisy, tulip, cluster, bell, cup, star, orchid, ball."""
    out = _leaf(38, 72, -30) + _leaf(62, 64, 30)
    cx, cy = 50, 32
    if kind == "daisy":
        petals = "".join(
            f'<ellipse cx="{cx+13*math.cos(a):.1f}" cy="{cy+13*math.sin(a):.1f}" rx="10" ry="5.5" '
            f'transform="rotate({math.degrees(a):.0f} {cx+13*math.cos(a):.1f} {cy+13*math.sin(a):.1f})" fill="{petal}"/>'
            for a in [i * math.pi / 4 for i in range(8)]
        )
        head = petals + f'<circle cx="{cx}" cy="{cy}" r="7.5" fill="{center}"/>'
    elif kind == "star":
        petals = "".join(
            f'<ellipse cx="{cx+11*math.cos(a):.1f}" cy="{cy+11*math.sin(a):.1f}" rx="11" ry="6.5" '
            f'transform="rotate({math.degrees(a):.0f} {cx+11*math.cos(a):.1f} {cy+11*math.sin(a):.1f})" fill="{petal}"/>'
            for a in [i * 2 * math.pi / 5 - math.pi / 2 for i in range(5)]
        )
        head = petals + f'<circle cx="{cx}" cy="{cy}" r="5" fill="{center}"/>'
    elif kind == "tulip":
        head = f'<path d="M36 22 L43 30 L50 18 L57 30 L64 22 Q66 44 50 48 Q34 44 36 22Z" fill="{petal}"/>'
    elif kind == "cup":
        head = f'<path d="M34 22 Q50 30 66 22 Q66 46 50 48 Q34 46 34 22Z" fill="{petal}"/>' + f'<ellipse cx="50" cy="22" rx="16" ry="5" fill="{shade(petal, 0.8)}"/>'
    elif kind == "cluster":
        head = "".join(f'<circle cx="{x}" cy="{y}" r="7" fill="{petal}"/>' for x, y in ((50, 16), (40, 26), (60, 26), (46, 36), (56, 36), (50, 26)))
    elif kind == "ball":
        head = f'<circle cx="50" cy="28" r="17" fill="{petal}"/>' + "".join(f'<circle cx="{50+11*math.cos(a):.1f}" cy="{28+11*math.sin(a):.1f}" r="3" fill="{shade(petal, 1.25)}"/>' for a in [i * math.pi / 3 for i in range(6)])
    elif kind == "bell":
        out = _leaf(36, 74, -40, 18) + _leaf(64, 72, 40, 18)
        head = "".join(f'<path d="M{x-6} {y} Q{x} {y-12} {x+6} {y} Q{x+4} {y+4} {x} {y+2} Q{x-4} {y+4} {x-6} {y}Z" fill="{petal}"/>' for x, y in ((40, 34), (52, 26), (62, 40)))
        return ink_group(out + _stem(50, 92, 50, 22) + head)
    elif kind == "orchid":
        head = "".join(
            f'<ellipse cx="{cx+12*math.cos(a):.1f}" cy="{cy+12*math.sin(a):.1f}" rx="11" ry="7" '
            f'transform="rotate({math.degrees(a):.0f} {cx+12*math.cos(a):.1f} {cy+12*math.sin(a):.1f})" fill="{petal}"/>'
            for a in [i * 2 * math.pi / 3 - math.pi / 2 for i in range(3)]
        ) + f'<circle cx="{cx}" cy="{cy}" r="6" fill="{shade(petal, 0.7)}"/>'
    else:
        head = f'<circle cx="50" cy="30" r="14" fill="{petal}"/>'
    return ink_group(out + _stem() + head)


def tall_flower(petal: str, kind: str = "ball") -> str:
    out = _stem(50, 96, 50, 20)
    out += "".join(_leaf(50 + s * 12, y, s * 35, 13) for s, y in ((-1, 84), (1, 74), (-1, 62), (1, 52)))
    if kind == "sun":
        rays = "".join(
            f'<ellipse cx="{50+16*math.cos(a):.1f}" cy="{22+16*math.sin(a):.1f}" rx="9" ry="4.5" '
            f'transform="rotate({math.degrees(a):.0f} {50+16*math.cos(a):.1f} {22+16*math.sin(a):.1f})" fill="{petal}"/>'
            for a in [i * math.pi / 6 for i in range(12)]
        )
        head = rays + '<circle cx="50" cy="22" r="11" fill="#6e5440"/>'
    elif kind == "spike":
        head = "".join(f'<circle cx="{50+(-4 if i%2 else 4)}" cy="{14+i*7}" r="7" fill="{petal}"/>' for i in range(5))
    elif kind == "rose":
        head = "".join(f'<circle cx="{x}" cy="{y}" r="8" fill="{petal}"/>' for x, y in ((40, 22), (60, 26), (50, 38)))
    else:
        head = f'<circle cx="50" cy="20" r="16" fill="{petal}"/>' + f'<circle cx="44" cy="16" r="5" fill="{shade(petal, 1.25)}"/>'
    return ink_group(out + head)


def grass(color=LEAF, tall=False, dry=False) -> str:
    c = "#c8b46a" if dry else color
    h = 6 if tall else 34
    blades = ""
    for x, lean in ((26, -10), (38, -4), (50, 2), (62, 6), (74, 12)):
        top = h + abs(x - 50) * 0.5
        blades += f'<path d="M{x-4} 94 Q{x} {(94+top)/2} {x+lean} {top} Q{x+2} {(94+top)/2} {x+4} 94Z" fill="{c}"/>'
    return ink_group(blades, 3.2)


def fern(color="#5f8a4e", large=False) -> str:
    out = ""
    for ang in (-35, -12, 12, 35):
        x2 = 50 + 40 * math.sin(math.radians(ang))
        y2 = (8 if large else 26) + abs(ang) * 0.5
        out += f'<path d="M50 94 Q{(50+x2)/2} {(94+y2)/2 - 10} {x2:.1f} {y2:.1f}" fill="none" stroke="{color}" stroke-width="5" stroke-linecap="round"/>'
        for t in (0.35, 0.55, 0.75):
            px = 50 + (x2 - 50) * t
            py = 94 + (y2 - 94) * t - 6
            out += _leaf(px, py, ang - 50, 8, color) + _leaf(px, py, ang + 50, 8, color)
    return ink_group(out, 3)


def bush(color="#5f8a4e", dead=False, berries=None) -> str:
    if dead:
        out = "".join(f'<path d="M50 94 L{x} {y}" stroke="#8a6544" stroke-width="5" stroke-linecap="round" fill="none"/>' for x, y in ((24, 30), (40, 18), (60, 20), (78, 34), (50, 40)))
        return ink_group(out, 3)
    out = "".join(f'<circle cx="{x}" cy="{y}" r="{rr}" fill="{color}"/>' for x, y, rr in ((32, 62, 22), (68, 62, 22), (50, 44, 24), (50, 70, 22)))
    if berries:
        out += "".join(f'<circle cx="{x}" cy="{y}" r="5" fill="{berries}"/>' for x, y in ((36, 54), (60, 46), (64, 70), (44, 74)))
    return ink_group(out, 3.5)


def sapling(leaf: str, trunk="#6e5440") -> str:
    out = f'<rect x="46" y="54" width="8" height="40" rx="3" fill="{trunk}"/>'
    out += "".join(f'<circle cx="{x}" cy="{y}" r="{rr}" fill="{leaf}"/>' for x, y, rr in ((50, 30, 20), (34, 44, 14), (66, 44, 14)))
    return ink_group(out)


def mushroom(cap: str, spots=True) -> str:
    out = '<path d="M42 92 Q40 66 44 52 H56 Q60 66 58 92Z" fill="#ece6da"/>'
    out += f'<path d="M14 56 Q16 18 50 16 Q84 18 86 56 Z" fill="{cap}"/>'
    if spots:
        out += "".join(f'<circle cx="{x}" cy="{y}" r="{rr}" fill="#f2ece0"/>' for x, y, rr in ((36, 34, 5), (58, 28, 6), (70, 44, 4), (44, 48, 4)))
    return ink_group(out)


def shelf_mushroom() -> str:
    out = "".join(f'<path d="M18 {y} Q50 {y-18} 82 {y} Q50 {y+6} 18 {y}Z" fill="#c89a6a"/>' for y in (40, 62, 84))
    return ink_group(out)


def coral(color: str, kind: str) -> str:
    if kind == "tube":
        out = "".join(f'<rect x="{x}" y="{y}" width="12" height="{94-y}" rx="6" fill="{color}"/>' for x, y in ((26, 40), (44, 22), (62, 34)))
        out += "".join(f'<ellipse cx="{x+6}" cy="{y+3}" rx="4" ry="2" fill="{shade(color, 0.6)}"/>' for x, y in ((26, 40), (44, 22), (62, 34)))
    elif kind == "brain":
        out = f'<path d="M14 92 Q12 34 50 30 Q88 34 86 92Z" fill="{color}"/>'
        out += "".join(f'<path d="M{24+i*12} 88 q-6 -16 4 -30" fill="none" stroke="{shade(color, 0.7)}" stroke-width="2.5"/>' for i in range(5))
    elif kind == "bubble":
        out = "".join(f'<circle cx="{x}" cy="{y}" r="{rr}" fill="{color}"/>' for x, y, rr in ((32, 72, 16), (64, 70, 18), (48, 44, 16), (70, 38, 10), (28, 40, 10)))
    elif kind == "fire":
        out = f'<path d="M50 94 L50 54 L30 26 M50 62 L72 22 M50 72 L80 54 M50 78 L20 58" stroke="{color}" stroke-width="10" stroke-linecap="round" fill="none"/>'
        return ink_group(f'<path d="M50 94 L50 54 L30 26 M50 62 L72 22 M50 72 L80 54 M50 78 L20 58" stroke="#2a221d" stroke-width="16" stroke-linecap="round" fill="none"/>', 0) + f'<path d="M50 94 L50 54 L30 26 M50 62 L72 22 M50 72 L80 54 M50 78 L20 58" stroke="{color}" stroke-width="10" stroke-linecap="round" fill="none"/>'
    elif kind == "horn":
        out = f'<path d="M50 94 Q20 70 22 30 Q36 50 50 52 Q64 50 78 30 Q80 70 50 94Z" fill="{color}"/>'
    else:  # fan
        out = f'<path d="M50 94 L14 34 Q50 4 86 34 Z" fill="{color}"/>'
        out += "".join(f'<path d="M50 92 L{x} 26" stroke="{shade(color, 0.7)}" stroke-width="2.5"/>' for x in (26, 40, 60, 74))
    return ink_group(out)


def kelp(color="#5f8a4e") -> str:
    out = '<path d="M46 96 Q30 70 50 50 Q66 30 50 6 L56 6 Q72 30 56 52 Q38 72 54 96Z" fill="%s"/>' % color
    out += _leaf(38, 62, -40, 12, shade(color, 1.1)) + _leaf(64, 34, 40, 12, shade(color, 1.1))
    return ink_group(out)


def seagrass(color="#6a9a5a", tall=False) -> str:
    return grass(color, tall)


def vine(color="#5f8a4e") -> str:
    out = '<path d="M30 4 Q20 30 34 50 Q48 70 36 96" fill="none" stroke="%s" stroke-width="5"/>' % shade(color, 0.85)
    out += '<path d="M70 4 Q80 34 64 56 Q52 74 66 96" fill="none" stroke="%s" stroke-width="5"/>' % shade(color, 0.85)
    out += "".join(_leaf(x, y, a, 9, color) for x, y, a in ((24, 22, -30), (40, 44, 30), (30, 70, -20), (76, 24, 30), (60, 52, -30), (70, 80, 20)))
    return ink_group(out, 3)


def cactus() -> str:
    out = '<rect x="38" y="14" width="24" height="80" rx="11" fill="#6f9a5a"/>'
    out += '<path d="M38 56 H24 Q18 56 18 48 V34 H28 V46 H38Z" fill="#6f9a5a"/><path d="M62 46 H74 V28 H84 V44 Q84 56 74 56 H62Z" fill="#6f9a5a"/>'
    out += "".join(f'<rect x="{x}" y="{y}" width="2.5" height="6" fill="#f2ece0"/>' for x, y in ((44, 26), (54, 40), (46, 66), (55, 78)))
    return ink_group(out)


def cactus_flower() -> str:
    return flower("#e98fa8", "star", "#e8c45a")


def sugar_cane() -> str:
    out = "".join(f'<rect x="{x}" y="{y}" width="9" height="{96-y}" rx="3" fill="#9ac26a"/>' for x, y in ((30, 14), (46, 6), (62, 20)))
    out += "".join(f'<rect x="{x-1}" y="{y}" width="11" height="3" fill="#6f8f4e"/>' for x in (30, 46, 62) for y in (36, 60, 82))
    return ink_group(out)


def bamboo() -> str:
    out = '<rect x="42" y="6" width="16" height="90" rx="4" fill="#9aa852"/>'
    out += "".join(f'<rect x="40" y="{y}" width="20" height="4" fill="#7a8a3e"/>' for y in (28, 52, 76))
    out += _leaf(68, 22, 20, 14, "#8fb05a") + _leaf(32, 46, -20, 14, "#8fb05a")
    return ink_group(out)


def lily_pad() -> str:
    return ink_group('<path d="M50 50 L86 40 Q88 82 50 86 Q12 82 14 50 Q16 18 50 16 Q72 16 84 30 Z" fill="#5f8a4e"/>') + '<path d="M50 50 L28 32 M50 50 L30 70 M50 50 L60 78" stroke="#4a6e3c" stroke-width="2"/>'


def petals(color: str) -> str:
    out = "".join(
        f'<ellipse cx="{x}" cy="{y}" rx="9" ry="5" fill="{color}" transform="rotate({a} {x} {y})"/>'
        for x, y, a in ((30, 40, 20), (60, 34, -30), (44, 62, 60), (70, 66, 10), (24, 74, -40), (52, 84, 30))
    )
    return ink_group(_leaf(40, 52, 10, 10) + _leaf(66, 52, -20, 10) + out, 3)


def leaf_litter() -> str:
    cols = ["#c0533a", "#df8a45", "#e8c45a", "#8a6544"]
    out = "".join(_leaf(x, y, a, 10, cols[i % 4]) for i, (x, y, a) in enumerate(((28, 40, 20), (60, 32, -30), (44, 60, 60), (72, 62, 10), (26, 76, -40), (54, 82, 30))))
    return ink_group(out, 3)


def crop(kind: str) -> str:
    if kind == "wheat":
        out = ""
        for x in (28, 50, 72):
            out += _stem(x, 94, x, 22, "#c8a54a", 4)
            out += "".join(f'<ellipse cx="{x+(-3 if i%2 else 3)}" cy="{22+i*7}" rx="4" ry="6" fill="#e8c45a"/>' for i in range(4))
        return ink_group(out, 3)
    tops = {"carrots": "#df8a45", "potatoes": "#c8a46a", "beetroots": "#a8344a"}
    root = tops.get(kind, "#df8a45")
    out = ""
    for x in (32, 68):
        out += _leaf(x - 6, 40, -60, 16) + _leaf(x + 6, 40, 60, 16) + _leaf(x, 34, 0, 16)
        out += f'<ellipse cx="{x}" cy="78" rx="12" ry="{16 if kind=="carrots" else 12}" fill="{root}"/>'
    return ink_group(out, 3)


def cocoa() -> str:
    return ink_group('<path d="M50 16 Q72 26 72 56 Q70 88 50 90 Q30 88 28 56 Q28 26 50 16Z" fill="#a8683a"/><rect x="47" y="6" width="6" height="12" fill="#6f8f4e"/>') + '<path d="M50 24 V86" stroke="#7a4a2a" stroke-width="2.5"/>'


def azalea(flowering=False) -> str:
    out = '<rect x="44" y="60" width="12" height="34" fill="#6e5440"/>'
    out += '<path d="M10 62 Q8 22 50 18 Q92 22 90 62 Z" fill="#6f9a52"/>'
    if flowering:
        out += "".join(f'<circle cx="{x}" cy="{y}" r="5" fill="#d98ac8"/>' for x, y in ((28, 44), (50, 30), (70, 46), (40, 56), (62, 56)))
    return ink_group(out)


def roots(color="#6e5440") -> str:
    out = "".join(f'<path d="M{x} 4 Q{x+6} 40 {x-4} 70 Q{x-8} 84 {x+2} 96" fill="none" stroke="{color}" stroke-width="5" stroke-linecap="round"/>' for x in (28, 46, 64, 78))
    return ink_group(out, 3)


def sea_pickle() -> str:
    out = "".join(f'<rect x="{x}" y="{y}" width="14" height="{94-y}" rx="7" fill="#7a9a4e"/>' for x, y in ((28, 50), (46, 40), (64, 56)))
    out += "".join(f'<circle cx="{x+7}" cy="{y+4}" r="3" fill="#e8e070"/>' for x, y in ((28, 50), (46, 40), (64, 56)))
    return ink_group(out)


def firefly_bush() -> str:
    return bush("#4f7a4e") + "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="#f3e06a"/>' for x, y in ((20, 24), (78, 30), (60, 16), (30, 90)))
