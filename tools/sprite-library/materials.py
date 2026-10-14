"""Sōzō block materials: ink-palette colours plus the brush pattern for each face."""

from __future__ import annotations

from dataclasses import dataclass

import patterns as pt
from geometry import shade, mix

# Dye colours, muted to sit on paper (Sōzō palette, not game-default primaries).
DYES = {
    "white": "#f2ece0",
    "light_gray": "#b9b3a8",
    "gray": "#7d7870",
    "black": "#3a3633",
    "brown": "#8a6544",
    "red": "#c0533a",
    "orange": "#df8a45",
    "yellow": "#e8c45a",
    "lime": "#a8c262",
    "green": "#6f8f4e",
    "cyan": "#4f9a9a",
    "light_blue": "#8fbfd8",
    "blue": "#4a6a9a",
    "purple": "#86629e",
    "magenta": "#b4609e",
    "pink": "#e9a0b4",
}


@dataclass
class Mat:
    color: str
    top: object = None  # painter for the top face
    side: object = None  # painter for side faces
    side_color: str | None = None
    top_color: str | None = None
    opacity: float = 1.0
    name: str = ""


WOODS = {
    # wood: (planks, bark, leaves)
    "oak": ("#c9a57a", "#6e5440", "#78a37e"),
    "birch": ("#e3d3a8", "#ece6da", "#93b47c"),
    "spruce": ("#8f6a45", "#4e3a2a", "#4f7a5a"),
    "jungle": ("#c28a62", "#6a5634", "#5f9a4e"),
    "dark_oak": ("#6a4a32", "#3f2f22", "#4f6e3c"),
    "acacia": ("#c8724a", "#7a7266", "#8fa85a"),
    "mangrove": ("#8e4a42", "#5a4436", "#6b9a52"),
    "cherry": ("#e8b8b0", "#3e2a2e", "#f0b8c8"),
    "bamboo": ("#d9c26a", "#9aa852", "#9aa852"),
    "poplar": ("#d8c49a", "#cfc6b2", "#d8a648"),
}

STONES = {
    "stone": "#b8b4aa",
    "cobblestone": "#a9a59c",
    "mossy_cobblestone": "#a9a59c",
    "smooth_stone": "#c4c0b6",
    "stone_bricks": "#b0aca2",
    "shale": "#5f6068",
    "granite": "#c08a72",
    "diorite": "#e2ddd4",
    "andesite": "#9c9a94",
    "tuff": "#8a8a7c",
    "calcite": "#eeeae2",
    "cinnabar": "#b8463a",
    "sulfur": "#e2cc5a",
    "dripstone": "#a68a72",
    "sandstone": "#e6d6b0",
    "red_sandstone": "#d08a52",
    "basalt": "#56555a",
    "obsidian": "#2e2838",
    "bedrock": "#55534f",
    "quartz": "#efe9e0",
    "brick": "#c0533a",
    "mud_brick": "#a8866a",
    "clay": "#a9adb8",
    "terracotta": "#b8704e",
}

GEMS = {
    "coal": "#3a3633",
    "iron": "#d8b49a",
    "copper": "#d8824a",
    "gold": "#e8c45a",
    "lapis": "#3d5a9e",
    "diamond": "#7fd6d6",
    "emerald": "#4fb46a",
    "amethyst": "#9a72c8",
}

METAL_BLOCKS = {
    "iron": "#d8d4cc",
    "gold": "#efc85a",
    "diamond": "#8fdcd8",
    "emerald": "#5fbf72",
    "lapis": "#3d5a9e",
    "coal": "#3a3633",
    "copper": "#d8824a",
}

COPPER_STAGES = {
    "": "#d8824a",
    "exposed": "#b98a6a",
    "weathered": "#7fa88a",
    "oxidized": "#5fb0a0",
}


def wood_mat(wood: str, kind: str) -> Mat:
    planks, bark, _ = WOODS[wood]
    if kind == "planks":
        return Mat(planks, pt.planks(), pt.planks())
    if kind == "log":
        return Mat(planks, pt.log_top(bark, shade(planks, 0.8)), pt.log_side(bark), side_color=bark)
    if kind == "wood":
        return Mat(bark, pt.log_side(bark), pt.log_side(bark))
    if kind == "stripped_log":
        return Mat(planks, pt.log_top(shade(planks, 0.85), shade(planks, 0.78)), pt.log_side(shade(planks, 1.1)), side_color=shade(planks, 0.95))
    if kind == "stripped_wood":
        return Mat(shade(planks, 0.95), pt.log_side(shade(planks, 1.1)), pt.log_side(shade(planks, 1.1)))
    if kind == "leaves":
        _, _, lf = WOODS[wood]
        return Mat(lf, pt.leaves(shade(lf, 0.78)), pt.leaves(shade(lf, 0.78)))
    raise KeyError(kind)


def stone_mat(name: str, variant: str = "") -> Mat:
    base = STONES[name]
    if variant == "polished":
        return Mat(shade(base, 1.04), pt.polished(), pt.polished())
    if variant in ("bricks", "brick"):
        if name == "brick":
            return Mat(base, pt.bricks(), pt.bricks())
        return Mat(base, pt._stone_bricks(0.72), pt._stone_bricks(0.72))
    if variant == "tiles":
        return Mat(base, pt.tiles(8), pt.tiles(8))
    if variant == "chiseled":
        return Mat(base, pt.chiseled("diamond"), pt.chiseled("diamond"))
    if variant == "cracked":
        return Mat(base, pt.combine(pt._stone_bricks(0.72), pt.cracked()), pt.combine(pt._stone_bricks(0.72), pt.cracked()))
    if variant == "mossy_bricks":
        m = pt.combine(pt._stone_bricks(0.72), pt.mossy())
        return Mat(base, m, m)
    if variant == "mossy":
        m = pt.combine(pt.cobble(), pt.mossy())
        return Mat(base, m, m)
    if variant == "cobbled":
        return Mat(base, pt.cobble(), pt.cobble())
    if variant == "smooth":
        return Mat(shade(base, 1.06), None, None)
    if variant == "cut":
        return Mat(base, pt.tiles(8), pt.bands(8, 0.85))
    if variant == "pillar":
        return Mat(base, pt.polished(), pt.pillar())
    if name in ("sandstone", "red_sandstone"):
        return Mat(base, pt.speckle(6, 0.6), pt.bands(4, 0.9))
    if name == "basalt":
        return Mat(base, pt.speckle(8, 0.7), pt.strands(0.85))
    if name in ("granite", "diorite", "andesite", "tuff", "calcite", "shale", "cinnabar", "sulfur"):
        return Mat(base, pt.speckle(14, 0.8), pt.speckle(14, 0.8))
    if name == "dripstone":
        return Mat(base, pt.bands(3, 0.88), pt.bands(3, 0.88))
    if name == "bedrock":
        return Mat(base, pt.cobble(), pt.cobble())
    if name == "obsidian":
        return Mat(base, pt.speckle(6, 1.2, ["#4a3a5e", "#1e1a26"]), pt.speckle(6, 1.2, ["#4a3a5e", "#1e1a26"]))
    if name == "clay":
        return Mat(base, pt.speckle(4, 1.0), pt.speckle(4, 1.0))
    return Mat(base, pt.speckle(5, 0.8), pt.speckle(5, 0.8))


def dyed(color: str, kind: str) -> Mat:
    c = DYES[color]
    if kind == "wool":
        return Mat(c, pt.wool(), pt.wool())
    if kind == "concrete":
        return Mat(c)
    if kind == "concrete_powder":
        return Mat(shade(c, 1.08), pt.speckle(18, 0.6), pt.speckle(18, 0.6))
    if kind == "terracotta":
        t = mix(c, STONES["terracotta"], 0.45)
        return Mat(t, pt.speckle(3, 0.6), pt.speckle(3, 0.6))
    if kind == "glazed_terracotta":
        return Mat(c, pt.glazed(shade(c, 0.6) if color != "black" else "#b9b3a8"), pt.glazed(shade(c, 0.6) if color != "black" else "#b9b3a8"))
    if kind == "stained_glass":
        return Mat(c, pt.glass(shade(c, 0.8)), pt.glass(shade(c, 0.8)), opacity=0.55)
    raise KeyError(kind)


_ = mix
