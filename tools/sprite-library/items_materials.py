"""Batch 1 item sprites: crafting materials. Flat ink drawings in the 0–100 icon box."""

from __future__ import annotations

from geometry import ink_group, shade
from materials import DYES, GEMS

C = {
    "iron": "#d8d2c8",
    "gold": "#efc85a",
    "copper": "#d8824a",
    "wood": "#c9a57a",
    "bone": "#ece6da",
    "leather": "#a8683a",
    "paper": "#f6f1e6",
}


def ingot(c: str) -> str:
    return ink_group(
        f'<path d="M14 62 L30 38 H78 L90 62 L74 80 H22 Z" fill="{c}"/>'
        f'<path d="M30 38 H78 L90 62 H18 Z" fill="{shade(c, 1.15)}"/>'
        f'<path d="M34 44 H62" stroke="#ffffff" stroke-width="4" stroke-opacity="0.6"/>'
    )


def nugget(c: str) -> str:
    return ink_group(
        f'<path d="M26 60 Q24 38 46 34 Q70 30 76 52 Q80 72 56 76 Q30 78 26 60Z" fill="{c}"/>'
        f'<circle cx="62" cy="62" r="9" fill="{shade(c, 0.85)}"/><circle cx="42" cy="46" r="5" fill="{shade(c, 1.25)}"/>'
    )


def raw(c: str) -> str:
    return ink_group(
        f'<path d="M18 58 L28 30 L52 22 L76 32 L84 58 L66 80 L36 82 Z" fill="{shade(c, 0.9)}"/>'
        f'<path d="M30 40 L50 32 L60 50 L40 60Z" fill="{shade(c, 1.15)}"/><circle cx="66" cy="62" r="7" fill="{shade(c, 0.7)}"/>'
    )


def gem(c: str, cut="diamond") -> str:
    if cut == "emerald":
        body = f'<polygon points="50,8 76,26 76,74 50,92 24,74 24,26" fill="{c}"/><polygon points="50,20 64,30 64,70 50,80 36,70 36,30" fill="{shade(c, 1.2)}"/>'
    elif cut == "lapis":
        body = f'<path d="M20 56 Q22 28 50 24 Q80 26 80 56 Q76 82 50 82 Q22 80 20 56Z" fill="{c}"/>' + "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="#e8c45a"/>' for x, y in ((38, 44), (60, 40), (54, 64)))
    elif cut == "shard":
        body = f'<polygon points="56,6 74,40 52,94 30,54" fill="{c}"/><polygon points="56,6 52,94 30,54" fill="{shade(c, 1.25)}"/>'
    elif cut == "quartz":
        body = f'<polygon points="50,6 66,24 62,90 38,90 34,24" fill="{c}"/><polygon points="50,6 50,90 38,90 34,24" fill="{shade(c, 0.9)}"/>'
    else:
        body = f'<polygon points="28,22 72,22 90,42 50,92 10,42" fill="{c}"/><polygon points="28,22 72,22 62,42 38,42" fill="{shade(c, 1.25)}"/><polygon points="10,42 38,42 50,92" fill="{shade(c, 0.85)}"/>'
    return ink_group(body)


def coal(c="#3a3633", char=False) -> str:
    body = f'<path d="M18 62 L24 34 L50 22 L78 30 L86 58 L68 80 L34 82Z" fill="{c}"/>'
    body += f'<path d="M30 40 L48 32 L56 48 L38 56Z" fill="{shade(c, 1.6 if not char else 1.3)}"/>'
    if char:
        body += f'<path d="M24 60 H80" stroke="{shade(c, 0.7)}" stroke-width="3"/>'
    return ink_group(body)


def stick() -> str:
    return ink_group(f'<rect x="44" y="4" width="11" height="92" rx="4" fill="{C["wood"]}" transform="rotate(40 50 50)"/>')


def string() -> str:
    return (
        '<path d="M20 80 Q30 20 50 50 Q70 80 80 20" fill="none" stroke="#2a221d" stroke-width="9" stroke-linecap="round"/>'
        '<path d="M20 80 Q30 20 50 50 Q70 80 80 20" fill="none" stroke="#f2ece0" stroke-width="4" stroke-linecap="round"/>'
    )


def hide(c: str) -> str:
    return ink_group(f'<path d="M22 20 Q50 30 78 20 Q72 50 84 80 Q50 70 16 80 Q28 50 22 20Z" fill="{c}"/><path d="M34 40 Q50 46 66 40" stroke="{shade(c, 0.75)}" stroke-width="3" fill="none"/>')


def feather() -> str:
    return ink_group(
        '<path d="M80 10 Q30 22 22 78 L30 86 Q78 70 80 10Z" fill="#f2ece0"/>'
        '<path d="M80 10 L18 90" stroke="#b9b3a8" stroke-width="3"/>'
    )


def bone() -> str:
    c = C["bone"]
    return ink_group(
        f'<rect x="44" y="18" width="12" height="64" rx="5" fill="{c}" transform="rotate(40 50 50)"/>'
        + "".join(f'<circle cx="{x}" cy="{y}" r="9" fill="{c}"/>' for x, y in ((22, 70), (32, 82), (68, 18), (80, 30)))
    )


def powder(c: str) -> str:
    return ink_group(f'<path d="M14 76 Q50 20 86 76 Q50 88 14 76Z" fill="{c}"/>') + "".join(
        f'<circle cx="{x}" cy="{y}" r="2.6" fill="{shade(c, 0.7)}"/>' for x, y in ((40, 60), (56, 52), (62, 68), (46, 72))
    )


def ball(c: str, shine=True) -> str:
    out = f'<circle cx="50" cy="54" r="30" fill="{c}"/>'
    if shine:
        out += f'<circle cx="40" cy="44" r="8" fill="{shade(c, 1.35)}"/>'
    return ink_group(out)


def brick() -> str:
    return ink_group('<path d="M12 52 L34 34 H86 L86 58 L66 76 H12Z" fill="#c0533a"/><path d="M12 52 L34 34 H86 L66 52Z" fill="#d06a4e"/>')


def paper() -> str:
    return ink_group('<path d="M22 12 H70 L80 22 V88 H22Z" fill="#f6f1e6"/><path d="M70 12 V22 H80" fill="#e2d8c4"/>') + "".join(
        f'<rect x="30" y="{y}" width="40" height="3" rx="1.5" fill="#b9b3a8"/>' for y in (34, 46, 58, 70)
    )


def book(c="#8a3e2e") -> str:
    return ink_group(
        f'<rect x="16" y="14" width="64" height="74" rx="4" fill="{c}"/><rect x="74" y="18" width="10" height="66" fill="#f6f1e6"/>'
        f'<rect x="28" y="30" width="36" height="12" rx="2" fill="#e8c45a"/>'
    )


def ink_sac() -> str:
    return ink_group('<path d="M50 14 Q80 30 76 62 Q72 88 50 88 Q28 88 24 62 Q20 30 50 14Z" fill="#2e3448"/>') + '<circle cx="40" cy="46" r="6" fill="#5a6488"/>'


def honeycomb() -> str:
    cells = "".join(
        f'<polygon points="{x},{y-10} {x+9},{y-5} {x+9},{y+5} {x},{y+10} {x-9},{y+5} {x-9},{y-5}" fill="#e8b04a"/>'
        for x, y in ((40, 34), (58, 34), (31, 50), (49, 50), (67, 50), (40, 66), (58, 66))
    )
    return ink_group(cells, 3.5)


def wheat() -> str:
    out = ""
    for ang in (-18, 0, 18):
        out += f'<g transform="rotate({ang} 50 92)"><rect x="48" y="30" width="4" height="62" fill="#c8a54a"/>'
        out += "".join(f'<ellipse cx="{50+(-4 if i%2 else 4)}" cy="{16+i*8}" rx="4.5" ry="7" fill="#e8c45a"/>' for i in range(4))
        out += "</g>"
    return ink_group(out, 3)


def sugar() -> str:
    return ink_group('<path d="M16 76 Q50 26 84 76 Q50 88 16 76Z" fill="#fbf8f0"/>') + "".join(
        f'<rect x="{x}" y="{y}" width="4" height="4" fill="#d9d2c4"/>' for x, y in ((40, 60), (54, 52), (60, 68), (46, 70))
    )


def dye(c: str) -> str:
    return ink_group(
        f'<path d="M18 42 H82 Q82 86 50 86 Q18 86 18 42Z" fill="#c9a57a"/>'
        f'<ellipse cx="50" cy="42" rx="32" ry="10" fill="{c}"/><path d="M40 30 Q50 14 60 30" fill="none" stroke="{shade(c, 0.8)}" stroke-width="5"/>'
    )


# reference id -> (Sōzō name, category, drawing)
MATERIALS = {
    "coal": ("Coal", "Minerals", lambda: coal()),
    "charcoal": ("Charcoal", "Minerals", lambda: coal("#4a3e36", True)),
    "raw_copper": ("Raw Copper", "Minerals", lambda: raw(GEMS["copper"])),
    "copper_ingot": ("Copper Ingot", "Minerals", lambda: ingot(C["copper"])),
    "copper_nugget": ("Copper Nugget", "Minerals", lambda: nugget(C["copper"])),
    "raw_iron": ("Raw Iron", "Minerals", lambda: raw(GEMS["iron"])),
    "iron_ingot": ("Iron Ingot", "Minerals", lambda: ingot(C["iron"])),
    "iron_nugget": ("Iron Nugget", "Minerals", lambda: nugget(C["iron"])),
    "raw_gold": ("Raw Gold", "Minerals", lambda: raw(GEMS["gold"])),
    "gold_ingot": ("Gold Ingot", "Minerals", lambda: ingot(C["gold"])),
    "gold_nugget": ("Gold Nugget", "Minerals", lambda: nugget(C["gold"])),
    "diamond": ("Diamond", "Minerals", lambda: gem("#8fdcd8")),
    "emerald": ("Emerald", "Minerals", lambda: gem("#4fb46a", "emerald")),
    "lapis_lazuli": ("Lapis", "Minerals", lambda: gem("#3d5a9e", "lapis")),
    "quartz": ("Quartz", "Minerals", lambda: gem("#efe9e0", "quartz")),
    "amethyst_shard": ("Amethyst Shard", "Minerals", lambda: gem("#9a72c8", "shard")),
    "flint": ("Flint", "Minerals", lambda: ink_group('<polygon points="50,10 82,40 70,88 30,84 20,44" fill="#4a4652"/><polygon points="50,10 60,40 44,60 20,44" fill="#6c6878"/>')),
    "clay_ball": ("Clay Lump", "Crafting", lambda: ball("#a9adb8")),
    "brick": ("Brick", "Crafting", lambda: brick()),
    "stick": ("Stick", "Crafting", lambda: stick()),
    "string": ("String", "Crafting", lambda: string()),
    "leather": ("Leather", "Crafting", lambda: hide(C["leather"])),
    "rabbit_hide": ("Rabbit Hide", "Crafting", lambda: hide("#c8a888")),
    "feather": ("Feather", "Crafting", lambda: feather()),
    "bone": ("Bone", "Crafting", lambda: bone()),
    "bone_meal": ("Bone Meal", "Crafting", lambda: powder("#ece6da")),
    "gunpowder": ("Blast Powder", "Crafting", lambda: powder("#5a5652")),
    "ink_sac": ("Ink Sac", "Crafting", lambda: ink_sac()),
    "slime_ball": ("Puff Gel", "Crafting", lambda: ball("#c3a8f0")),
    "honeycomb": ("Honeycomb", "Crafting", lambda: honeycomb()),
    "paper": ("Paper", "Crafting", lambda: paper()),
    "book": ("Book", "Crafting", lambda: book()),
    "wheat": ("Wheat", "Farming", lambda: wheat()),
    "sugar": ("Sugar", "Farming", lambda: sugar()),
}
for _col, _hex in DYES.items():
    MATERIALS[f"{_col}_dye"] = (f"{_col.replace('_', ' ').title()} Dye", "Dyes", (lambda h=_hex: dye(h)))
