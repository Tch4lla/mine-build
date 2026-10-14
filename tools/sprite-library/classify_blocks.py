"""Map each block in the reference list to a Sōzō block (or exclude it).

Rules:
- Minecraft-only things (Nether, End, Redstone machinery, Sculk, Shulkers, Creepers, enchanting,
  technical blocks, etc.) are excluded.
- Placement states that are not separate things (wall signs, wall torches, potted plants,
  attached stems, waxed copper, infested stone, cake-with-candle) are folded away.
- Names that are distinctively Minecraft's get Sōzō names; generic words stay generic.
Every sprite is drawn fresh by this generator; nothing is taken from the reference images.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable

import materials as mt
import patterns as pt
import plants as pl
import shapes as sh
from geometry import Rand, shade

COLOURS = list(mt.DYES)
COLOUR_RE = re.compile(r"^(" + "|".join(sorted(COLOURS, key=len, reverse=True)) + r")_")
WOOD_RE = re.compile(r"^(" + "|".join(sorted(mt.WOODS, key=len, reverse=True)) + r")_")

EXCLUDE_RE = re.compile(
    r"nether|^end_|_end_|ender|purpur|chorus|redstone|repeater|comparator|observer|piston|dispenser|dropper|crafter|"
    r"daylight|tripwire|^target$|sculk|shulker|enchanting|beacon|conduit|respawn|lodestone|trial_spawner|^vault$|heavy_core|"
    r"crimson|warped|nylium|fungus|_roots$|weeping|twisting|shroomlight|glowstone|magma|soul|blackstone|crying|"
    r"ancient_debris|quartz_ore|gilded|prismarine|sea_lantern|froglight|dried_ghast|creaking|pale_|resin|eyeblossom|"
    r"wither|torchflower|pitcher|spore_blossom|glow_lichen|dripleaf|cave_vines|bubble_column|frosted|suspicious|"
    r"reinforced|copper_golem|copper_bulb|copper_chest|copper_torch|command|structure|jigsaw|barrier|^light$|test_|"
    r"spawner|dragon|creeper|piglin|zombie|player_|_head$|candle_cake|sniffer|petrified|infested|potted_|_wall_|"
    r"wall_torch|wall_sign|wall_banner|wall_fan|attached_|_stem$|_plant$|_crop$|^moving|^air$|cave_air|void_air|"
    r"^waxed_|budding|_bud$|potent_sulfur|sulfur_spike|nether_sprouts|portal|gateway|trapped_chest|jukebox|"
    r"chiseled_bookshelf|^fire$|_cauldron$|powder_snow_cauldron|chipped_anvil|damaged_anvil|wet_sponge|straw_bed|"
    r"golden_dandelion|red_shrub|"
    r"activator_rail|detector_rail|powered_rail|bamboo_sapling|kelp_plant|tall_seagrass|big_dripleaf_stem|"
    r"dead_.*coral|_coral_wall_fan|lava$|^water$|dirt_path|farmland|pointed_dripstone"
)
# Kept despite matching a broad pattern above.
KEEP = {"bush", "rose_bush", "dead_bush", "sweet_berry_bush", "firefly_bush", "water", "lava", "fire", "dirt_path", "farmland", "pointed_dripstone"}

# Distinctive names → Sōzō names (applied to whole display names, then to words).
RENAME_EXACT = {
    "Crafting Table": "Crafting Bench",
    "Cartography Table": "Map Table",
    "Fletching Table": "Fletcher's Bench",
    "Smithing Table": "Smithy Bench",
    "Stonecutter": "Stone Saw",
    "Brewing Stand": "Alchemy Stand",
    "Composter": "Compost Bin",
    "Smoker": "Smokehouse",
    "Note Block": "Chime Block",
    "TNT": "Blast Barrel",
    "Slime Block": "Puff Gel Block",
    "Dirt Path": "Trodden Path",
    "Hay Bale": "Hay Bundle",
    "Jack o'Lantern": "Lantern Gourd",
    "Carved Pumpkin": "Carved Gourd",
    "Pointed Dripstone": "Stalactite",
    "Skeleton Skull": "Skull",
    "Heavy Weighted Pressure Plate": "Iron Pressure Plate",
    "Light Weighted Pressure Plate": "Gold Pressure Plate",
    "Mycelium": "Fungal Soil",
    "Podzol": "Forest Floor",
    "Rooted Dirt": "Root Soil",
    "Mangrove Propagule": "Mangrove Sapling",
    "Lightning Rod": "Lightning Rod",
    "Blue Ice": "Glacier Ice",
    "Powder Snow": "Powder Snow",
    "Lily of the Valley": "Lily of the Valley",
    "Azure Bluet": "Bluet",
    "Oxeye Daisy": "Daisy",
    "Firefly Bush": "Firefly Bush",
    "Frogspawn": "Frogspawn",
    "Decorated Pot": "Painted Pot",
}
RENAME_WORD = [
    (r"\bDeepslate\b", "Shale"),
    (r"\bCobbled Shale\b", "Cobbled Shale"),
    (r"\bTerracotta\b", "Terracotta"),
    (r"\bLapis Lazuli\b", "Lapis"),
    (r"\bConcrete Powder\b", "Concrete Powder"),
]


def sozo_name(mc_name: str) -> str:
    n = RENAME_EXACT.get(mc_name, mc_name)
    for pat, rep in RENAME_WORD:
        n = re.sub(pat, rep, n)
    n = re.sub(r"^Block of (.+)$", r"\1 Block", n)
    n = re.sub(r" Stair$", " Stairs", n)
    if n.startswith("Exposed ") or n.startswith("Weathered ") or n.startswith("Oxidized "):
        n = n.replace("Exposed ", "Tarnished ").replace("Weathered ", "Patinated ").replace("Oxidized ", "Verdigris ")
    return n


def sozo_id(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower().replace("'", "")).strip("_")


@dataclass
class Entry:
    src_id: str
    name: str
    id: str
    category: str
    shape: str
    family: str
    variant: str
    draw: Callable[[], str]


# --- materials from block names ---------------------------------------------------------------

STONE_ALIASES = {"deepslate": "shale", "stone_brick": "stone_bricks", "mud": "mud_brick", "brick": "brick", "bricks": "brick"}
NATURAL_STONES = {"stone", "shale", "granite", "diorite", "andesite", "tuff", "cinnabar", "sulfur", "calcite", "sandstone", "red_sandstone"}


def stone_material(base: str):
    """Resolve names like 'polished_granite', 'deepslate_tile', 'cracked_stone_bricks' to a material."""
    b = base
    variant = ""
    for pre in ("polished_", "cobbled_", "smooth_", "cut_", "chiseled_", "cracked_", "mossy_"):
        if b.startswith(pre):
            variant = pre[:-1]
            b = b[len(pre):]
            break
    if b.endswith("_block"):
        b = b[: -len("_block")]
    suffix = ""
    for suf in ("_bricks", "_brick", "_tiles", "_tile", "_pillar"):
        if b.endswith(suf):
            suffix = suf.strip("_").rstrip("s")
            b = b[: -len(suf)]
            break
    b = STONE_ALIASES.get(b, b)
    if b == "brick":
        return mt.stone_mat("brick", "bricks")
    if b == "stone" and suffix == "brick":
        b, suffix = "stone_bricks", "bricks"
    if b == "cobblestone" and variant == "mossy":
        return mt.stone_mat("cobblestone", "mossy")
    if b == "cobblestone":
        return mt.stone_mat("cobblestone", "cobbled")
    if b == "mud_brick":
        return mt.stone_mat("mud_brick", "bricks")
    if b not in mt.STONES:
        return None
    if suffix == "brick":
        if variant == "cracked":
            return mt.stone_mat(b, "cracked")
        if variant == "mossy":
            return mt.stone_mat(b, "mossy_bricks")
        return mt.stone_mat(b, "bricks")
    if suffix == "tile":
        return mt.stone_mat(b, "tiles")
    if suffix == "pillar":
        return mt.stone_mat(b, "pillar")
    if variant == "cobbled":
        return mt.stone_mat(b, "cobbled")
    if variant in ("polished", "smooth", "cut", "chiseled", "mossy", "cracked"):
        return mt.stone_mat(b, variant)
    return mt.stone_mat(b)


def copper_material(base: str):
    stage = ""
    for s in ("exposed", "weathered", "oxidized"):
        if base.startswith(s + "_"):
            stage = s
            base = base[len(s) + 1 :]
    c = mt.COPPER_STAGES[stage]
    green = shade(mt.COPPER_STAGES["oxidized"], 0.9)
    pat = pt.patina(green) if stage in ("exposed", "weathered") else None
    if base in ("copper", "copper_block"):
        return mt.Mat(c, pt.combine(pt.rivets(), pat), pt.combine(pt.rivets(), pat)), stage, "block"
    if base == "cut_copper":
        return mt.Mat(c, pt.combine(pt.tiles(8), pat), pt.combine(pt.tiles(8), pat)), stage, "cut"
    if base == "chiseled_copper":
        return mt.Mat(c, pt.combine(pt.chiseled("circle"), pat), pt.combine(pt.chiseled("circle"), pat)), stage, "chiseled"
    if base == "copper_grate":
        return mt.Mat(c, pt.grate(shade(c, 0.5)), pt.grate(shade(c, 0.5))), stage, "grate"
    return mt.Mat(c), stage, base


SHAPES = [
    ("_fence_gate", "fence_gate"),
    ("_hanging_sign", "hanging_sign"),
    ("_pressure_plate", "pressure_plate"),
    ("_slab", "slab"),
    ("_stairs", "stairs"),
    ("_wall", "wall"),
    ("_fence", "fence"),
    ("_door", "door"),
    ("_trapdoor", "trapdoor"),
    ("_button", "button"),
    ("_pane", "pane"),
    ("_carpet", "carpet"),
    ("_sign", "sign"),
    ("_shelf", "shelf"),
    ("_gate", "fence_gate"),
]

SHAPE_FN = {
    "cube": sh.cube,
    "slab": sh.slab,
    "stairs": sh.stairs,
    "wall": sh.wall,
    "fence": sh.fence,
    "fence_gate": sh.fence_gate,
    "pressure_plate": sh.pressure_plate,
    "button": sh.button,
    "pane": sh.pane,
    "carpet": sh.carpet,
    "door": sh.door,
    "trapdoor": sh.trapdoor,
    "sign": sh.sign,
    "hanging_sign": sh.hanging_sign,
    "shelf": sh.shelf,
}

SHAPE_CATEGORY = {
    "door": "Doors & Mechanisms",
    "trapdoor": "Doors & Mechanisms",
    "button": "Doors & Mechanisms",
    "pressure_plate": "Doors & Mechanisms",
    "fence_gate": "Doors & Mechanisms",
    "sign": "Decoration",
    "hanging_sign": "Decoration",
    "shelf": "Decoration",
    "carpet": "Decoration",
    "pane": "Decoration",
}

FLOWERS = {
    "dandelion": ("#e8c45a", "daisy", "#df8a45"),
    "poppy": ("#c0533a", "cup", "#2a221d"),
    "blue_orchid": ("#5fa8d0", "orchid", "#3d5a80"),
    "allium": ("#b48ad0", "ball", "#86629e"),
    "azure_bluet": ("#e4ecf2", "star", "#e8c45a"),
    "red_tulip": ("#c0533a", "tulip", ""),
    "orange_tulip": ("#df8a45", "tulip", ""),
    "white_tulip": ("#f2ece0", "tulip", ""),
    "pink_tulip": ("#e9a0b4", "tulip", ""),
    "oxeye_daisy": ("#f2ece0", "daisy", "#e8c45a"),
    "cornflower": ("#4a6a9a", "star", "#2a3a5a"),
    "lily_of_the_valley": ("#f2ece0", "bell", ""),
}
TALL_FLOWERS = {"sunflower": ("#e8c45a", "sun"), "peony": ("#e9a0b4", "ball"), "lilac": ("#b48ad0", "spike"), "rose_bush": ("#c0533a", "rose")}
CORALS = {"tube": "#4a6aba", "brain": "#e98fa8", "bubble": "#b48ad0", "fire": "#d8573c", "horn": "#e8c45a"}

ORE_HOST = {"": "stone", "deepslate_": "shale"}


def _tile_art(s: str) -> str:
    return s


SPECIAL: dict[str, tuple[str, str, Callable[[], str]]] = {}


def special(src: str, category: str, shape: str = "custom"):
    def deco(fn):
        SPECIAL[src] = (category, shape, fn)
        return fn

    return deco


def _cube_mat(m):
    return lambda: sh.cube(m, Rand(str(id(m))))


def build_specials():
    R = Rand
    S = SPECIAL
    S["bedrock"] = ("Natural", "cube", lambda: sh.cube(mt.stone_mat("bedrock"), R("bedrock")))
    S["dirt"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#8a7a62", pt.speckle(6, 0.8), pt.speckle(6, 0.8)), R("dirt")))
    S["coarse_dirt"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#7e6e58", pt.speckle(16, 1.0), pt.speckle(16, 1.0)), R("cd")))
    S["rooted_dirt"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#8a7a62", pt.log_side("#6e5440"), pt.log_side("#6e5440")), R("rd")))
    S["mud"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#5e554e", pt.speckle(5, 1.2), pt.speckle(5, 1.2)), R("mud")))
    S["packed_mud"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#a8866a", pt.speckle(8, 0.7), pt.speckle(8, 0.7)), R("pm")))
    S["grass_block"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#8f9572", pt.speckle(5, 0.8, ["#86ab76"]), pt.capped_side("#9db58a"), top_color="#9db58a", side_color="#8a7a62"), R("grass")))
    S["mycelium"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#8a7a62", pt.speckle(14, 0.9, ["#b8a8b8", "#8a7a8a"]), pt.capped_side("#9a8a9a", 3), top_color="#9a8a9a"), R("myc")))
    S["podzol"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#8a7a62", pt.leaves("#6e5440"), pt.capped_side("#8a6a44", 3, False), top_color="#8a6a44"), R("pod")))
    S["dirt_path"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#8a7a62", pt.speckle(6, 0.6), pt.capped_side("#b8a07a", 2.5, False), top_color="#b8a07a"), R("path")))
    S["farmland"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#6e5e48", pt.bands(3, 0.75), pt.speckle(5, 0.8), top_color="#5e4e3a"), R("farm")))
    S["moss_block"] = ("Plants", "cube", lambda: sh.cube(mt.Mat("#6f8f4e", pt.speckle(14, 1.0), pt.speckle(14, 1.0)), R("moss")))
    S["moss_carpet"] = ("Plants", "carpet", lambda: sh.carpet(mt.Mat("#6f8f4e", pt.speckle(14, 1.0), pt.speckle(14, 1.0)), R("mossc")))
    S["sand"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#e6d6b0", pt.speckle(10, 0.5), pt.speckle(10, 0.5)), R("sand")))
    S["red_sand"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#d08a52", pt.speckle(10, 0.5), pt.speckle(10, 0.5)), R("rsand")))
    S["gravel"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#aaa49a", pt.speckle(22, 1.0, ["#8f8a80", "#c4beb2"]), pt.speckle(22, 1.0, ["#8f8a80", "#c4beb2"])), R("grv")))
    S["clay"] = ("Natural", "cube", lambda: sh.cube(mt.stone_mat("clay"), R("clay")))
    S["snow_block"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#f6f1e6", pt.speckle(4, 0.6, ["#e2ddd4"]), pt.speckle(4, 0.6, ["#e2ddd4"])), R("snow")))
    S["snow"] = ("Natural", "layer", lambda: sh.layer(mt.Mat("#f6f1e6"), R("snowl")))
    S["powder_snow"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#fbf8f0", pt.speckle(18, 0.5, ["#e8eef2"]), pt.speckle(18, 0.5, ["#e8eef2"])), R("psnow")))
    S["ice"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#a9cfe0", pt.glass("#c8e2ec"), pt.glass("#c8e2ec"), opacity=0.8), R("ice")))
    S["packed_ice"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#8fbcd8", pt.cracked(), pt.cracked()), R("pice")))
    S["blue_ice"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#6aa0d0", pt.cracked(), pt.cracked()), R("bice")))
    S["water"] = ("Elements", "cube", lambda: sh.cube(mt.Mat("#5d8fa8", pt.wool(), pt.bands(4, 1.1), opacity=0.85), R("water")))
    S["lava"] = ("Elements", "cube", lambda: sh.cube(mt.Mat("#e07a3a", pt.speckle(10, 1.6, ["#f3cf6a", "#c0533a"]), pt.speckle(10, 1.6, ["#f3cf6a", "#c0533a"])), R("lava")))
    S["fire"] = ("Elements", "custom", lambda: _fire())
    S["obsidian"] = ("Natural", "cube", lambda: sh.cube(mt.stone_mat("obsidian"), R("obs")))
    S["basalt"] = ("Natural", "cube", lambda: sh.cube(mt.stone_mat("basalt"), R("bas")))
    S["polished_basalt"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#5e5d62", pt.polished(), pt.strands(0.9)), R("pbas")))
    S["smooth_basalt"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#5a595e"), R("sbas")))
    S["calcite"] = ("Natural", "cube", lambda: sh.cube(mt.stone_mat("calcite"), R("calc")))
    S["dripstone_block"] = ("Natural", "cube", lambda: sh.cube(mt.stone_mat("dripstone"), R("drip")))
    S["pointed_dripstone"] = ("Natural", "custom", lambda: _stalactite())
    S["bone_block"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#ece6da", pt.log_top("#ece6da", "#d8d0c0"), pt.bands(4, 0.9)), R("bone")))
    S["hay_bale"] = ("Farming", "cube", lambda: sh.cube(mt.Mat("#d9b866", pt.speckle(8, 0.7, ["#b8963e"]), pt.combine(pt.strands(0.85), pt.face_art('<rect x="0" y="3" width="16" height="1.4" fill="#8a6544"/><rect x="0" y="11.6" width="16" height="1.4" fill="#8a6544"/>'))), R("hay")))
    S["honey_block"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#e8a83a", pt.polished(1.15), pt.polished(1.15), opacity=0.9), R("honey")))
    S["honeycomb_block"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#e8b04a", pt.grate("#c88a2a"), pt.grate("#c88a2a")), R("comb")))
    S["slime_block"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#c3a8f0", pt.polished(1.2), pt.polished(1.2), opacity=0.85), R("gel")))
    S["dried_kelp_block"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#4e5a3a", pt.leaves("#3a4a2e"), pt.strands(0.8)), R("kelpb")))
    S["sponge"] = ("Utility", "cube", lambda: sh.sponge())
    S["amethyst_block"] = ("Natural", "cube", lambda: sh.cube(mt.Mat("#9a72c8", pt.cracked(), pt.cracked()), R("ame")))
    S["amethyst_cluster"] = ("Natural", "custom", lambda: _crystals("#9a72c8"))
    S["coal_block"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#3a3633", pt.speckle(8, 1.0, ["#55504a"]), pt.speckle(8, 1.0, ["#55504a"])), R("coalb")))
    for m in ("iron", "gold", "copper"):
        S[f"raw_{m}_block"] = ("Building", "cube", (lambda m=m: sh.cube(mt.Mat(mt.GEMS[m], pt.cobble(), pt.cobble()), R("raw" + m))))
    for m in ("iron", "gold", "diamond", "emerald", "lapis"):
        S[f"{m}_block"] = ("Building", "cube", (lambda m=m: sh.cube(mt.Mat(mt.METAL_BLOCKS[m], pt.rivets(), pt.rivets()), R(m + "b"))))
    S["iron_door"] = ("Doors & Mechanisms", "door", lambda: sh.door(mt.Mat("#d8d4cc"), R("idoor"), window=False))
    S["iron_trapdoor"] = ("Doors & Mechanisms", "trapdoor", lambda: sh.trapdoor(mt.Mat("#d8d4cc", pt.grate("#8f8a80"), None), R("itd")))
    S["iron_bars"] = ("Decoration", "bars", lambda: sh.bars("#a9a296", R("ib")))
    S["iron_chain"] = ("Decoration", "chain", lambda: sh.chain("#8f8a80", R("ic")))
    S["heavy_weighted_pressure_plate"] = ("Doors & Mechanisms", "pressure_plate", lambda: sh.pressure_plate(mt.Mat("#d8d4cc"), R("hp")))
    S["light_weighted_pressure_plate"] = ("Doors & Mechanisms", "pressure_plate", lambda: sh.pressure_plate(mt.Mat("#efc85a"), R("lp")))
    S["glass"] = ("Decoration", "cube", lambda: sh.cube(mt.Mat("#d9eaea", pt.glass("#b8d4d8"), pt.glass("#b8d4d8"), opacity=0.5), R("glass")))
    S["tinted_glass"] = ("Decoration", "cube", lambda: sh.cube(mt.Mat("#4a4252", pt.glass("#6a6272"), pt.glass("#6a6272"), opacity=0.75), R("tglass")))
    S["glass_pane"] = ("Decoration", "pane", lambda: sh.pane(mt.Mat("#d9eaea", pt.glass("#b8d4d8"), pt.glass("#b8d4d8"), opacity=0.5), R("gpane")))
    S["terracotta"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#b8704e", pt.speckle(3, 0.6), pt.speckle(3, 0.6)), R("tc")))
    S["bricks"] = ("Building", "cube", lambda: sh.cube(mt.stone_mat("brick", "bricks"), R("bricks")))
    S["chiseled_bricks"] = ("Building", "cube", lambda: sh.cube(mt.Mat("#c0533a", pt.chiseled("lines"), pt.chiseled("lines")), R("cbr")))
    S["bamboo_block"] = ("Wood", "cube", lambda: sh.cube(mt.Mat("#9aa852", pt.log_top("#9aa852", "#7a8a3e"), pt.combine(pt.strands(0.85))), R("bblock")))
    S["stripped_bamboo_block"] = ("Wood", "cube", lambda: sh.cube(mt.Mat("#d9c26a", pt.log_top("#d9c26a", "#b8a04a"), pt.strands(0.88)), R("sbblock")))
    S["bamboo_mosaic"] = ("Wood", "cube", lambda: sh.cube(mt.Mat("#d9c26a", pt.checker(0.85), pt.checker(0.85)), R("bmos")))
    S["bamboo_mosaic_slab"] = ("Wood", "slab", lambda: sh.slab(mt.Mat("#d9c26a", pt.checker(0.85), pt.checker(0.85)), R("bmoss")))
    S["bamboo_mosaic_stairs"] = ("Wood", "stairs", lambda: sh.stairs(mt.Mat("#d9c26a", pt.checker(0.85), pt.checker(0.85)), R("bmost")))
    S["mushroom_stem"] = ("Plants", "cube", lambda: sh.cube(mt.Mat("#ece6da", pt.log_top("#ece6da", "#d8d0c0"), pt.bands(5, 0.92)), R("mstem")))
    S["red_mushroom_block"] = ("Plants", "cube", lambda: sh.cube(mt.Mat("#c0533a", pt.speckle(4, 2.0, ["#f2ece0"], 1), pt.speckle(4, 2.0, ["#f2ece0"], 1)), R("rmb")))
    S["brown_mushroom_block"] = ("Plants", "cube", lambda: sh.cube(mt.Mat("#9a7a5a", pt.speckle(4, 1.0), pt.speckle(4, 1.0)), R("bmb")))
    S["pumpkin"] = ("Farming", "cube", lambda: sh.jack_o_lantern(False, False))
    S["carved_pumpkin"] = ("Farming", "cube", lambda: sh.jack_o_lantern(False, True))
    S["jack_o_lantern"] = ("Lighting", "cube", lambda: sh.jack_o_lantern(True, True))
    S["melon"] = ("Farming", "cube", lambda: sh.melon())
    S["cake"] = ("Food", "custom", lambda: sh.cake())
    S["crafting_table"] = ("Workstations", "cube", lambda: sh.workstation(
        '<rect x="1" y="1" width="14" height="14" fill="DARK" fill-opacity="0.25"/><rect x="5" y="1" width="1" height="14" fill="DARK"/><rect x="10" y="1" width="1" height="14" fill="DARK"/><rect x="1" y="5" width="14" height="1" fill="DARK"/><rect x="1" y="10" width="14" height="1" fill="DARK"/>',
        '<rect x="0" y="0" width="16" height="3" fill="DARK"/><rect x="3" y="6" width="4" height="7" fill="#8f8a80"/><rect x="9" y="5" width="2" height="8" fill="#6e5440"/><rect x="8" y="5" width="4" height="2" fill="#b8b4aa"/>',
        "#b88a5a"))
    S["furnace"] = ("Workstations", "cube", lambda: sh.workstation(
        '<rect x="2" y="2" width="12" height="12" fill="DARK" fill-opacity="0.35"/>',
        '<rect x="3" y="3" width="10" height="3" fill="DARK"/><rect x="4" y="8" width="8" height="6" rx="1" fill="#3a3633"/><rect x="5" y="11" width="6" height="2" fill="#e08a4a"/>',
        "#a9a59c"))
    S["blast_furnace"] = ("Workstations", "cube", lambda: sh.workstation(
        '<rect x="2" y="2" width="12" height="12" fill="DARK" fill-opacity="0.35"/>',
        '<rect x="0" y="0" width="16" height="4" fill="#d8d4cc"/><rect x="4" y="7" width="8" height="7" rx="1" fill="#3a3633"/><rect x="5" y="8" width="1" height="5" fill="#8f8a80"/><rect x="8" y="8" width="1" height="5" fill="#8f8a80"/><rect x="5" y="12" width="6" height="1.5" fill="#e08a4a"/>',
        "#7d7870"))
    S["smoker"] = ("Workstations", "cube", lambda: sh.workstation(
        '<rect x="2" y="2" width="12" height="12" fill="#6e5440"/>',
        '<rect x="0" y="0" width="16" height="3" fill="#6e5440"/><rect x="4" y="7" width="8" height="7" rx="1" fill="#3a3633"/><rect x="5" y="11.5" width="6" height="2" fill="#e08a4a"/>',
        "#8f8a80"))
    S["chest"] = ("Storage", "custom", lambda: sh.chest())
    S["barrel"] = ("Storage", "cube", lambda: sh.workstation(
        '<circle cx="8" cy="8" r="7" fill="DARK" fill-opacity="0.2"/><rect x="5" y="7" width="6" height="2" rx="1" fill="#3a3633"/>',
        '<rect x="0" y="3" width="16" height="1.2" fill="#5a5a5a"/><rect x="0" y="11.8" width="16" height="1.2" fill="#5a5a5a"/><rect x="5" y="0" width="0.7" height="16" fill="DARK"/><rect x="10.5" y="0" width="0.7" height="16" fill="DARK"/>',
        "#9a7048"))
    S["loon"] = ("Workstations", "custom", lambda: sh.workstation(
        '<rect x="0" y="0" width="16" height="16" fill="FILL"/><rect x="2" y="2" width="12" height="12" fill="#e8c45a"/><rect x="2" y="6" width="12" height="2" fill="#c0533a"/>',
        '<rect x="0" y="0" width="16" height="3" fill="DARK"/><rect x="2" y="5" width="12" height="2" fill="#e8c45a"/>', "#b88a5a"))
    S["cartography_table"] = ("Workstations", "cube", lambda: sh.workstation(
        '<rect x="1" y="1" width="14" height="14" fill="#f2ece0"/><path d="M3 10 q3 -6 6 -2 t5 -4" fill="none" stroke="#3f7f86" stroke-width="1"/><circle cx="11" cy="11" r="1.4" fill="#c0533a"/>',
        '<rect x="0" y="0" width="16" height="3" fill="DARK"/><rect x="2" y="5" width="12" height="6" fill="#ece6da"/>', "#8a6544"))
    S["fletching_table"] = ("Workstations", "cube", lambda: sh.workstation(
        '<rect x="1" y="1" width="14" height="14" fill="#e3d3a8"/><path d="M3 13 L13 3" stroke="#6e5440" stroke-width="1.2"/><path d="M11 3 h2 v2" fill="none" stroke="#b8b4aa" stroke-width="1.2"/><path d="M3 11 l-1 3 3 -1" fill="#f2ece0"/>',
        '<rect x="0" y="0" width="16" height="3" fill="DARK"/><rect x="3" y="6" width="1.2" height="7" fill="#f2ece0"/><rect x="7" y="6" width="1.2" height="7" fill="#f2ece0"/><rect x="11" y="6" width="1.2" height="7" fill="#f2ece0"/>', "#c9a57a"))
    S["smithing_table"] = ("Workstations", "cube", lambda: sh.workstation(
        '<rect x="1" y="1" width="14" height="14" fill="#4a4a52"/><rect x="3" y="7" width="10" height="2" fill="#8f8a80"/>',
        '<rect x="0" y="0" width="16" height="4" fill="#4a4a52"/><rect x="3" y="7" width="2" height="7" fill="#6e5440"/><rect x="11" y="7" width="2" height="7" fill="#6e5440"/>', "#8a6544"))
    S["stonecutter"] = ("Workstations", "custom", lambda: _stonecutter())
    S["lectern"] = ("Workstations", "custom", lambda: sh.lectern())
    S["grindstone"] = ("Workstations", "custom", lambda: sh.grindstone())
    S["anvil"] = ("Workstations", "custom", lambda: sh.anvil())
    S["brewing_stand"] = ("Workstations", "custom", lambda: sh.brewing_stand())
    S["cauldron"] = ("Utility", "custom", lambda: sh.cauldron())
    S["composter"] = ("Farming", "cube", lambda: sh.composter())
    S["hopper"] = ("Utility", "custom", lambda: sh.hopper())
    S["bell"] = ("Decoration", "custom", lambda: sh.bell())
    S["bee_nest"] = ("Farming", "cube", lambda: sh.bee_nest(False))
    S["beehive"] = ("Farming", "cube", lambda: sh.bee_nest(True))
    S["flower_pot"] = ("Decoration", "custom", lambda: sh.flower_pot())
    S["decorated_pot"] = ("Decoration", "custom", lambda: sh.decorated_pot())
    S["ladder"] = ("Utility", "custom", lambda: sh.ladder(mt.Mat("#a8804e"), R("ladder")))
    S["scaffolding"] = ("Utility", "custom", lambda: sh.scaffolding())
    S["cobweb"] = ("Decoration", "custom", lambda: sh.cobweb())
    S["torch"] = ("Lighting", "custom", lambda: sh.torch())
    S["lantern"] = ("Lighting", "custom", lambda: sh.lantern())
    S["campfire"] = ("Lighting", "custom", lambda: sh.campfire())
    S["lever"] = ("Doors & Mechanisms", "custom", lambda: sh.lever())
    S["rail"] = ("Doors & Mechanisms", "custom", lambda: sh.rail())
    S["note_block"] = ("Decoration", "cube", lambda: sh.note_block())
    S["tnt"] = ("Utility", "cube", lambda: sh.blast_barrel())
    S["bookshelf"] = ("Decoration", "cube", lambda: sh.bookshelf())
    S["skeleton_skull"] = ("Decoration", "custom", lambda: sh.skull())
    S["frogspawn"] = ("Natural", "custom", lambda: sh.frogspawn())
    S["turtle_egg"] = ("Natural", "custom", lambda: sh.turtle_egg())
    S["candle"] = ("Lighting", "candle", lambda: sh.candle("#e8dcc0", R("candle")))
    S["stone_button"] = ("Doors & Mechanisms", "button", lambda: sh.button(mt.stone_mat("stone"), R("sbtn")))
    S["stone_pressure_plate"] = ("Doors & Mechanisms", "pressure_plate", lambda: sh.pressure_plate(mt.stone_mat("stone"), R("spp")))
    S["quartz_block"] = ("Building", "cube", lambda: sh.cube(mt.stone_mat("quartz", "polished"), R("qb")))
    S["smooth_quartz_block"] = ("Building", "cube", lambda: sh.cube(mt.stone_mat("quartz", "smooth"), R("sqb")))
    S["chiseled_quartz_block"] = ("Building", "cube", lambda: sh.cube(mt.stone_mat("quartz", "chiseled"), R("cqb")))
    S["quartz_pillar"] = ("Building", "cube", lambda: sh.cube(mt.stone_mat("quartz", "pillar"), R("qp")))
    S["quartz_bricks"] = ("Building", "cube", lambda: sh.cube(mt.stone_mat("quartz", "bricks"), R("qbr")))
    # Plants
    S["short_grass"] = ("Plants", "plant", lambda: pl.grass())
    S["tall_grass"] = ("Plants", "plant", lambda: pl.grass(tall=True))
    S["short_dry_grass"] = ("Plants", "plant", lambda: pl.grass(dry=True))
    S["tall_dry_grass"] = ("Plants", "plant", lambda: pl.grass(dry=True, tall=True))
    S["fern"] = ("Plants", "plant", lambda: pl.fern())
    S["large_fern"] = ("Plants", "plant", lambda: pl.fern(large=True))
    S["bush"] = ("Plants", "plant", lambda: pl.bush())
    S["dead_bush"] = ("Plants", "plant", lambda: pl.bush(dead=True))
    S["sweet_berry_bush"] = ("Plants", "plant", lambda: pl.bush("#4f7a4e", berries="#c0533a"))
    S["firefly_bush"] = ("Plants", "plant", lambda: pl.firefly_bush())
    S["cactus"] = ("Plants", "plant", lambda: pl.cactus())
    S["cactus_flower"] = ("Plants", "plant", lambda: pl.cactus_flower())
    S["sugar_cane"] = ("Plants", "plant", lambda: pl.sugar_cane())
    S["bamboo"] = ("Plants", "plant", lambda: pl.bamboo())
    S["lily_pad"] = ("Plants", "plant", lambda: pl.lily_pad())
    S["vine"] = ("Plants", "plant", lambda: pl.vine())
    S["pink_petals"] = ("Plants", "plant", lambda: pl.petals("#e9a0b4"))
    S["wildflowers"] = ("Plants", "plant", lambda: pl.petals("#e8c45a"))
    S["leaf_litter"] = ("Plants", "plant", lambda: pl.leaf_litter())
    S["azalea"] = ("Plants", "plant", lambda: pl.azalea())
    S["flowering_azalea"] = ("Plants", "plant", lambda: pl.azalea(True))
    S["azalea_leaves"] = ("Plants", "cube", lambda: sh.cube(mt.Mat("#6f9a52", pt.leaves("#4f7a3e"), pt.leaves("#4f7a3e")), R("azl")))
    S["flowering_azalea_leaves"] = ("Plants", "cube", lambda: sh.cube(mt.Mat("#6f9a52", pt.combine(pt.leaves("#4f7a3e"), pt.speckle(5, 1.3, ["#d98ac8"], 1)), pt.combine(pt.leaves("#4f7a3e"), pt.speckle(5, 1.3, ["#d98ac8"], 1))), R("fazl")))
    for c, hexc in (("red", "#c0533a"), ("orange", "#df8a45"), ("yellow", "#e8c45a")):
        S[f"{c}_poplar_leaves"] = ("Plants", "cube", (lambda hexc=hexc, c=c: sh.cube(mt.Mat(hexc, pt.leaves(shade(hexc, 0.78)), pt.leaves(shade(hexc, 0.78))), R(c + "pl"))))
    S["hanging_roots"] = ("Plants", "plant", lambda: pl.roots())
    S["mangrove_roots"] = ("Plants", "cube", lambda: sh.cube(mt.Mat("#5a4436", pt.log_side("#3e2e24"), pt.log_side("#3e2e24"), opacity=0.9), R("mroots")))
    S["muddy_mangrove_roots"] = ("Plants", "cube", lambda: sh.cube(mt.Mat("#5e554e", pt.log_side("#5a4436"), pt.log_side("#5a4436")), R("mmroots")))
    S["seagrass"] = ("Plants", "plant", lambda: pl.seagrass())
    S["sea_pickle"] = ("Plants", "plant", lambda: pl.sea_pickle())
    S["kelp"] = ("Plants", "plant", lambda: pl.kelp())
    S["red_mushroom"] = ("Plants", "plant", lambda: pl.mushroom("#c0533a"))
    S["brown_mushroom"] = ("Plants", "plant", lambda: pl.mushroom("#9a7a5a", spots=False))
    S["shelf_mushroom"] = ("Plants", "plant", lambda: pl.shelf_mushroom())
    S["wheat"] = ("Farming", "plant", lambda: pl.crop("wheat"))
    S["carrots"] = ("Farming", "plant", lambda: pl.crop("carrots"))
    S["potatoes"] = ("Farming", "plant", lambda: pl.crop("potatoes"))
    S["beetroots"] = ("Farming", "plant", lambda: pl.crop("beetroots"))
    S["cocoa"] = ("Farming", "plant", lambda: pl.cocoa())
    S["mangrove_propagule"] = ("Plants", "plant", lambda: pl.sapling(mt.WOODS["mangrove"][2]))


def _fire() -> str:
    from geometry import ink_group

    return ink_group('<path d="M50 6 Q84 40 72 72 Q64 92 50 92 Q36 92 28 72 Q16 40 38 24 Q40 46 50 50 Q44 26 50 6Z" fill="#d8573c"/><path d="M50 44 Q66 60 60 76 Q56 86 50 86 Q42 86 40 74 Q40 58 50 44Z" fill="#e8b85a"/>')


def _stalactite() -> str:
    from geometry import ink_group

    return ink_group('<path d="M28 6 H72 L58 50 L52 94 L46 50 Z" fill="#a68a72"/><path d="M40 6 H50 L48 40Z" fill="#c4a88e"/>')


def _crystals(c: str) -> str:
    from geometry import ink_group

    out = f'<polygon points="50,8 62,40 56,92 44,92 38,40" fill="{c}"/>'
    out += f'<polygon points="26,40 36,60 34,92 24,92 18,62" fill="{shade(c, 0.85)}"/><polygon points="76,36 84,60 78,92 68,92 66,58" fill="{shade(c, 0.85)}"/>'
    out += f'<polygon points="50,8 50,92 44,92 38,40" fill="{shade(c, 1.25)}"/>'
    return ink_group(out)


def _stonecutter() -> str:
    from geometry import Box, boxes_svg, ink_group

    body = boxes_svg([Box(0, 1, 0, 1, 0, 0.56, "#a9a59c", pt.polished(), pt.bands(4, 0.9))], Rand("sc"))
    blade = '<circle cx="50" cy="30" r="17" fill="#d8d4cc"/><circle cx="50" cy="30" r="5" fill="#8f8a80"/>'
    return body + ink_group(blade, 3)


build_specials()


# --- the classifier --------------------------------------------------------------------------


def classify(src_id: str, mc_name: str) -> Entry | None:
    if src_id not in KEEP and src_id not in SPECIAL and EXCLUDE_RE.search(src_id):
        return None
    name = sozo_name(mc_name)
    sid = sozo_id(name)

    if src_id in SPECIAL:
        cat, shape, fn = SPECIAL[src_id]
        return Entry(src_id, name, sid, cat, shape, "", "", fn)

    r = Rand(src_id)

    # Flowers & plants by family.
    if src_id in FLOWERS:
        petal, kind, center = FLOWERS[src_id]
        return Entry(src_id, name, sid, "Plants", "plant", "flower", "", lambda: pl.flower(petal, kind, center or "#e8c45a"))
    if src_id in TALL_FLOWERS:
        petal, kind = TALL_FLOWERS[src_id]
        return Entry(src_id, name, sid, "Plants", "plant", "tall flower", "", lambda: pl.tall_flower(petal, kind))
    m = re.match(r"^(tube|brain|bubble|fire|horn)_coral(_block|_fan)?$", src_id)
    if m:
        c = CORALS[m.group(1)]
        if m.group(2) == "_block":
            return Entry(src_id, name, sid, "Natural", "cube", "coral", m.group(1), lambda: sh.cube(mt.Mat(c, pt.speckle(16, 1.0, [shade(c, 0.8)]), pt.speckle(16, 1.0, [shade(c, 0.8)])), r))
        kind = "fan" if m.group(2) == "_fan" else m.group(1)
        return Entry(src_id, name, sid, "Plants", "plant", "coral", m.group(1), lambda: pl.coral(c, kind))

    # Ores.
    m = re.match(r"^(deepslate_)?(coal|iron|copper|gold|lapis|diamond|emerald)_ore$", src_id)
    if m:
        host = ORE_HOST[m.group(1) or ""]
        base = mt.STONES[host]
        gem = mt.GEMS[m.group(2)]
        return Entry(src_id, name, sid, "Natural", "cube", "ore", m.group(2), lambda: sh.cube(mt.Mat(base, pt.ore(gem), pt.ore(gem)), r))

    # Copper family.
    if "copper" in src_id or "lightning_rod" in src_id:
        mat, stage, kind = copper_material(src_id.replace("_slab", "").replace("_stairs", "").replace("_door", "").replace("_trapdoor", "").replace("_bars", "").replace("_chain", "").replace("_lantern", ""))
        c = mat.color
        if src_id.endswith("_slab"):
            return Entry(src_id, name, sid, "Building", "slab", "copper", stage, lambda: sh.slab(mat, r))
        if src_id.endswith("_stairs"):
            return Entry(src_id, name, sid, "Building", "stairs", "copper", stage, lambda: sh.stairs(mat, r))
        if src_id.endswith("_trapdoor"):
            return Entry(src_id, name, sid, "Doors & Mechanisms", "trapdoor", "copper", stage, lambda: sh.trapdoor(mt.Mat(c, pt.grate(shade(c, 0.55)), None), r))
        if src_id.endswith("_door"):
            return Entry(src_id, name, sid, "Doors & Mechanisms", "door", "copper", stage, lambda: sh.door(mt.Mat(c), r))
        if src_id.endswith("_bars"):
            return Entry(src_id, name, sid, "Decoration", "bars", "copper", stage, lambda: sh.bars(c, r))
        if src_id.endswith("_chain"):
            return Entry(src_id, name, sid, "Decoration", "chain", "copper", stage, lambda: sh.chain(c, r))
        if src_id.endswith("_lantern"):
            return Entry(src_id, name, sid, "Lighting", "lantern", "copper", stage, lambda: sh.lantern(c, "#a8e0c8"))
        if "lightning_rod" in src_id:
            return Entry(src_id, name, sid, "Utility", "rod", "copper", stage, lambda: sh.lightning_rod(c))
        return Entry(src_id, name, sid, "Building", "cube", "copper", stage, lambda: sh.cube(mat, r))

    # Colour families.
    m = COLOUR_RE.match(src_id)
    if m:
        col = m.group(1)
        rest = src_id[len(col) + 1 :]
        hexc = mt.DYES[col]
        families = {
            "wool": ("Decoration", "cube", lambda: sh.cube(mt.dyed(col, "wool"), r)),
            "wool_slab": ("Decoration", "slab", lambda: sh.slab(mt.dyed(col, "wool"), r)),
            "wool_stairs": ("Decoration", "stairs", lambda: sh.stairs(mt.dyed(col, "wool"), r)),
            "carpet": ("Decoration", "carpet", lambda: sh.carpet(mt.dyed(col, "wool"), r)),
            "concrete": ("Building", "cube", lambda: sh.cube(mt.dyed(col, "concrete"), r)),
            "concrete_slab": ("Building", "slab", lambda: sh.slab(mt.dyed(col, "concrete"), r)),
            "concrete_stairs": ("Building", "stairs", lambda: sh.stairs(mt.dyed(col, "concrete"), r)),
            "concrete_powder": ("Building", "cube", lambda: sh.cube(mt.dyed(col, "concrete_powder"), r)),
            "terracotta": ("Building", "cube", lambda: sh.cube(mt.dyed(col, "terracotta"), r)),
            "glazed_terracotta": ("Building", "cube", lambda: sh.cube(mt.dyed(col, "glazed_terracotta"), r)),
            "stained_glass": ("Decoration", "cube", lambda: sh.cube(mt.dyed(col, "stained_glass"), r)),
            "stained_glass_pane": ("Decoration", "pane", lambda: sh.pane(mt.dyed(col, "stained_glass"), r)),
            "bed": ("Furniture", "bed", lambda: sh.bed(hexc, r)),
            "banner": ("Decoration", "banner", lambda: sh.banner(hexc, r)),
            "candle": ("Lighting", "candle", lambda: sh.candle(hexc, r)),
        }
        if rest in families:
            cat, shape, fn = families[rest]
            return Entry(src_id, name, sid, cat, shape, rest.replace("_", " "), col, fn)
        # Otherwise not a dye family (e.g. red_sandstone): fall through to the stone rules.

    # Wood families.
    m = WOOD_RE.match(src_id)
    if m:
        wood = m.group(1)
        rest = src_id[len(wood) + 1 :]
        planks = mt.wood_mat(wood, "planks")
        kinds = {
            "log": ("Wood", "cube", lambda: sh.cube(mt.wood_mat(wood, "log"), r)),
            "logs": ("Wood", "cube", lambda: sh.cube(mt.wood_mat(wood, "log"), r)),
            "wood": ("Wood", "cube", lambda: sh.cube(mt.wood_mat(wood, "wood"), r)),
            "planks": ("Wood", "cube", lambda: sh.cube(planks, r)),
            "leaves": ("Plants", "cube", lambda: sh.cube(mt.wood_mat(wood, "leaves"), r)),
            "sapling": ("Plants", "plant", lambda: pl.sapling(mt.WOODS[wood][2], mt.WOODS[wood][1])),
            "saplings": ("Plants", "plant", lambda: pl.sapling(mt.WOODS[wood][2], mt.WOODS[wood][1])),
        }
        if rest in kinds:
            cat, shape, fn = kinds[rest]
            return Entry(src_id, name, sid, cat, shape, f"{wood.replace('_', ' ')} wood", rest, fn)
        for suf, shape in SHAPES:
            if rest == suf.lstrip("_"):
                cat = SHAPE_CATEGORY.get(shape, "Wood")
                fn = SHAPE_FN[shape]
                if shape == "door":
                    return Entry(src_id, name, sid, cat, shape, f"{wood.replace('_', ' ')} wood", shape, lambda: sh.door(planks, r))
                return Entry(src_id, name, sid, cat, shape, f"{wood.replace('_', ' ')} wood", shape, lambda fn=fn: fn(planks, r))
        return None
    m = re.match(r"^stripped_(" + "|".join(mt.WOODS) + r")_(log|wood)$", src_id)
    if m:
        wood, kind = m.groups()
        return Entry(src_id, name, sid, "Wood", "cube", f"{wood.replace('_', ' ')} wood", "stripped " + kind, lambda: sh.cube(mt.wood_mat(wood, "stripped_" + kind), r))

    # Stone-like families with shape suffixes.
    shape = "cube"
    base = src_id
    for suf, shp in SHAPES:
        if base.endswith(suf):
            shape, base = shp, base[: -len(suf)]
            break
    mat = stone_material(base)
    if mat is None and shape != "cube":
        mat = stone_material(base + "s")
    if mat is None:
        return None
    natural = shape == "cube" and STONE_ALIASES.get(base, base) in NATURAL_STONES
    cat = SHAPE_CATEGORY.get(shape, "Natural" if natural else "Building")
    fn = SHAPE_FN[shape]
    return Entry(src_id, name, sid, cat, shape, base.replace("_", " "), "", lambda: fn(mat, r))
