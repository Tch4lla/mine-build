"""Batch 5 (2D): status-effect icons, potions and particles, in the shared itemkit recipe.

Effects and particles are flat in the game (HUD icons, camera-facing billboards), so they are 2D
ink drawings. Potions are items, drawn like the other item sprites.
"""

from __future__ import annotations

import math

from geometry import INK, shade
from itemkit import DARK, EDGE, LIGHT, MID, Ci, R, clipped, fill, glint, line_part, sil, toned
from itemkit import Pd as P

WHITE = "#fbf8f0"


def badge(color: str, symbol: str) -> str:
    """A round effect badge: toon-shaded disc in the effect colour with a paper symbol on top."""
    d = "M10 50 A40 40 0 1 0 90 50 A40 40 0 1 0 10 50 Z"
    out = sil(P(d)) + fill(P(d), shade(color, DARK))
    out += clipped(d, f'<circle cx="46" cy="46" r="38" fill="{shade(color, MID)}"/><circle cx="40" cy="38" r="26" fill="{shade(color, LIGHT)}"/>')
    out += f'<circle cx="50" cy="50" r="33" fill="none" stroke="{shade(color, 1.35)}" stroke-width="2.5" stroke-opacity="0.8"/>'
    return out + symbol + glint(30, 28, 4)


def sym(d: str, color: str = WHITE, w: float = 0) -> str:
    """A symbol shape with an ink outline (filled) or an ink-cased stroke (w > 0)."""
    if w:
        return line_part(d, color, w)
    return f'<path d="{d}" fill="{color}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'


HEART = "M50 74 L28 52 Q20 42 28 34 Q38 26 50 38 Q62 26 72 34 Q80 42 72 52 Z"
SHIELD = "M50 22 L72 30 Q72 58 50 76 Q28 58 28 30 Z"
DROP = "M50 22 Q66 44 66 56 Q66 74 50 74 Q34 74 34 56 Q34 44 50 22 Z"
FEATHER = "M66 24 Q38 30 34 66 L40 72 Q66 58 66 24 Z"
EYE = "M22 50 Q50 24 78 50 Q50 76 22 50 Z"
PICK = "M28 40 Q50 22 72 40 L68 44 Q50 32 32 44 Z"
FLAME = "M50 22 Q68 42 66 58 Q64 74 50 76 Q36 74 34 58 Q34 44 44 36 Q46 48 50 50 Q48 36 50 22 Z"
CLOVER = "".join(f'<circle cx="{50 + 11*math.cos(math.radians(a))}" cy="{46 + 11*math.sin(math.radians(a))}" r="10"/>' for a in (-90, 0, 90, 180))


EFFECTS = {
    # id: (Sōzō name, colour, type, description, symbol svg)
    "instant_health": ("Heal", "#d8573c", "Positive", "Restores health at once.", sym(HEART)),
    "instant_damage": ("Harm", "#7a2e3a", "Negative", "Deals damage at once.", sym(HEART) + sym("M50 36 L44 50 L54 54 L48 70", INK, 2.5)),
    "regeneration": ("Regeneration", "#e98fa8", "Positive", "Slowly restores health over time.", sym(HEART) + sym("M42 52 Q50 42 58 52", "#e98fa8", 3)),
    "poison": ("Poison", "#7caa52", "Negative", "Drains health over time (never below one heart).", sym(DROP, "#c8e6a0") + sym("M44 52 L56 64 M56 52 L44 64", INK, 2)),
    "health_boost": ("Health Boost", "#e8803a", "Positive", "Adds extra maximum health.", sym(HEART) + sym("M50 42 V62 M40 52 H60", "#e8803a", 4)),
    "absorption": ("Absorption", "#e8c45a", "Positive", "Golden hearts that soak up damage first.", sym(SHIELD, "#fbe8a8") + sym(HEART.replace("74", "64").replace("38", "44"), "#e8c45a")),
    "saturation": ("Well Fed", "#c88a4a", "Positive", "Energy drains more slowly.", sym("M40 64 Q30 44 44 30 Q58 22 66 36 Q72 50 58 58 Z") + sym("M42 62 L30 76", WHITE, 5)),
    "hunger": ("Queasy", "#8a9a6e", "Negative", "Energy drains faster.", sym("M30 40 Q40 32 50 40 T70 40 M30 54 Q40 46 50 54 T70 54", WHITE, 4)),
    "strength": ("Strength", "#c0433a", "Positive", "Hits harder.", sym("M50 18 L58 28 V58 H42 V28 Z") + sym("M32 60 H68", "#e8c45a", 5) + sym("M50 64 V78", "#8a6544", 5)),
    "weakness": ("Weakness", "#6a6670", "Negative", "Hits softer.", '<g transform="rotate(35 50 60)">' + sym("M50 18 L58 28 V58 H42 V28 Z", "#d9d0c4") + sym("M46 34 L54 40 L47 46", INK, 1.6) + sym("M32 60 H68", "#b9b3a8", 5) + sym("M50 64 V78", "#8a6544", 5) + "</g>"),
    "haste": ("Haste", "#e8c45a", "Positive", "Mines and swings faster.", sym(PICK) + sym("M50 38 V74", "#c9a57a", 4) + sym("M70 58 l6 0 M68 66 l8 2", WHITE, 2.5)),
    "mining_fatigue": ("Fatigue", "#5a6a8a", "Negative", "Mines and swings slower.", sym(PICK) + sym("M50 38 V74", "#c9a57a", 4) + sym("M62 56 h8 l-8 8 h8", WHITE, 2)),
    "speed": ("Swiftness", "#5fa8d0", "Positive", "Moves faster.", sym("M40 30 H56 V56 L70 60 Q74 70 66 72 H40 Z") + sym("M22 44 H34 M18 54 H32 M22 64 H34", WHITE, 3)),
    "slowness": ("Slowness", "#7a8a9a", "Negative", "Moves slower.", sym("M26 66 Q26 56 40 56 H62 Q74 56 74 66 Z") + sym("M54 56 A12 12 0 1 0 54 40 A6 6 0 1 0 50 48", "#d9c8a8", 0) + sym("M28 56 Q22 46 26 40", WHITE, 2.5)),
    "jump_boost": ("Leaping", "#7cc28a", "Positive", "Jumps higher; softens falls.", sym("M50 22 L66 42 H56 V70 H44 V42 H34 Z")),
    "levitation": ("Floating", "#c3a8f0", "Neutral", "Drifts slowly upward.", sym(FEATHER) + sym("M50 74 V60 M44 66 L50 60 L56 66", WHITE, 3)),
    "slow_falling": ("Featherfall", "#f2ece0", "Positive", "Falls gently and takes no fall damage.", sym(FEATHER, "#ffffff") + sym("M30 30 V44 M24 38 L30 44 L36 38", INK, 2)),
    "luck": ("Luck", "#6fbf73", "Positive", "Better finds when fishing and opening chests.", sil(CLOVER) + f'<g fill="{WHITE}">{CLOVER}</g>' + sym("M50 56 Q52 66 58 72", WHITE, 3)),
    "unluck": ("Bad Luck", "#6a7a4a", "Negative", "Worse finds when fishing and opening chests.", sil(CLOVER) + f'<g fill="#c8c0a8">{CLOVER}</g>' + sym("M36 34 L64 62", INK, 2.5)),
    "glowing": ("Glowing", "#f3e06a", "Neutral", "Outlined and visible through walls.", sym("M50 36 A14 14 0 1 0 50.1 36 Z", "#fff6c8") + "".join(sym(f"M{50 + 20*math.cos(math.radians(a)):.1f} {50 + 20*math.sin(math.radians(a)):.1f} L{50 + 28*math.cos(math.radians(a)):.1f} {50 + 28*math.sin(math.radians(a)):.1f}", WHITE, 2.5) for a in range(0, 360, 45))),
    "invisibility": ("Invisibility", "#a9b8c8", "Positive", "Unseen by most creatures.", f'<path d="M34 72 V44 Q34 26 50 26 Q66 26 66 44 V72 L58 66 L50 72 L42 66 Z" fill="none" stroke="{WHITE}" stroke-width="3.5" stroke-dasharray="6 5"/>' + '<circle cx="44" cy="44" r="3" fill="#fbf8f0"/><circle cx="56" cy="44" r="3" fill="#fbf8f0"/>'),
    "night_vision": ("Night Sight", "#3d5a9e", "Positive", "See clearly in the dark.", sym(EYE) + f'<circle cx="50" cy="50" r="9" fill="{INK}"/>' + sym("M68 26 A9 9 0 1 0 74 38 A7 7 0 1 1 68 26 Z", "#f3e06a")),
    "blindness": ("Blindness", "#3a3633", "Negative", "Vision shrinks to a few steps.", sym(EYE, "#b9b3a8") + sym("M28 28 L72 72", WHITE, 3)),
    "nausea": ("Dizzy", "#8aa872", "Negative", "The view sways and blurs.", sym("M50 50 m-4 0 a4 4 0 1 1 8 0 a10 10 0 1 1 -20 0 a16 16 0 1 1 32 0 a22 22 0 1 1 -44 0", WHITE, 3)),
    "water_breathing": ("Water Breathing", "#4f9ac8", "Positive", "Breathe underwater.", "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{WHITE}" stroke="{INK}" stroke-width="2.5"/>' for x, y, r in ((44, 60, 12), (62, 40, 8), (40, 32, 5)))),
    "fire_resistance": ("Fire Resistance", "#e08a3a", "Positive", "Immune to fire and lava.", sym(SHIELD) + sym(FLAME.replace("22", "34").replace("76", "68"), "#e08a3a")),
    "resistance": ("Resistance", "#8f8a80", "Positive", "Takes less damage from everything.", sym(SHIELD) + sym("M50 30 V68 M34 44 H66", "#8f8a80", 3)),
}

EFFECT_SOURCES = {
    "instant_health": "Potion of Healing",
    "instant_damage": "Potion of Harming",
    "regeneration": "Gilded Apple, Potion of Regeneration",
    "poison": "Pufferfish, Green Potato, Spider Eye, Potion of Poison",
    "health_boost": "—",
    "absorption": "Gilded Apple",
    "saturation": "Hearty meals",
    "hunger": "Spoiled Meat, Raw Chicken",
    "strength": "Potion of Strength",
    "weakness": "Potion of Weakness",
    "speed": "Potion of Swiftness",
    "slowness": "Potion of Slowness",
    "jump_boost": "Potion of Leaping",
    "slow_falling": "Potion of Featherfall",
    "luck": "Potion of Luck",
    "night_vision": "Gilded Carrot, Potion of Night Sight",
    "invisibility": "Potion of Invisibility",
    "water_breathing": "Potion of Water Breathing",
    "fire_resistance": "Potion of Fire Resistance",
    "nausea": "Pufferfish",
}

EFFECT_EXCLUDED = (
    "wither", "darkness", "conduit_power", "dolphins_grace", "breath_of_the_nautilus", "hero_of_the_village",
    "bad_omen", "raid_omen", "trial_omen", "infested", "oozing", "weaving", "wind_charged",
)


# --- potions -------------------------------------------------------------------------------------

POTIONS = {
    # brew id in reference: (Sōzō name, effect id, colour, ingredient, duration)
    "healing": ("Healing", "instant_health", "#d8573c", "Honey Bottle", "Instant"),
    "harming": ("Harming", "instant_damage", "#7a2e3a", "Green Potato", "Instant"),
    "regeneration": ("Regeneration", "regeneration", "#e98fa8", "Gilded Apple", "0:45"),
    "strength": ("Strength", "strength", "#c0433a", "Iron Nugget", "3:00"),
    "swiftness": ("Swiftness", "speed", "#5fa8d0", "Sugar", "3:00"),
    "leaping": ("Leaping", "jump_boost", "#7cc28a", "Rabbit Hide", "3:00"),
    "night_vision": ("Night Sight", "night_vision", "#3d5a9e", "Gilded Carrot", "3:00"),
    "invisibility": ("Invisibility", "invisibility", "#a9b8c8", "Ink Sac", "3:00"),
    "water_breathing": ("Water Breathing", "water_breathing", "#4f9ac8", "Pufferfish", "3:00"),
    "fire_resistance": ("Fire Resistance", "fire_resistance", "#e08a3a", "Ember", "3:00"),
    "slow_falling": ("Featherfall", "slow_falling", "#f2ece0", "Feather", "1:30"),
    "poison": ("Poison", "poison", "#7caa52", "Spider Eye", "0:45"),
    "weakness": ("Weakness", "weakness", "#6a6670", "Spoiled Meat", "1:30"),
    "slowness": ("Slowness", "slowness", "#7a8a9a", "Snowball", "1:30"),
    "luck": ("Luck", "luck", "#6fbf73", "Emerald", "5:00"),
}


def potion(color: str, form: str = "drink", liquid_level: float = 0.55) -> str:
    """A potion bottle. form: drink (round flask), splash (squat flask with handle), mist (flask + cloud)."""
    if form == "splash":
        glass = "M42 26 H58 V34 Q82 40 82 64 Q82 88 50 88 Q18 88 18 64 Q18 40 42 34 Z"
        cork = R(41, 14, 18, 13, 3)
        handle = line_part("M58 32 Q80 24 76 44", "#d8eaec", 4)
    else:
        glass = "M42 24 H58 V34 Q76 42 76 64 Q76 90 50 90 Q24 90 24 64 Q24 42 42 34 Z"
        cork = R(41, 10, 18, 15, 3)
        handle = ""
    out = handle + sil(P(glass), cork)
    out += fill(P(glass), "#e4f0f0")
    top = 90 - (90 - 40) * liquid_level - 8
    out += clipped(glass, f'<rect x="0" y="{top}" width="100" height="100" fill="{shade(color, MID)}"/><rect x="0" y="{top}" width="44" height="100" fill="{shade(color, LIGHT)}"/><ellipse cx="50" cy="{top}" rx="30" ry="4" fill="{shade(color, 1.3)}"/>')
    out += clipped(glass, '<path d="M60 34 Q78 46 74 82 L100 82 V20 Z" fill="#000000" fill-opacity="0.12"/>')
    out += f'<path d="{glass}" fill="none" stroke="{INK}" stroke-width="{EDGE}"/>'
    out += fill(cork, "#b8885a") + f'<rect x="43" y="{12 if form != "splash" else 16}" width="5" height="10" rx="2" fill="#d8a878"/>'
    out += '<path d="M32 52 Q30 64 36 78" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-opacity="0.85"/>'
    if form == "mist":
        for x, y, r in ((70, 22, 9), (80, 30, 7), (62, 14, 6)):
            out += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{shade(color, 1.35)}" stroke="{INK}" stroke-width="2" fill-opacity="0.9"/>'
    return out + glint(64, 50, 3.5)


# --- particles -----------------------------------------------------------------------------------


def puff(color: str, n=4, scale=1.0) -> str:
    pts = ((50, 56, 20), (34, 52, 14), (66, 52, 15), (48, 38, 15), (62, 40, 11))[:n + 1]
    pts = [(50 + (x - 50) * scale, 50 + (y - 50) * scale, r * scale) for x, y, r in pts]
    out = sil(*[Ci(x, y, r) for x, y, r in pts])
    for x, y, r in pts:
        out += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{shade(color, MID)}"/>'
    for x, y, r in pts:
        out += f'<circle cx="{x - r*0.25:.1f}" cy="{y - r*0.3:.1f}" r="{r*0.65:.1f}" fill="{shade(color, LIGHT)}"/>'
    return out


def spark(color: str, r=30, points=4, cx=50, cy=50) -> str:
    pts = []
    for k in range(points * 2):
        a = math.radians(k * 180 / points - 90)
        rr = r if k % 2 == 0 else r * 0.32
        pts.append(f"{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}")
    d = "M" + " L".join(pts) + " Z"
    return sil(P(d)) + toned(d, color, f"M{cx - r} {cy - r} H{cx} V{cy + r} H{cx - r} Z", None)


def drip(color: str, falling=False) -> str:
    d = "M50 20 Q66 44 66 58 Q66 76 50 76 Q34 76 34 58 Q34 44 50 20 Z" if falling else "M50 30 Q64 50 64 62 Q64 78 50 78 Q36 78 36 62 Q36 50 50 30 Z"
    if not falling:
        return line_part("M26 18 H74", "#8f8a80", 5) + line_part("M50 18 V30", color, 4) + sil(P(d)) + toned(d, color, "M20 10 H48 V90 H20 Z", "M58 10 H80 V90 H58 Z") + glint(44, 58, 3.5)
    return sil(P(d)) + toned(d, color, "M20 10 H48 V90 H20 Z", "M58 10 H80 V90 H58 Z") + glint(44, 56, 3.5)


def petal(color: str) -> str:
    d = "M50 18 Q74 34 66 62 Q58 82 50 84 Q42 82 34 62 Q26 34 50 18 Z"
    return sil(P(d)) + toned(d, color, "M20 10 H50 V90 H20 Z", None) + f'<path d="M50 26 V78" stroke="{shade(color, 0.7)}" stroke-width="2"/>'


def leaf_p(color: str) -> str:
    d = "M20 74 Q24 30 76 22 Q74 66 28 80 Z"
    return sil(P(d)) + toned(d, color, "M20 74 Q24 30 76 22 Q50 40 28 78 Z", None) + f'<path d="M24 76 Q46 50 72 26" fill="none" stroke="{shade(color, 0.65)}" stroke-width="2"/>'


def flame(color="#e08a3a", small=False) -> str:
    s = 0.7 if small else 1
    d = f"M50 {50 - 32*s} Q{50 + 22*s} {50 - 6*s} {50 + 20*s} {50 + 12*s} Q{50 + 18*s} {50 + 30*s} 50 {50 + 32*s} Q{50 - 18*s} {50 + 30*s} {50 - 20*s} {50 + 12*s} Q{50 - 20*s} {50 - 4*s} {50 - 8*s} {50 - 14*s} Q{50 - 6*s} 50 50 {50 + 2*s} Q{50 - 2*s} {50 - 16*s} 50 {50 - 32*s} Z"
    inner = f"M50 {50 + 2*s} Q{50 + 14*s} {50 + 16*s} {50 + 10*s} {50 + 26*s} Q50 {50 + 30*s} {50 - 10*s} {50 + 26*s} Q{50 - 12*s} {50 + 14*s} 50 {50 + 2*s} Z"
    return sil(P(d)) + toned(d, color, None, None) + fill(P(inner), "#f3cf6a", edge=False)


def ring_burst(color: str) -> str:
    out = ""
    for k in range(8):
        a = math.radians(k * 45)
        out += line_part(f"M{50 + 14*math.cos(a):.1f} {50 + 14*math.sin(a):.1f} L{50 + 34*math.cos(a):.1f} {50 + 34*math.sin(a):.1f}", color, 5)
    return out + sil(Ci(50, 50, 9)) + f'<circle cx="50" cy="50" r="9" fill="{color}"/>'


def note() -> str:
    d = "M40 70 A10 8 0 1 1 40 69.9 Z"
    out = line_part("M48 68 V26 L70 20 V34 L48 40", "#3f7f86", 5)
    return out + sil(P(d)) + fill(P(d), "#3f7f86")


def snowflake() -> str:
    out = ""
    for k in range(6):
        a = math.radians(k * 60)
        x, y = 50 + 32 * math.cos(a), 50 + 32 * math.sin(a)
        out += line_part(f"M50 50 L{x:.1f} {y:.1f}", "#e8f2f8", 4)
        for t in (0.55,):
            bx, by = 50 + 32 * t * math.cos(a), 50 + 32 * t * math.sin(a)
            for da in (-40, 40):
                b = a + math.radians(da)
                out += line_part(f"M{bx:.1f} {by:.1f} l{9*math.cos(b):.1f} {9*math.sin(b):.1f}", "#e8f2f8", 3)
    return out


def bolt() -> str:
    d = "M56 14 L30 54 H48 L40 86 L72 42 H54 Z"
    return sil(P(d)) + toned(d, "#f3e06a", "M56 14 L30 54 H48 L44 70 Z", None)


def bubble(pop=False) -> str:
    if pop:
        return "".join(line_part(f"M{50 + 14*math.cos(math.radians(a)):.1f} {50 + 14*math.sin(math.radians(a)):.1f} L{50 + 28*math.cos(math.radians(a)):.1f} {50 + 28*math.sin(math.radians(a)):.1f}", "#bfe0ec", 4) for a in range(0, 360, 60))
    return f'<circle cx="50" cy="50" r="26" fill="#bfe0ec" fill-opacity="0.6" stroke="{INK}" stroke-width="5"/><path d="M36 42 Q40 32 50 30" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>'


def swirl(color: str) -> str:
    return line_part("M50 50 m-4 0 a4 4 0 1 1 8 0 a10 10 0 1 1 -20 0 a16 16 0 1 1 32 0 a22 22 0 1 1 -44 0", color, 5) + spark(color, 8, 4, 76, 26)


def slash() -> str:
    d = "M18 74 Q30 26 82 20 Q46 36 30 78 Z"
    return sil(P(d)) + toned(d, "#e8eef2", "M18 74 Q30 26 82 20 Q40 34 26 74 Z", None)


def angry() -> str:
    return puff("#5a5652", 3) + bolt().replace("M56 14", "M56 40").replace("L30 54", "L42 62").replace("H48 L40 86", "H52 L46 86").replace("L72 42 H54", "L66 60 H56") if False else puff("#5a5652", 3) + line_part("M52 60 L44 74 H54 L46 88", "#f3e06a", 3.5)


def dust(color: str) -> str:
    return "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" stroke="{INK}" stroke-width="2.5"/>' for x, y, r in ((40, 44, 8), (60, 38, 5), (56, 60, 6), (34, 64, 4), (70, 56, 3.5)))


def rain() -> str:
    return "".join(line_part(f"M{x} {y} l-6 18", "#7ab0d0", 4) for x, y in ((40, 20), (62, 30), (48, 52), (70, 60), (30, 62)))


def explosion() -> str:
    return spark("#e8803a", 40, 8) + spark("#f3cf6a", 22, 8)


PARTICLES = {
    # id: (Sōzō name, category, when, drawing)
    "heart": ("Heart", "Combat", "Taming or breeding creatures", lambda: sil(P(HEART)) + toned(HEART, "#d8573c", "M20 20 H50 V80 H20 Z", None) + glint(36, 40, 3)),
    "crit": ("Crit Spark", "Combat", "A critical hit", lambda: spark("#f2ece0", 32, 4)),
    "sweep_attack": ("Sweep", "Combat", "A sweeping sword swing", slash),
    "angry_villager": ("Storm Cloud", "Combat", "An annoyed creature", angry),
    "happy_villager": ("Sparkle", "Magic", "Plant growth, trading, happy creatures", lambda: spark("#7cc28a", 28, 4) + spark("#a8d8a0", 10, 4, 74, 28)),
    "firefly": ("Firefly", "Nature", "Around firefly bushes at night", lambda: f'<circle cx="50" cy="50" r="22" fill="#f3e06a" fill-opacity="0.35"/>' + sil(Ci(50, 50, 9)) + '<circle cx="50" cy="50" r="9" fill="#f6e88a"/>'),
    "cherry_leaves": ("Cherry Petal", "Nature", "Falling from cherry leaves", lambda: petal("#f0b8c8")),
    "red_poplar_leaves": ("Red Leaf", "Nature", "Falling from red poplar leaves", lambda: leaf_p("#c0533a")),
    "orange_poplar_leaves": ("Orange Leaf", "Nature", "Falling from orange poplar leaves", lambda: leaf_p("#df8a45")),
    "yellow_poplar_leaves": ("Yellow Leaf", "Nature", "Falling from yellow poplar leaves", lambda: leaf_p("#e8c45a")),
    "bubble": ("Bubble", "Water", "Underwater, from breathing creatures", lambda: bubble()),
    "bubble_pop": ("Bubble Pop", "Water", "A bubble reaching the surface", lambda: bubble(True)),
    "splash": ("Splash", "Water", "Things landing in water", lambda: "".join(f'<g transform="translate({dx} {dy}) scale(0.42) rotate({rot} 50 50)">{drip("#7ab0d0", True)}</g>' for dx, dy, rot in ((8, 30, -30), (29, 10, 0), (50, 30, 30))) + line_part("M18 82 Q50 72 82 82", "#7ab0d0", 4)),
    "rain": ("Rain", "Weather", "Rain falling", rain),
    "dripping_water": ("Water Drip", "Water", "Water seeping through a ceiling", lambda: drip("#5d8fa8")),
    "falling_water": ("Falling Drop", "Water", "A water drop falling", lambda: drip("#5d8fa8", True)),
    "dripping_lava": ("Lava Drip", "Fire", "Lava seeping through a ceiling", lambda: drip("#e07a3a")),
    "dripping_honey": ("Honey Drip", "Nature", "Honey dripping from a full hive", lambda: drip("#e8a83a")),
    "lava": ("Ember", "Fire", "Sparks popping from lava", lambda: spark("#e07a3a", 22, 4) + f'<circle cx="50" cy="50" r="5" fill="#f3cf6a"/>'),
    "flame": ("Flame", "Fire", "Torches, furnaces, fire", lambda: flame()),
    "small_flame": ("Small Flame", "Fire", "Candles", lambda: flame(small=True)),
    "smoke": ("Smoke", "Smoke", "Fires and furnaces", lambda: puff("#7d7870", 3, 0.8)),
    "large_smoke": ("Large Smoke", "Smoke", "Big fires", lambda: puff("#5a5652", 4)),
    "white_smoke": ("White Smoke", "Smoke", "Steam and quenching", lambda: puff("#e2ddd4", 4, 0.9)),
    "cloud": ("Cloud", "Weather", "Dust kicked up; clouds", lambda: puff("#f6f1e6", 4)),
    "poof": ("Poof", "Smoke", "A creature vanishing", lambda: puff("#d9d0c4", 4, 0.75) + spark("#ffffff", 8, 4, 74, 28)),
    "campfire_cosy_smoke": ("Campfire Smoke", "Smoke", "Rising from a campfire", lambda: puff("#a9a59c", 2, 0.7) + puff("#c4beb2", 2, 0.45).replace("<g", "<g", 1)),
    "snowflake": ("Snowflake", "Weather", "Snow falling", snowflake),
    "dust": ("Dust", "Nature", "Dust and pollen in the air", lambda: dust("#c8b48a")),
    "ash": ("Ash", "Fire", "Ash drifting from fires", lambda: dust("#6a6660")),
    "explosion": ("Explosion", "Fire", "Blast Barrels and Blast Fruit", explosion),
    "firework": ("Firework Spark", "Magic", "Firework rockets bursting", lambda: ring_burst("#e98fa8")),
    "note": ("Music Note", "Magic", "Chime blocks being played", note),
    "glow": ("Glow", "Magic", "Glowing creatures and lights", lambda: f'<circle cx="50" cy="50" r="28" fill="#f3e06a" fill-opacity="0.3"/>' + spark("#fff6c8", 22, 4)),
    "electric_spark": ("Electric Spark", "Weather", "Lightning rods during storms", bolt),
    "effect": ("Magic Swirl", "Magic", "Creatures under a status effect", lambda: swirl("#a98ad8")),
    "instant_effect": ("Instant Sparkle", "Magic", "Instant potions taking effect", lambda: spark("#f2ece0", 30, 6)),
    "witch": ("Witch Magic", "Magic", "Witches casting", lambda: spark("#86629e", 26, 5) + spark("#c3a8f0", 10, 4, 72, 26)),
    "underwater": ("Underwater Mote", "Water", "Floating specks underwater", lambda: dust("#a9cfd8")),
}

PARTICLE_FOLD = {
    "dripping_dripstone_water": "dripping_water",
    "falling_dripstone_water": "falling_water",
    "dripping_dripstone_lava": "dripping_lava",
    "falling_lava": "dripping_lava",
    "falling_dripstone_lava": "dripping_lava",
    "landing_lava": "dripping_lava",
    "falling_honey": "dripping_honey",
    "landing_honey": "dripping_honey",
    "falling_nectar": "dripping_honey",
    "campfire_signal_smoke": "campfire_cosy_smoke",
    "fishing": "splash",
    "bubble_column_up": "bubble",
    "current_down": "bubble",
    "dust_color_transition": "dust",
    "falling_dust": "dust",
    "dust_plume": "dust",
    "white_ash": "ash",
    "explosion_emitter": "explosion",
    "entity_effect": "effect",
    "tinted_leaves": "red_poplar_leaves",
}
