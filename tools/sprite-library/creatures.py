"""Batch 4 sprites: creatures, the player, vehicles and placed objects.

Creature figures live in bodies.py (full-body, as they look in the world); the portrait helpers
below are kept for UI use (e.g. a future bestiary).

Creatures are soft, rounded portraits (head and shoulders, or a whole small animal), lit
left-light / right-dark in three toon tones with a bold ink silhouette: the same recipe as every
other Sōzō sprite (itemkit.py), and deliberately unlike blocky models.
"""

from __future__ import annotations

import math

from geometry import INK, shade
from itemkit import DARK, EDGE, LIGHT, MID, Ci, R, clipped, fill, glint, line_part, lit, sil, toned
from itemkit import Pd as P

import items_food as food
import bodies as B
from materials import WOODS


def ell(cx, cy, rx, ry) -> str:
    return f"M{cx - rx} {cy} A{rx} {ry} 0 1 0 {cx + rx} {cy} A{rx} {ry} 0 1 0 {cx - rx} {cy} Z"


def part(d: str, color: str) -> str:
    """A body part: ink outline, three-tone fill and a thin inner edge."""
    return sil(P(d)) + lit(d, color) + f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{EDGE}" stroke-opacity="0.75"/>'


def flat(d: str, color: str) -> str:
    return fill(P(d), color)


def eyes(y=52, gap=13, r=5.5, cx=50, kind="dot", white=False, color=INK) -> str:
    out = ""
    for x in (cx - gap, cx + gap):
        if kind == "slit":
            out += f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r*1.1}" fill="#e8c45a" stroke="{INK}" stroke-width="1.4"/><ellipse cx="{x}" cy="{y}" rx="1.4" ry="{r*0.9}" fill="{INK}"/>'
        elif kind == "hollow":
            out += f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r*1.15}" fill="{INK}"/>'
            continue
        elif kind == "sleepy":
            out += f'<path d="M{x-r} {y} Q{x} {y+r} {x+r} {y}" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>'
            continue
        elif kind == "glow":
            out += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" stroke="{INK}" stroke-width="1.4"/>'
            continue
        else:
            if white:
                out += f'<circle cx="{x}" cy="{y}" r="{r+2.5}" fill="#f6f1e6" stroke="{INK}" stroke-width="1.4"/>'
            out += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/>'
        out += f'<circle cx="{x - r*0.35:.1f}" cy="{y - r*0.4:.1f}" r="{max(1.2, r*0.32):.1f}" fill="#ffffff"/>'
    return out


def cheeks(y=62, gap=22, cx=50) -> str:
    return "".join(f'<ellipse cx="{x}" cy="{y}" rx="5" ry="3" fill="#e98fa8" fill-opacity="0.55"/>' for x in (cx - gap, cx + gap))


def ear(x, y, ang, length, width, color, inner=None) -> str:
    a = math.radians(ang)
    tx, ty = x + length * math.cos(a), y + length * math.sin(a)
    nx, ny = -math.sin(a) * width, math.cos(a) * width
    d = f"M{x + nx:.1f} {y + ny:.1f} Q{tx + nx*0.6:.1f} {ty + ny*0.6:.1f} {tx:.1f} {ty:.1f} Q{tx - nx*0.6:.1f} {ty - ny*0.6:.1f} {x - nx:.1f} {y - ny:.1f} Z"
    out = part(d, color)
    if inner:
        nx2, ny2 = nx * 0.45, ny * 0.45
        tx2, ty2 = x + length * 0.75 * math.cos(a), y + length * 0.75 * math.sin(a)
        out += flat(f"M{x + nx2:.1f} {y + ny2:.1f} Q{tx2 + nx2*0.6:.1f} {ty2 + ny2*0.6:.1f} {tx2:.1f} {ty2:.1f} Q{tx2 - nx2*0.6:.1f} {ty2 - ny2*0.6:.1f} {x - nx2:.1f} {y - ny2:.1f} Z", inner)
    return out


HEAD = ell(50, 56, 32, 30)


# --- farm animals -------------------------------------------------------------------------------


def chicken() -> str:
    out = part("M38 22 Q40 10 46 16 Q50 6 54 16 Q60 10 62 22 Z", "#d8573c")
    out += part(ell(50, 54, 28, 30), "#f6f1e6")
    out += eyes(46, 11, 4.5)
    out += part("M40 56 L60 56 L50 70 Z", "#e8b04a")
    out += part("M46 70 Q50 84 54 70 Z", "#d8573c")
    return out


def pig() -> str:
    out = ear(28, 32, -130, 18, 8, "#e9a0b4", "#d8808e") + ear(72, 32, -50, 18, 8, "#e9a0b4", "#d8808e")
    out += part(HEAD, "#f0b4c0")
    out += eyes(46, 14, 4.5)
    out += part(ell(50, 64, 14, 10), "#e090a0")
    out += f'<ellipse cx="45" cy="64" rx="2.6" ry="3.6" fill="{INK}"/><ellipse cx="55" cy="64" rx="2.6" ry="3.6" fill="{INK}"/>'
    return out + cheeks(60, 25)


def cow() -> str:
    out = part("M24 30 Q14 22 12 12 Q22 16 30 26 Z", "#ece2c0") + part("M76 30 Q86 22 88 12 Q78 16 70 26 Z", "#ece2c0")
    out += ear(22, 42, 180, 14, 6, "#f2ece0", "#e9a0b4") + ear(78, 42, 0, 14, 6, "#f2ece0", "#e9a0b4")
    out += part(HEAD, "#f2ece0")
    out += clipped(HEAD, '<path d="M18 30 Q34 26 40 42 Q30 52 18 48 Z" fill="#5a4436"/><ellipse cx="70" cy="38" rx="10" ry="8" fill="#5a4436"/>')
    out += eyes(48, 14, 4.5)
    out += part(ell(50, 70, 18, 12), "#e9a8b0")
    out += f'<ellipse cx="44" cy="70" rx="2.6" ry="3.4" fill="{INK}"/><ellipse cx="56" cy="70" rx="2.6" ry="3.4" fill="{INK}"/>'
    return out


def sheep(wool="#f2ece0") -> str:
    puffs = ((30, 34, 14), (50, 26, 15), (70, 34, 14), (22, 54, 13), (78, 54, 13), (30, 74, 13), (70, 74, 13), (50, 82, 13))
    out = sil(*[Ci(x, y, r) for x, y, r in puffs])
    for x, y, r in puffs:
        out += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{shade(wool, MID if x > 55 else LIGHT)}" stroke="{INK}" stroke-width="{EDGE}" stroke-opacity="0.5"/>'
    out += f'<circle cx="50" cy="56" r="26" fill="{shade(wool, LIGHT)}"/>'
    face = ell(50, 58, 15, 19)
    out += part(face, "#5a4a42")
    out += eyes(54, 7, 3.2, white=True)
    out += f'<path d="M46 68 Q50 71 54 68" fill="none" stroke="#2a221d" stroke-width="2" stroke-linecap="round"/>'
    return out


def goat() -> str:
    out = line_part("M38 30 Q30 10 16 14", "#b9b3a8", 6) + line_part("M62 30 Q70 10 84 14", "#b9b3a8", 6)
    out += ear(24, 46, 170, 14, 5, "#ece6da", "#e9a0b4") + ear(76, 46, 10, 14, 5, "#ece6da", "#e9a0b4")
    out += part("M28 44 Q30 22 50 22 Q70 22 72 44 Q72 70 56 80 H44 Q28 70 28 44 Z", "#ece6da")
    out += eyes(46, 11, 4.5, kind="slit")
    out += f'<ellipse cx="46" cy="70" rx="2" ry="2.6" fill="{INK}"/><ellipse cx="54" cy="70" rx="2" ry="2.6" fill="{INK}"/>'
    out += part("M44 80 Q50 98 56 80 Z", "#d9d0bc")
    return out


def equine(coat: str, mane: str, ears_long=False, muzzle="#d9c0a0") -> str:
    ln = 26 if ears_long else 15
    out = ear(38, 26, -105, ln, 6, coat, shade(coat, 0.75)) + ear(62, 26, -75, ln, 6, coat, shade(coat, 0.75))
    out += part("M30 40 Q32 20 50 20 Q68 20 70 40 L66 74 Q50 92 34 74 Z", coat)
    if mane:
        out += part("M44 16 Q50 10 56 16 L56 34 Q50 30 44 34 Z", mane)
    out += eyes(44, 13, 4.5)
    out += part(ell(50, 76, 15, 11), muzzle)
    out += f'<ellipse cx="45" cy="76" rx="2.2" ry="3" fill="{INK}"/><ellipse cx="55" cy="76" rx="2.2" ry="3" fill="{INK}"/>'
    return out


def llama() -> str:
    out = part("M30 28 Q24 8 32 4 Q38 14 38 28 Z", "#ece2c8") + part("M70 28 Q76 8 68 4 Q62 14 62 28 Z", "#ece2c8")
    out += part("M30 36 Q30 16 50 16 Q70 16 70 36 V70 Q50 92 30 70 Z", "#ece2c8")
    out += clipped("M30 36 Q30 16 50 16 Q70 16 70 36 V70 Q50 92 30 70 Z", '<path d="M30 20 Q50 30 70 20 V30 Q50 38 30 30 Z" fill="#f6f1e6"/>')
    out += eyes(44, 11, 4.5)
    out += part(ell(50, 70, 11, 9), "#d9c8a8")
    out += f'<path d="M46 70 L50 74 L54 70" fill="none" stroke="{INK}" stroke-width="2"/>'
    return out


def camel() -> str:
    out = ear(30, 34, -140, 10, 5, "#d8b47a") + ear(70, 34, -40, 10, 5, "#d8b47a")
    out += part("M28 44 Q30 22 50 22 Q70 22 72 44 Q72 74 58 84 H42 Q28 74 28 44 Z", "#d8b47a")
    out += eyes(46, 12, 4.5, kind="sleepy")
    out += f'<path d="M34 42 Q42 38 46 42 M54 42 Q58 38 66 42" fill="none" stroke="{INK}" stroke-width="2"/>'
    out += part(ell(50, 74, 14, 9), "#c8a068")
    out += f'<path d="M44 74 L48 74 M52 74 L56 74" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>'
    return out


def rabbit(coat="#c8a888") -> str:
    out = ear(40, 32, -100, 30, 7, coat, "#e9a0b4") + ear(60, 32, -80, 30, 7, coat, "#e9a0b4")
    out += part(ell(50, 62, 26, 24), coat)
    out += eyes(58, 11, 4.5)
    out += f'<path d="M47 66 L50 69 L53 66 Z" fill="#e98fa8" stroke="{INK}" stroke-width="1.2"/>'
    out += f'<path d="M50 69 V73 M50 73 Q46 76 43 74 M50 73 Q54 76 57 74" fill="none" stroke="{INK}" stroke-width="1.6"/>'
    return out + cheeks(68, 17)


def fox() -> str:
    out = ear(30, 38, -115, 22, 9, "#df8a45", "#2a221d") + ear(70, 38, -65, 22, 9, "#df8a45", "#2a221d")
    face = "M16 46 Q22 26 50 26 Q78 26 84 46 L50 86 Z"
    out += part(face, "#df8a45")
    out += clipped(face, '<path d="M16 46 Q36 52 50 86 Q30 70 16 46 Z M84 46 Q64 52 50 86 Q70 70 84 46 Z" fill="#f6f1e6"/>')
    out += eyes(50, 13, 4, kind="dot")
    out += f'<ellipse cx="50" cy="80" rx="4.5" ry="3.5" fill="{INK}"/>'
    return out


def feline(coat: str, mark: str, spots=False) -> str:
    out = ear(30, 36, -110, 20, 9, coat, "#e9a0b4") + ear(70, 36, -70, 20, 9, coat, "#e9a0b4")
    out += part(ell(50, 58, 30, 26), coat)
    if spots:
        out += clipped(ell(50, 58, 30, 26), "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="{mark}"/>' for x, y in ((30, 46), (40, 36), (62, 38), (72, 50), (28, 64), (70, 68))))
    else:
        out += clipped(ell(50, 58, 30, 26), f'<path d="M44 32 L46 44 M50 30 V44 M56 32 L54 44 M22 54 L32 56 M78 54 L68 56" stroke="{mark}" stroke-width="3.5" stroke-linecap="round"/>')
    out += eyes(56, 13, 5.5, kind="slit")
    out += f'<path d="M47 66 L50 69 L53 66 Z" fill="#e98fa8" stroke="{INK}" stroke-width="1.2"/>'
    out += f'<path d="M50 69 Q46 74 42 71 M50 69 Q54 74 58 71" fill="none" stroke="{INK}" stroke-width="1.6"/>'
    out += f'<path d="M28 66 L14 64 M28 70 L14 72 M72 66 L86 64 M72 70 L86 72" stroke="{INK}" stroke-width="1.4"/>'
    return out


def wolf() -> str:
    out = ear(32, 34, -105, 22, 9, "#a9a59c", "#e2ddd4") + ear(68, 34, -75, 22, 9, "#a9a59c", "#e2ddd4")
    face = "M20 50 Q22 26 50 26 Q78 26 80 50 Q78 70 62 78 L50 90 L38 78 Q22 70 20 50 Z"
    out += part(face, "#a9a59c")
    out += clipped(face, '<path d="M36 60 Q50 54 64 60 L56 92 H44 Z" fill="#ece6da"/>')
    out += eyes(50, 13, 4.5, kind="slit")
    out += f'<ellipse cx="50" cy="74" rx="5" ry="3.8" fill="{INK}"/>'
    return out


def bear(coat="#f2ece0", panda=False) -> str:
    ear_c = "#3a3633" if panda else coat
    out = part(ell(26, 32, 11, 11), ear_c) + part(ell(74, 32, 11, 11), ear_c)
    out += part(HEAD, coat)
    if panda:
        out += f'<ellipse cx="37" cy="52" rx="9" ry="11" fill="#3a3633" transform="rotate(-25 37 52)"/><ellipse cx="63" cy="52" rx="9" ry="11" fill="#3a3633" transform="rotate(25 63 52)"/>'
        out += eyes(52, 13, 3.4, color="#f6f1e6")
    else:
        out += eyes(50, 14, 4.2)
    out += part(ell(50, 68, 13, 10), "#ece6da" if not panda else "#f6f1e6")
    out += f'<ellipse cx="50" cy="64" rx="5" ry="3.6" fill="{INK}"/><path d="M50 67 V72 M50 72 Q46 75 43 73 M50 72 Q54 75 57 73" fill="none" stroke="{INK}" stroke-width="1.6"/>'
    return out


def armadillo() -> str:
    shell = "M14 66 Q16 30 50 28 Q84 30 86 66 Z"
    out = part(ell(18, 70, 10, 9), "#e0b0a0")
    out += part(shell, "#c8907a")
    out += clipped(shell, "".join(f'<path d="M{x} 28 Q{x-4} 50 {x} 70" fill="none" stroke="{shade("#c8907a", 0.6)}" stroke-width="2.5"/>' for x in (30, 42, 54, 66, 78)))
    out += f'<circle cx="16" cy="68" r="2" fill="{INK}"/>' + part("M24 64 Q18 56 22 50 Q26 56 26 62 Z", "#e0b0a0")
    return out + f'<rect x="24" y="66" width="8" height="10" rx="3" fill="#b07a64" stroke="{INK}" stroke-width="{EDGE}"/><rect x="66" y="66" width="8" height="10" rx="3" fill="#b07a64" stroke="{INK}" stroke-width="{EDGE}"/>'


# --- wild & water ---------------------------------------------------------------------------------


def turtle() -> str:
    out = part(ell(50, 26, 12, 11), "#7caa62")
    out += eyes(24, 5, 2.4)
    for x, y in ((24, 44), (76, 44), (26, 78), (74, 78)):
        out += part(ell(x, y, 9, 6), "#7caa62")
    shell = ell(50, 62, 28, 26)
    out += part(shell, "#5f8a4e")
    out += clipped(shell, f'<polygon points="50,46 62,54 58,68 42,68 38,54" fill="{shade("#5f8a4e", 1.25)}" stroke="{INK}" stroke-width="1.4"/><path d="M50 36 V46 M62 54 L76 48 M58 68 L66 84 M42 68 L34 84 M38 54 L24 48" stroke="{INK}" stroke-width="1.4"/>')
    return out


def frog() -> str:
    body = "M12 66 Q14 34 50 34 Q86 34 88 66 Q80 84 50 84 Q20 84 12 66 Z"
    out = part(ell(30, 32, 12, 11), "#7caa52") + part(ell(70, 32, 12, 11), "#7caa52")
    out += part(body, "#7caa52")
    out += eyes(31, 20, 6, white=True)
    out += f'<path d="M26 62 Q50 76 74 62" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>'
    return out + cheeks(66, 30) + clipped(body, '<ellipse cx="50" cy="84" rx="26" ry="10" fill="#e8e0a8"/>')


def tadpole() -> str:
    out = line_part("M58 54 Q76 40 92 56 Q80 52 70 64", "#5a5048", 6)
    out += part(ell(40, 54, 22, 18), "#5a5048")
    return out + eyes(48, 7, 3.2, white=True)


def axolotl() -> str:
    c = "#f0b8c8"
    out = ""
    for side in (-1, 1):
        for k, a in enumerate((-40, -10, 20)):
            x0, y0 = 50 + side * 26, 44 + k * 9
            ang = 180 - a if side < 0 else a
            out += line_part(f"M{x0} {y0} l{side*16} {math.sin(math.radians(a))*10 - 6:.1f}", "#d8607a", 5)
    out += part(ell(50, 58, 30, 24), c)
    out += eyes(54, 15, 4.2)
    out += f'<path d="M40 66 Q50 72 60 66" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>'
    return out + cheeks(64, 22)


def dolphin() -> str:
    body = "M8 60 Q20 34 56 36 Q80 38 92 30 Q86 46 92 62 Q74 54 60 66 Q34 80 8 60 Z"
    out = part("M46 38 L56 18 L62 38 Z", "#7d8a9a")
    out += part(body, "#8a9aaa")
    out += clipped(body, '<path d="M8 60 Q34 74 60 64 V90 H8 Z" fill="#e2ecf2"/>')
    out += f'<circle cx="22" cy="52" r="2.8" fill="{INK}"/><path d="M8 60 L2 62" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
    return out + part("M40 66 L46 80 L54 66 Z", "#7d8a9a")


def nautilus() -> str:
    shell = ell(56, 48, 32, 30)
    out = "".join(line_part(f"M26 {y} Q14 {y+6} 10 {y+14}", "#e0b090", 4) for y in (52, 60, 68))
    out += part(shell, "#f2e6d0")
    out += clipped(shell, "".join(f'<path d="M{56} {48} L{56 + 40*math.cos(math.radians(a)):.1f} {48 + 40*math.sin(math.radians(a)):.1f}" stroke="#c0634a" stroke-width="4"/>' for a in range(-80, 200, 36)))
    out += f'<path d="M56 48 m-6 0 a6 6 0 1 1 12 0 a10 10 0 1 1 -20 0 a14 14 0 1 1 28 0" fill="none" stroke="{INK}" stroke-width="1.6"/>'
    return out + f'<circle cx="30" cy="48" r="3" fill="{INK}"/>'


def squid() -> str:
    c = "#3d5a80"
    out = "".join(line_part(f"M{x} 64 Q{x + (x-50)*0.3} 82 {x + (x-50)*0.15 + 4} 94", shade(c, 1.15), 6) for x in (30, 40, 50, 60, 70))
    out += part("M24 60 Q22 12 50 8 Q78 12 76 60 Q50 72 24 60 Z", c)
    return out + eyes(48, 13, 5, white=True)


def bee() -> str:
    body = ell(48, 58, 30, 22)
    out = part(ell(56, 30, 16, 10), "#e2ecf2") + part(ell(40, 32, 14, 9), "#e2ecf2")
    out += part(body, "#e8c45a")
    out += clipped(body, '<rect x="40" y="30" width="10" height="60" fill="#3a3633"/><rect x="60" y="30" width="10" height="60" fill="#3a3633"/>')
    out += part("M78 58 L92 58 L78 64 Z", "#3a3633")
    out += eyes(54, 0, 4.2, cx=28)
    return out + f'<path d="M24 40 Q20 30 26 26 M30 40 Q30 30 36 28" fill="none" stroke="{INK}" stroke-width="2"/>'


def parrot() -> str:
    out = part("M40 60 Q34 86 48 96 Q56 82 56 62 Z", "#3f7f86")
    out += part("M24 46 Q26 18 50 18 Q76 20 74 50 Q72 74 50 76 Q28 72 24 46 Z", "#d0443a")
    out += part("M66 34 Q90 36 86 58 Q80 50 70 52 Z", "#f2e6c8")
    out += f'<path d="M80 48 Q84 54 82 58" fill="none" stroke="{INK}" stroke-width="2"/>'
    out += f'<circle cx="54" cy="38" r="7" fill="#f6f1e6" stroke="{INK}" stroke-width="1.4"/><circle cx="55" cy="38" r="3.5" fill="{INK}"/><circle cx="54" cy="37" r="1.2" fill="#ffffff"/>'
    return out + part("M30 54 Q22 70 34 76 Q40 66 40 56 Z", "#e8c45a")


def bat() -> str:
    wing = "M50 46 Q34 30 8 34 Q16 42 12 50 Q22 48 24 58 Q32 52 38 60 Z"
    out = part(wing, "#5a4a52") + part(wing.replace("M50", "M50").replace("34 30 8 34", "66 30 92 34").replace("16 42 12 50", "84 42 88 50").replace("22 48 24 58", "78 48 76 58").replace("32 52 38 60", "68 52 62 60"), "#5a4a52")
    out += part("M38 34 L36 20 L44 30 Z", "#6a5a62") + part("M62 34 L64 20 L56 30 Z", "#6a5a62")
    out += part(ell(50, 50, 15, 16), "#6a5a62")
    out += eyes(46, 6, 2.6, kind="glow", color="#e8c45a")
    return out + f'<path d="M46 56 L48 60 L50 56 L52 60 L54 56" fill="#f6f1e6" stroke="{INK}" stroke-width="1.2"/>'


# --- monsters & characters ------------------------------------------------------------------------


def zombie() -> str:
    head = ell(50, 54, 30, 30)
    out = part(head, "#94ab84")
    out += clipped(head, '<path d="M18 40 Q22 22 36 26 Q40 16 52 22 Q62 14 70 24 Q82 24 82 40 Q72 34 66 40 Q58 30 50 38 Q42 30 34 40 Q26 34 18 40 Z" fill="#4a4236"/><ellipse cx="70" cy="66" rx="6" ry="4" fill="#7a9068"/>')
    out += f'<circle cx="38" cy="52" r="7" fill="#f2ece0" stroke="{INK}" stroke-width="1.4"/><circle cx="39" cy="53" r="2.5" fill="{INK}"/>'
    out += f'<path d="M56 52 Q62 56 68 52" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>'
    out += f'<path d="M40 70 L44 66 L48 71 L52 66 L56 71 L60 67" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'
    return out


def skeleton() -> str:
    skull = "M22 50 Q20 16 50 16 Q80 16 78 50 Q78 64 70 68 V80 H30 V68 Q22 64 22 50 Z"
    out = part(skull, "#ece6da")
    out += eyes(48, 13, 7, kind="hollow")
    out += f'<path d="M46 66 L50 58 L54 66 Z" fill="{INK}"/>'
    return out + "".join(f'<rect x="{x}" y="70" width="5" height="9" fill="#f6f1e6" stroke="{INK}" stroke-width="1.2"/>' for x in (36, 42, 48, 54, 60))


def spider() -> str:
    out = ""
    for side in (-1, 1):
        for k, (dy, reach) in enumerate(((-14, 24), (-4, 28), (6, 28), (16, 24))):
            x0, y0 = 50 + side * 16, 56 + dy * 0.6
            out += line_part(f"M{x0} {y0} Q{x0 + side*reach*0.6:.1f} {y0 - 14:.1f} {x0 + side*reach:.1f} {y0 + dy*0.8 + 10:.1f}", "#3a3633", 4.5)
    out += part(ell(50, 66, 22, 18), "#3a3633") + part(ell(50, 44, 16, 14), "#4a4643")
    return out + "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#d8573c"/>' for x, y, r in ((44, 42, 3.4), (56, 42, 3.4), (40, 48, 2.2), (60, 48, 2.2)))


def puffball() -> str:
    c = "#c3a8f0"
    d = "M14 74 Q12 30 50 26 Q88 30 86 74 Q50 86 14 74 Z"
    out = part(d, c) + f'<ellipse cx="36" cy="44" rx="8" ry="5" fill="{shade(c, 1.4)}" transform="rotate(-25 36 44)"/>'
    out += eyes(56, 13, 5)
    out += f'<path d="M44 66 Q50 72 56 66" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>'
    return out + cheeks(64, 24) + glint(66, 40, 3.5)


def witch() -> str:
    out = part("M50 2 L74 40 H26 Z", "#5a3a6e")
    out += part(ell(50, 58, 24, 24), "#b8c890")
    out += part(ell(50, 40, 40, 7), "#4a2e5e")
    out += clipped("M50 2 L74 40 H26 Z", '<rect x="0" y="30" width="100" height="6" fill="#e8c45a"/>')
    out += eyes(54, 10, 4)
    out += part("M50 58 Q60 66 54 72 Q50 70 48 64 Z", "#a8b878") + '<circle cx="56" cy="68" r="2" fill="#6a7a4a"/>'
    return out + f'<path d="M42 74 Q50 78 58 74" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>'


def snowman() -> str:
    out = part(ell(50, 74, 28, 22), "#f6f1e6") + part(ell(50, 38, 22, 20), "#fbf8f0")
    out += part("M30 52 Q50 62 70 52 L72 60 Q50 70 28 60 Z", "#d8573c") + part("M60 58 L68 82 L60 82 L56 62 Z", "#d8573c")
    out += eyes(34, 8, 3.4)
    out += part("M50 40 L70 44 L50 46 Z", "#df8a45")
    return out + "".join(f'<circle cx="50" cy="{y}" r="2.6" fill="{INK}"/>' for y in (70, 80))


def player() -> str:
    hood = "M14 60 Q12 18 50 14 Q88 18 86 60 Q86 92 50 94 Q14 92 14 60 Z"
    out = part(hood, "#3f7f86")
    out += part(ell(50, 58, 22, 22), "#f0d0b0")
    out += clipped(ell(50, 58, 22, 22), '<path d="M26 40 Q40 46 50 36 Q60 46 76 40 V30 H26 Z" fill="#4a3a32"/>')
    out += eyes(58, 9, 3.6)
    out += f'<path d="M45 68 Q50 72 55 68" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>'
    out += part("M24 80 Q50 92 76 80 L78 90 Q50 100 22 90 Z", "#d8573c")
    return out + cheeks(64, 14)


# --- vehicles & objects -------------------------------------------------------------------------


def boat(wood: str, chest=False, raft=False) -> str:
    planks = WOODS[wood][0]
    if raft:
        out = ""
        for k in range(5):
            y = 44 + k * 8
            d = f"M10 {y} H90 Q94 {y+4} 90 {y+8} H10 Q6 {y+4} 10 {y} Z"
            out += part(d, planks)
        out += line_part("M24 40 V82 M76 40 V82", "#8a6544", 3)
    else:
        hull = "M4 44 H82 L96 36 L86 72 Q52 84 16 76 Z"
        out = line_part("M30 50 L10 28", shade(planks, 0.8), 4) + line_part("M62 50 L78 26", shade(planks, 0.8), 4)
        out += part(hull, planks)
        out += clipped(hull, "".join(f'<path d="M0 {y} H100" stroke="{shade(planks, 0.7)}" stroke-width="1.6"/>' for y in (58, 68)))
        out += part("M10 44 Q46 38 84 42 Q48 52 10 44 Z", shade(planks, 0.6))
    if chest:
        out += part("M38 22 H62 V44 H38 Z", "#b07a4a") + f'<rect x="38" y="30" width="24" height="2.5" fill="#5a4a3a"/><rect x="47" y="28" width="6" height="7" rx="1" fill="#d9c088" stroke="{INK}" stroke-width="1.2"/>'
    return out


def minecart(kind: str = "") -> str:
    body = "M10 34 H90 L82 72 H18 Z"
    out = ""
    if kind == "chest":
        out += part("M30 16 H70 V38 H30 Z", "#b07a4a") + f'<rect x="30" y="24" width="40" height="2.5" fill="#5a4a3a"/>'
    elif kind == "blast":
        out += part(ell(50, 30, 18, 14), "#c0533a") + f'<rect x="40" y="24" width="20" height="8" fill="#f2ece0" stroke="{INK}" stroke-width="1.2"/>'
    out += part(body, "#8f8a80")
    out += clipped(body, f'<rect x="0" y="40" width="100" height="4" fill="{shade("#8f8a80", 0.7)}"/>' + "".join(f'<circle cx="{x}" cy="56" r="2" fill="{shade("#8f8a80", 0.6)}"/>' for x in (22, 78)))
    if kind == "furnace":
        out += f'<rect x="38" y="46" width="24" height="18" rx="2" fill="#3a3633" stroke="{INK}" stroke-width="{EDGE}"/><rect x="42" y="56" width="16" height="5" fill="#e08a4a"/>'
    for x in (28, 72):
        out += sil(Ci(x, 78, 9)) + f'<circle cx="{x}" cy="78" r="9" fill="#5a5652"/><circle cx="{x}" cy="78" r="3" fill="#b9b3a8"/>'
    return out


def armour_stand() -> str:
    wood = "#c9a57a"
    out = part("M18 84 H82 V94 H18 Z", "#b8b4aa")
    out += part("M46 30 H54 V86 H46 Z", wood) + part("M22 34 H78 V42 H22 Z", wood) + part("M34 58 H66 V64 H34 Z", wood)
    return out + part(ell(50, 22, 9, 9), wood)


def item_frame() -> str:
    frame = "M10 10 H90 V90 H10 Z"
    out = part(frame, "#8a6544") + flat("M22 22 H78 V78 H22 Z", "#a8683a")
    out += clipped("M22 22 H78 V78 H22 Z", '<path d="M22 22 L78 78 M50 22 L78 50 M22 50 L50 78" stroke="#8a5434" stroke-width="2"/>')
    return out + f'<g transform="translate(50 52) scale(0.42) translate(-50 -50)">{food.fruit("#c0433a")}</g>'


# --- catalogue ----------------------------------------------------------------------------------


def creature_catalogue() -> list[dict]:
    rows: list[dict] = []

    def add(src, name, category, draw, behaviour="Passive", health=None, habitat="", drops="", special=""):
        rows.append(dict(src=src, name=name, category=category, draw=draw, behaviour=behaviour, health=health, habitat=habitat, drops=drops, special=special))

    add("player", "Explorer (Player)", "Character", B.player, "—", 10, "Anywhere", "", "You")
    add("chicken", "Chicken", "Farm Animal", B.chicken, health=2, habitat="Plains, forests", drops="Raw Chicken, Feather, Egg")
    add("pig", "Pig", "Farm Animal", B.pig, health=5, habitat="Plains, forests", drops="Raw Pork Chop", special="Rideable with a Saddle")
    add("cow", "Cow", "Farm Animal", B.cow, health=5, habitat="Plains, meadows", drops="Raw Beef, Leather", special="Milkable")
    add("sheep", "Sheep", "Farm Animal", B.sheep, health=4, habitat="Plains, hills", drops="Raw Mutton, Wool", special="Shearable, dyeable")
    add("goat", "Goat", "Farm Animal", B.goat, "Neutral", 5, "Mountains", "", "Milkable")
    add("horse", "Horse", "Farm Animal", lambda: B.equine("#9a6a44", "#4a3424"), health=12, habitat="Plains, savanna", drops="Leather", special="Tameable, rideable")
    add("donkey", "Donkey", "Farm Animal", lambda: B.equine("#8f8a80", "#5a5652", ears_long=True, muzzle="#d9d0bc"), health=12, habitat="Plains", drops="Leather", special="Tameable, carries a chest")
    add("mule", "Mule", "Farm Animal", lambda: B.equine("#7a5438", "#3a2a22", ears_long=True, muzzle="#c8a888"), health=12, habitat="Bred", drops="Leather", special="Tameable, carries a chest")
    add("llama", "Llama", "Farm Animal", B.llama, "Neutral", 10, "Mountains, savanna", "Leather", "Tameable, carries a chest")
    add("camel", "Camel", "Farm Animal", B.camel, health=14, habitat="Desert", special="Rideable by two")
    add("armadillo", "Armadillo", "Wild Animal", B.armadillo, health=5, habitat="Savanna, badlands")
    add("rabbit", "Rabbit", "Wild Animal", B.rabbit, health=2, habitat="Desert, snow, meadows", drops="Raw Rabbit, Rabbit Hide")
    add("fox", "Fox", "Wild Animal", B.fox, health=5, habitat="Taiga, snow", special="Picks up items")
    add("ocelot", "Ocelot", "Wild Animal", lambda: B.feline("#e8c45a", "#6a4a2a", spots=True), health=5, habitat="Jungle")
    add("cat", "Cat", "Wild Animal", lambda: B.feline("#a9a59c", "#6a6660"), health=5, habitat="Villages", special="Tameable")
    add("wolf", "Wolf", "Wild Animal", B.wolf, "Neutral", 8, "Forests, taiga", special="Tameable")
    add("polar_bear", "Polar Bear", "Wild Animal", B.bear, "Neutral", 15, "Snow, ice", "Raw Cod, Raw Salmon")
    add("panda", "Panda", "Wild Animal", lambda: B.bear("#f6f1e6", panda=True), "Neutral", 10, "Bamboo jungle", "Bamboo")
    add("turtle", "Turtle", "Water Creature", B.turtle, health=15, habitat="Beaches", special="Lays Turtle Eggs")
    add("frog", "Frog", "Wild Animal", B.frog, health=5, habitat="Swamps")
    add("tadpole", "Tadpole", "Water Creature", B.tadpole, health=3, habitat="Swamps", special="Grows into a Frog")
    add("axolotl", "Axolotl", "Water Creature", B.axolotl, health=7, habitat="Caves with water")
    add("dolphin", "Dolphin", "Water Creature", dolphin, "Neutral", 10, "Oceans", "Raw Cod")
    add("cod", "Cod", "Water Creature", lambda: food.fish("#b8a888"), health=2, habitat="Oceans", drops="Raw Cod")
    add("salmon", "Salmon", "Water Creature", lambda: food.fish("#d0705a"), health=2, habitat="Rivers, cold oceans", drops="Raw Salmon")
    add("tropical_fish", "Tropical Fish", "Water Creature", lambda: food.fish("#e8903a", stripes="#f2ece0"), health=2, habitat="Warm oceans", drops="Tropical Fish")
    add("pufferfish", "Pufferfish", "Water Creature", food.pufferfish, "Defensive", 2, "Warm oceans", "Pufferfish")
    add("nautilus", "Nautilus", "Water Creature", nautilus, health=8, habitat="Oceans")
    add("squid", "Squid", "Water Creature", squid, health=5, habitat="Oceans, rivers", drops="Ink Sac")
    add("bee", "Bee", "Flying", B.bee, "Neutral", 5, "Meadows, flower forests", special="Makes honey")
    add("parrot", "Parrot", "Flying", B.parrot, health=3, habitat="Jungle", drops="Feather", special="Tameable, mimics sounds")
    add("bat", "Bat", "Flying", B.bat, health=3, habitat="Caves")
    add("slime", "Puffball", "Monster", B.puffball, "Hostile", 4, "Swamps, caves", "Puff Gel", "Splits when hit")
    add("zombie", "Zombie", "Monster", B.zombie, "Hostile", 10, "Anywhere at night", "Spoiled Meat")
    add("skeleton", "Skeleton", "Monster", B.skeleton, "Hostile", 10, "Anywhere at night", "Bone, Arrow")
    add("spider", "Spider", "Monster", B.spider, "Hostile", 8, "Anywhere at night", "String, Spider Eye", "Climbs walls")
    add("witch", "Witch", "Monster", B.witch, "Hostile", 13, "Swamps")
    add("snow_golem", "Snowman", "Character", B.snowman, "Friendly", 2, "Built by the player", "Snowball", "Throws snowballs at monsters")
    woods = ["oak", "birch", "spruce", "jungle", "dark_oak", "acacia", "mangrove", "cherry"]
    for w in woods:
        nice = w.replace("_", " ").title()
        add(f"{w}_boat", f"{nice} Boat", "Vehicle", (lambda w=w: boat(w)), "—", special="Seats two")
        add(f"{w}_chest_boat", f"{nice} Boat with Chest", "Vehicle", (lambda w=w: boat(w, chest=True)), "—", special="Seats one, carries a chest")
    add("bamboo_raft", "Bamboo Raft", "Vehicle", lambda: boat("bamboo", raft=True), "—", special="Seats two")
    add("bamboo_chest_raft", "Bamboo Raft with Chest", "Vehicle", lambda: boat("bamboo", chest=True, raft=True), "—", special="Seats one, carries a chest")
    add("minecart", "Cart", "Vehicle", minecart, "—", special="Runs on rails")
    add("chest_minecart", "Cart with Chest", "Vehicle", lambda: minecart("chest"), "—", special="Carries items on rails")
    add("furnace_minecart", "Engine Cart", "Vehicle", lambda: minecart("furnace"), "—", special="Pushes other carts")
    add("tnt_minecart", "Blast Cart", "Vehicle", lambda: minecart("blast"), "—", special="Explodes")
    add("armor_stand", "Armour Stand", "Object", armour_stand, "—", special="Displays armour")
    add("item_frame", "Item Frame", "Object", item_frame, "—", special="Displays an item")
    return rows


CREATURE_EXCLUDED_REASON = {
    "Placement state or technical entity": r"^(item|experience_orb|falling_block|marker|interaction|block_display|item_display|text_display|area_effect_cloud|leash_knot|lightning_bolt|ominous_item_spawner|cushion|mannequin)$",
    "Projectile (covered by its item, or Minecraft-only)": r"arrow|trident|firework_rocket|fishing_bobber|experience_bottle|_potion|^egg$|snowball|enderpearl|eye_of_ender|fireball|wither_skull|shulker_bullet|wind_charge|llama_spit|evoker_fangs|tnt$",
    "Painting (left out on request)": r"^painting$",
}
