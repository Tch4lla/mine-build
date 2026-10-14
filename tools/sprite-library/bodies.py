"""Full-body creature figures: how each creature actually looks standing in the world.

Sōzō creatures are chunky, toy-like figures built from rounded parts, like the in-game Puffball
(src/entities/mobs.ts: a round faceted body, round feet, big eyes). Each sprite shows the whole
figure in a three-quarter side view facing left, on a soft ground shadow. Far-side legs are drawn
darker behind the body; everything uses the shared ink-and-wash recipe (itemkit.py).
"""

from __future__ import annotations

import math

from geometry import INK, shade
from itemkit import DARK, EDGE, LIGHT, MID, clipped, glint, line_part, sil

FAR = 0.78  # far-side limbs are this much darker


def E(cx, cy, rx, ry) -> str:
    return f"M{cx - rx:.1f} {cy:.1f} A{rx:.1f} {ry:.1f} 0 1 0 {cx + rx:.1f} {cy:.1f} A{rx:.1f} {ry:.1f} 0 1 0 {cx - rx:.1f} {cy:.1f} Z"


def edge(d: str) -> str:
    return f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{EDGE}" stroke-opacity="0.75" stroke-linejoin="round"/>'


def shadow(cx=50, cy=89, rx=34, ry=5) -> str:
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{INK}" fill-opacity="0.16"/>'


def ball(cx, cy, rx, ry, c, rot=0) -> str:
    """A rounded part lit from the upper left: dark base, mid body, light cap."""
    d = E(cx, cy, rx, ry)
    t = f' transform="rotate({rot} {cx} {cy})"' if rot else ""
    inner = (
        f'<path d="{E(cx - rx * 0.08, cy - ry * 0.12, rx * 0.92, ry * 0.86)}" fill="{shade(c, MID)}"/>'
        f'<path d="{E(cx - rx * 0.28, cy - ry * 0.32, rx * 0.55, ry * 0.5)}" fill="{shade(c, LIGHT)}"/>'
    )
    return (
        f"<g{t}>"
        + sil(f'<path d="{d}"/>')
        + f'<path d="{d}" fill="{shade(c, DARK)}"/>'
        + clipped(d, inner)
        + edge(d)
        + "</g>"
    )


def shape(d: str, c: str, light_d: str | None = None) -> str:
    """Any outline in the mid tone, with an optional light facet, ink outline and edge."""
    out = sil(f'<path d="{d}"/>') + f'<path d="{d}" fill="{shade(c, MID)}"/>'
    if light_d:
        out += clipped(d, f'<path d="{light_d}" fill="{shade(c, LIGHT)}"/>')
    return out + edge(d)


def limb(x, y0, y1, w, c, foot=None) -> str:
    d = f"M{x - w/2:.1f} {y0:.1f} H{x + w/2:.1f} V{y1 - w/2:.1f} A{w/2:.1f} {w/2:.1f} 0 0 1 {x - w/2:.1f} {y1 - w/2:.1f} Z"
    out = sil(f'<path d="{d}"/>') + f'<path d="{d}" fill="{shade(c, MID)}"/>'
    out += clipped(d, f'<rect x="{x - w/2:.1f}" y="{y0}" width="{w*0.42:.1f}" height="{y1 - y0}" fill="{shade(c, LIGHT)}"/>')
    if foot:
        out += clipped(d, f'<rect x="{x - w/2 - 1:.1f}" y="{y1 - w*0.7:.1f}" width="{w + 2}" height="{w}" fill="{foot}"/>')
    return out + edge(d)


def eye(x, y, r=3.6, white=False, color=INK) -> str:
    out = f'<circle cx="{x}" cy="{y}" r="{r + 2}" fill="#f6f1e6" stroke="{INK}" stroke-width="1.2"/>' if white else ""
    return out + f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/><circle cx="{x - r*0.35:.1f}" cy="{y - r*0.4:.1f}" r="{max(1.1, r*0.33):.1f}" fill="#ffffff"/>'


def blush(x, y) -> str:
    return f'<ellipse cx="{x}" cy="{y}" rx="4" ry="2.4" fill="#e98fa8" fill-opacity="0.55"/>'


def tri_ear(x, y, ang, ln, w, c, inner=None) -> str:
    a = math.radians(ang)
    tx, ty = x + ln * math.cos(a), y + ln * math.sin(a)
    nx, ny = -math.sin(a) * w, math.cos(a) * w
    d = f"M{x + nx:.1f} {y + ny:.1f} Q{tx + nx*0.5:.1f} {ty + ny*0.5:.1f} {tx:.1f} {ty:.1f} Q{tx - nx*0.5:.1f} {ty - ny*0.5:.1f} {x - nx:.1f} {y - ny:.1f} Z"
    out = shape(d, c)
    if inner:
        k = 0.45
        tx2, ty2 = x + ln * 0.72 * math.cos(a), y + ln * 0.72 * math.sin(a)
        out += f'<path d="M{x + nx*k:.1f} {y + ny*k:.1f} Q{tx2 + nx*k*0.5:.1f} {ty2 + ny*k*0.5:.1f} {tx2:.1f} {ty2:.1f} Q{tx2 - nx*k*0.5:.1f} {ty2 - ny*k*0.5:.1f} {x - nx*k:.1f} {y - ny*k:.1f} Z" fill="{inner}"/>'
    return out


# --- quadruped template -------------------------------------------------------------------------


def quad(
    coat: str,
    body=(56, 56, 27, 16),
    leg_len=None,
    leg_w=9,
    hoof=None,
    leg_color=None,
    head=(26, 40, 14, 13),
    neck=False,
    tail=None,
    pattern=None,
    behind="",
    face="",
    front="",
    ground=89,
) -> str:
    bx, by, brx, bry = body
    lc = leg_color or coat
    top = by + bry * 0.3
    bottom = ground - 2 if leg_len is None else top + leg_len
    xs_near = (bx - brx * 0.55, bx + brx * 0.6)
    xs_far = (bx - brx * 0.35, bx + brx * 0.8)
    out = shadow(bx - 4, ground, brx + 12)
    out += behind
    for x in xs_far:
        out += limb(x, top, bottom - 2, leg_w, shade(lc, FAR), hoof and shade(hoof, FAR))
    if tail:
        out += tail
    bd = E(bx, by, brx, bry)
    out += ball(bx, by, brx, bry, coat)
    if pattern:
        out += clipped(bd, pattern)
    for x in xs_near:
        out += limb(x, top, bottom, leg_w, lc, hoof)
    hx, hy, hrx, hry = head
    if neck:
        nd = f"M{bx - brx*0.75:.1f} {by - bry*0.2:.1f} L{hx + hrx*0.2:.1f} {hy + hry*0.4:.1f} L{hx + hrx*0.9:.1f} {hy - hry*0.1:.1f} L{bx - brx*0.35:.1f} {by - bry*0.75:.1f} Z"
        out += shape(nd, coat)
    out += ball(hx, hy, hrx, hry, coat)
    out += face + front
    return out


# --- farm animals -------------------------------------------------------------------------------


def pig() -> str:
    c = "#f0b4c0"
    face = shape(E(13, 52, 5.5, 7), "#e48ea0") + '<ellipse cx="12" cy="50" rx="1.3" ry="2" fill="#2a221d"/><ellipse cx="12" cy="55" rx="1.3" ry="2" fill="#2a221d"/>'
    face += eye(24, 44, 3) + blush(28, 54)
    front = tri_ear(32, 38, -60, 14, 6, "#e9a0b4", "#d8808e")
    tail = '<path d="M82 52 q8 -4 6 4 q-2 6 6 2" fill="none" stroke="#2a221d" stroke-width="5" stroke-linecap="round"/><path d="M82 52 q8 -4 6 4 q-2 6 6 2" fill="none" stroke="#e9a0b4" stroke-width="2.4" stroke-linecap="round"/>'
    return quad(c, body=(56, 60, 28, 18), leg_len=16, leg_w=10, hoof="#d07a8a", head=(28, 50, 16, 14), tail=tail, face=face, front=front)


def cow() -> str:
    c = "#f2ece0"
    pattern = '<ellipse cx="62" cy="50" rx="10" ry="7" fill="#5a4436"/><ellipse cx="44" cy="62" rx="7" ry="5" fill="#5a4436"/><ellipse cx="78" cy="62" rx="6" ry="5" fill="#5a4436"/>'
    behind = line_part("M28 30 Q22 22 24 16", "#ece2c0", 4) + line_part("M34 30 Q34 22 40 18", "#ece2c0", 4)
    face = shape(E(14, 46, 8, 7), "#e9a8b0") + '<ellipse cx="11" cy="46" rx="1.4" ry="2" fill="#2a221d"/><ellipse cx="16" cy="47" rx="1.4" ry="2" fill="#2a221d"/>'
    face += eye(25, 36, 3) + '<ellipse cx="30" cy="34" rx="5" ry="4" fill="#5a4436"/>'
    front = tri_ear(36, 34, -10, 11, 4, "#f2ece0", "#e9a0b4")
    tail = line_part("M82 50 Q90 62 88 74", "#ece6da", 3) + '<ellipse cx="88" cy="76" rx="3" ry="4" fill="#5a4436" stroke="#2a221d" stroke-width="1.4"/>'
    return quad(c, body=(56, 54, 28, 17), leg_w=9, hoof="#5a4a42", head=(26, 38, 13, 12), tail=tail, pattern=pattern, behind=behind, face=face, front=front)


def sheep(wool="#f2ece0") -> str:
    out = shadow(52, 89, 36)
    for x in (44, 76):
        out += limb(x, 66, 86, 7, shade("#4a3e38", FAR))
    puffs = ((40, 54, 12), (54, 46, 13), (68, 48, 12), (80, 58, 11), (66, 64, 12), (50, 64, 12), (36, 64, 10))
    for x, y, r in puffs:
        out += ball(x, y, r, r, wool)
    for x in (40, 70):
        out += limb(x, 68, 88, 7, "#4a3e38")
    out += ball(24, 50, 11, 12, "#5a4a42")
    out += eye(20, 48, 2.6, white=True)
    out += ball(30, 40, 7, 6, wool)
    out += tri_ear(30, 50, 40, 9, 3, "#5a4a42")
    return out


def goat() -> str:
    c = "#ece6da"
    behind = line_part("M30 26 Q38 12 50 16", "#b9b3a8", 5)
    face = eye(22, 32, 3) + shape("M12 44 Q16 56 20 44 Z", "#d9d0bc") + '<ellipse cx="11" cy="38" rx="1.4" ry="1.8" fill="#2a221d"/>'
    front = tri_ear(32, 34, 20, 11, 4, c, "#e9a0b4")
    tail = shape("M80 46 L88 40 L84 50 Z", c)
    return quad(c, body=(56, 54, 26, 15), leg_w=8, hoof="#6a6460", head=(22, 36, 12, 11), neck=True, tail=tail, behind=behind, face=face, front=front)


def equine(coat: str, mane: str, ears_long=False, muzzle="#d9c0a0") -> str:
    ears = tri_ear(30, 18, -100, 16 if ears_long else 9, 4, coat, shade(coat, 0.75))
    mane_d = "M30 16 Q44 22 52 40 L46 44 Q38 28 28 24 Z"
    behind = ears
    face = shape(E(14, 34, 8, 7), muzzle, None) + '<ellipse cx="11" cy="34" rx="1.5" ry="2" fill="#2a221d"/>' + eye(26, 24, 3)
    front = shape(mane_d, mane)
    tail = shape("M80 46 Q94 56 90 78 Q84 66 80 56 Z", mane)
    return quad(coat, body=(58, 52, 26, 14), leg_w=8, hoof="#3a3028", head=(24, 28, 13, 10), neck=True, tail=tail, behind=behind, face=face, front=front)


def llama() -> str:
    c = "#ece2c8"
    out = shadow(56, 89, 30)
    for x in (52, 78):
        out += limb(x, 62, 86, 8, shade(c, FAR))
    out += ball(64, 56, 22, 14, c)
    for x in (46, 72):
        out += limb(x, 62, 88, 8, c)
    out += shape("M38 52 L32 22 H44 L52 50 Z", c, "M32 22 H37 L42 52 H38 Z")
    out += tri_ear(34, 14, -100, 10, 3, c, "#e9a0b4") + tri_ear(40, 14, -80, 10, 3, c, "#e9a0b4")
    out += ball(34, 20, 10, 8, c)
    out += eye(32, 18, 2.8) + shape(E(26, 24, 4, 3), "#d9c8a8")
    out += shape("M44 50 Q64 44 84 54 L84 60 Q64 52 44 58 Z", "#c0533a")
    return out


def camel() -> str:
    c = "#d8b47a"
    out = shadow(54, 89, 34)
    for x in (48, 78):
        out += limb(x, 60, 86, 8, shade(c, FAR))
    out += ball(60, 54, 26, 13, c)
    out += ball(60, 40, 12, 10, c)
    for x in (42, 72):
        out += limb(x, 60, 88, 8, c)
    out += shape("M36 52 Q22 52 20 36 L28 32 Q30 44 40 46 Z", c)
    out += ball(20, 32, 10, 8, c)
    out += f'<path d="M18 28 Q22 26 24 29" fill="none" stroke="{INK}" stroke-width="2"/>' + '<ellipse cx="12" cy="34" rx="1.4" ry="1.8" fill="#2a221d"/>'
    return out + tri_ear(24, 25, -60, 6, 3, c)


def chicken() -> str:
    out = shadow(50, 89, 22)
    out += line_part("M46 72 V86 M42 86 H52", "#e8b04a", 3) + line_part("M56 72 V86 M52 86 H62", "#e8b04a", 3)
    out += shape("M64 44 Q80 30 82 48 Q78 58 66 58 Z", "#ece6da")
    out += ball(52, 60, 20, 16, "#f6f1e6")
    out += shape("M48 56 Q60 50 66 62 Q56 70 48 64 Z", "#e2ddd4")
    out += ball(36, 40, 11, 11, "#f6f1e6")
    out += shape("M30 30 Q32 22 36 27 Q39 20 42 28 L40 32 H32 Z", "#d8573c")
    out += shape("M25 40 L18 43 L25 46 Z", "#e8b04a") + shape("M27 47 Q25 54 30 50 Z", "#d8573c")
    return out + eye(33, 38, 2.6)


def rabbit(coat="#c8a888") -> str:
    out = shadow(52, 89, 26)
    out += ball(56, 70, 22, 16, coat)
    out += ball(76, 66, 6, 6, "#f6f1e6")
    out += ball(44, 84, 9, 4, shade(coat, 0.9))
    out += tri_ear(40, 44, -100, 26, 5, shade(coat, FAR), "#d8909e")
    out += tri_ear(46, 44, -80, 26, 5, coat, "#e9a0b4")
    out += ball(40, 54, 13, 12, coat)
    out += eye(36, 52, 3) + '<path d="M28 57 L30 59 L32 57 Z" fill="#e98fa8" stroke="#2a221d" stroke-width="1"/>' + blush(38, 60)
    return out


def fox() -> str:
    c = "#df8a45"
    tail = shape("M78 54 Q98 52 96 34 Q90 44 80 46 Z", c) + clipped("M78 54 Q98 52 96 34 Q90 44 80 46 Z", '<circle cx="96" cy="36" r="7" fill="#f6f1e6"/>')
    face = shape("M14 44 L26 40 L26 50 Z", "#f6f1e6") + '<ellipse cx="13" cy="44" rx="2" ry="1.8" fill="#2a221d"/>' + eye(26, 38, 2.8)
    front = tri_ear(30, 32, -100, 12, 5, c, "#2a221d") + tri_ear(36, 32, -70, 12, 5, c, "#2a221d")
    pattern = '<ellipse cx="40" cy="64" rx="12" ry="8" fill="#f6f1e6"/>'
    return quad(c, body=(56, 56, 24, 13), leg_w=7, hoof="#2a221d", head=(28, 42, 12, 10), tail=tail, pattern=pattern, face=face, front=front)


def feline(coat: str, mark: str, spots=False) -> str:
    tail = line_part("M78 52 Q92 46 88 28 Q86 22 92 18", coat, 6)
    pattern = (
        "".join(f'<circle cx="{x}" cy="{y}" r="2.6" fill="{mark}"/>' for x, y in ((44, 50), (56, 46), (68, 50), (50, 58), (64, 60), (76, 56)))
        if spots
        else "".join(f'<path d="M{x} 40 Q{x-3} 50 {x} 58" fill="none" stroke="{mark}" stroke-width="3"/>' for x in (46, 56, 66, 76))
    )
    face = eye(22, 40, 3, color="#6a8a3a") + '<path d="M13 46 L15 48 L17 46 Z" fill="#e98fa8"/>' + f'<path d="M14 48 L4 46 M14 49 L4 51" stroke="{INK}" stroke-width="1"/>'
    front = tri_ear(26, 32, -105, 10, 5, coat, "#e9a0b4") + tri_ear(32, 32, -70, 10, 5, coat, "#e9a0b4")
    return quad(coat, body=(56, 56, 24, 12), leg_w=7, head=(24, 42, 12, 11), tail=tail, pattern=pattern, face=face, front=front)


def wolf() -> str:
    c = "#a9a59c"
    tail = shape("M78 50 Q94 56 92 72 Q86 62 78 58 Z", c)
    face = shape("M8 46 L22 42 L22 52 Z", "#ece6da") + '<ellipse cx="8" cy="46" rx="2.4" ry="2" fill="#2a221d"/>' + eye(24, 40, 2.8, color="#a8803a")
    front = tri_ear(28, 32, -100, 12, 5, c, "#e2ddd4") + tri_ear(34, 32, -72, 12, 5, c, "#e2ddd4")
    pattern = '<ellipse cx="42" cy="64" rx="12" ry="7" fill="#e2ddd4"/>'
    return quad(c, body=(56, 54, 25, 14), leg_w=8, head=(26, 44, 13, 11), tail=tail, pattern=pattern, face=face, front=front)


def bear(coat="#f2ece0", panda=False) -> str:
    ear_c = "#3a3633" if panda else coat
    lc = "#3a3633" if panda else coat
    pattern = '<path d="M30 40 Q44 36 50 50 L50 76 Q36 70 30 56 Z" fill="#3a3633"/>' if panda else ""
    face = shape(E(14, 52, 7, 6), "#ece6da" if not panda else "#f6f1e6") + '<ellipse cx="9" cy="50" rx="2.6" ry="2.2" fill="#2a221d"/>'
    if panda:
        face += '<ellipse cx="22" cy="44" rx="5" ry="6" fill="#3a3633" transform="rotate(-20 22 44)"/>' + eye(22, 44, 2, color="#f6f1e6")
    else:
        face += eye(22, 44, 2.8)
    behind = f'<g>{ball(34, 32, 6, 6, ear_c)}</g>'
    return quad(coat, body=(58, 56, 30, 19), leg_w=12, leg_color=lc, head=(24, 48, 15, 13), pattern=pattern, behind=behind, face=face)


def armadillo() -> str:
    out = shadow(52, 89, 32)
    for x in (40, 66):
        out += limb(x, 70, 86, 7, shade("#e0b0a0", FAR))
    shell = "M22 78 Q22 44 52 42 Q82 44 84 78 Z"
    out += line_part("M82 74 L94 80", "#d8a090", 5)
    out += shape(shell, "#c8907a", "M22 78 Q22 44 52 42 Q46 56 44 78 Z")
    out += clipped(shell, "".join(f'<path d="M{x} 40 Q{x - 4} 60 {x} 80" fill="none" stroke="{shade("#c8907a", 0.6)}" stroke-width="2.5"/>' for x in (34, 44, 54, 64, 74)))
    for x in (34, 60):
        out += limb(x, 72, 88, 7, "#e0b0a0")
    out += ball(18, 70, 9, 8, "#e0b0a0") + tri_ear(20, 62, -70, 7, 3, "#e0b0a0")
    return out + eye(16, 68, 2.2)


def turtle() -> str:
    out = shadow(52, 89, 34)
    out += shape("M72 80 L90 86 L74 88 Z", shade("#7caa62", FAR))
    shell = "M22 76 Q24 44 54 42 Q84 44 86 76 Z"
    out += shape(shell, "#5f8a4e", "M22 76 Q24 44 54 42 Q46 58 44 76 Z")
    out += clipped(shell, f'<path d="M40 44 L46 60 H62 L68 44 M46 60 L40 78 M62 60 L68 78" fill="none" stroke="{INK}" stroke-width="1.6" stroke-opacity="0.7"/><rect x="0" y="72" width="100" height="6" fill="#e0d090"/>')
    out += shape("M30 78 L18 88 L36 86 Z", "#7caa62") + shape("M66 78 L60 90 L76 86 Z", "#7caa62")
    out += shape("M26 64 Q12 62 12 54 Q14 46 24 50 L30 58 Z", "#7caa62")
    return out + eye(16, 53, 2.2)


def frog() -> str:
    c = "#7caa52"
    out = shadow(50, 89, 30)
    out += shape("M64 70 Q86 64 84 86 H62 Z", shade(c, FAR))
    out += ball(50, 70, 26, 16, c)
    out += clipped(E(50, 70, 26, 16), '<ellipse cx="40" cy="84" rx="20" ry="8" fill="#e8e0a8"/>')
    out += ball(36, 54, 8, 8, c) + ball(56, 54, 8, 8, c)
    out += eye(36, 53, 3.4, white=True) + eye(56, 53, 3.4, white=True)
    out += f'<path d="M30 70 Q46 78 62 68" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>'
    out += shape("M30 80 L22 88 H38 Z", c) + shape("M66 72 Q88 72 80 88 H62 Z", c)
    return out + blush(30, 72)


def axolotl() -> str:
    c = "#f0b8c8"
    out = shadow(50, 89, 32)
    for x in (46, 72):
        out += limb(x, 70, 84, 6, shade(c, FAR))
    out += shape("M64 62 Q90 54 96 70 Q88 76 64 74 Z", c, "M64 62 Q90 54 96 70 Q80 64 64 66 Z")
    out += ball(54, 68, 22, 11, c)
    for x in (40, 64):
        out += limb(x, 72, 86, 6, c)
    for k, (dx, dy) in enumerate(((-4, -16), (4, -18), (12, -14))):
        out += line_part(f"M{30 + k*2} 54 l{dx} {dy}", "#d8607a", 4)
    out += ball(28, 60, 14, 11, c)
    out += eye(22, 58, 2.8) + f'<path d="M14 64 Q20 68 26 65" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>'
    return out + blush(26, 66)


def parrot() -> str:
    out = shadow(50, 89, 18)
    out += line_part("M24 82 H80", "#8a6544", 6)
    out += shape("M50 70 L44 94 L56 94 Z", "#3f7f86")
    out += ball(52, 56, 15, 22, "#d0443a")
    out += shape("M56 44 Q72 54 64 76 Q56 66 54 52 Z", "#3f7f86", "M56 44 Q66 52 62 62 Q58 56 56 50 Z")
    out += ball(48, 30, 12, 11, "#d0443a")
    out += shape("M38 28 Q28 32 32 42 Q36 36 40 36 Z", "#f2e6c8")
    out += eye(48, 28, 2.6, white=True)
    return out + line_part("M46 78 V84 M56 78 V84", "#8f8a80", 2.5) + shape("M60 52 Q66 56 62 62 Z", "#e8c45a")


def bee() -> str:
    out = shadow(50, 92, 16, 3)
    body = E(50, 54, 26, 18)
    out += ball(58, 30, 13, 9, "#e2ecf2") + ball(44, 30, 12, 8, "#e2ecf2")
    out += ball(50, 54, 26, 18, "#e8c45a")
    out += clipped(body, '<rect x="44" y="30" width="8" height="50" fill="#3a3633"/><rect x="60" y="30" width="8" height="50" fill="#3a3633"/>')
    out += shape("M74 54 L88 54 L74 60 Z", "#3a3633")
    out += eye(32, 50, 3.4)
    return out + f'<path d="M26 40 Q22 30 28 26 M32 38 Q32 28 38 26" fill="none" stroke="{INK}" stroke-width="2"/>' + blush(34, 60)


def bat() -> str:
    c = "#5a4a52"
    out = shadow(50, 92, 14, 3)
    wl = "M50 46 Q34 28 8 32 Q16 40 12 50 Q22 46 24 58 Q32 50 40 58 Z"
    wr = "M50 46 Q66 28 92 32 Q84 40 88 50 Q78 46 76 58 Q68 50 60 58 Z"
    out += shape(wl, c, "M50 46 Q34 28 8 32 Q20 36 30 44 Z") + shape(wr, shade(c, 0.9))
    out += tri_ear(44, 38, -110, 10, 3, "#6a5a62") + tri_ear(56, 38, -70, 10, 3, "#6a5a62")
    out += ball(50, 50, 13, 14, "#6a5a62")
    out += eye(45, 48, 2.2, color="#e8c45a") + eye(55, 48, 2.2, color="#e8c45a")
    return out + f'<path d="M46 56 L48 60 L50 56 L52 60 L54 56" fill="#f6f1e6" stroke="{INK}" stroke-width="1.2"/>'


def puffball() -> str:
    """Matches the in-game Puffball: round lavender body, tufts, sprout, round feet, big eyes."""
    c = "#b9a6e8"
    out = shadow(50, 89, 28)
    out += ball(38, 84, 9, 6, "#8f7cc4") + ball(62, 84, 9, 6, "#8f7cc4")
    out += ball(50, 58, 28, 26, c)
    for x, y in ((30, 44), (48, 34), (68, 42)):
        out += ball(x, y, 7, 6, "#d8cdf6")
    out += line_part("M52 34 V22", "#4f8a5b", 3) + ball(58, 20, 7, 5, "#6fbf73", rot=-20)
    out += eye(40, 58, 4.5, white=True) + eye(60, 58, 4.5, white=True)
    return out + f'<path d="M45 70 Q50 74 55 70" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>' + blush(32, 68) + blush(68, 68)


# --- humanoid template ----------------------------------------------------------------------------


def humanoid(skin, shirt, pants, shoes, head_extra="", face="", arms="down", body_extra="", over="") -> str:
    out = shadow(50, 90, 22)
    out += limb(44, 68, 88, 9, shade(pants, FAR), shade(shoes, FAR))
    out += limb(56, 68, 89, 9, pants, shoes)
    if arms == "forward":
        out += shape("M58 48 H80 Q84 52 80 56 H58 Z", shade(shirt, FAR))
        out += ball(81, 52, 4, 4, shade(skin, FAR))
    else:
        out += limb(64, 46, 70, 8, shade(shirt, FAR))
    bd = "M36 46 Q36 40 42 40 H58 Q64 40 64 46 V70 H36 Z"
    out += shape(bd, shirt, "M36 46 Q36 40 42 40 H46 V70 H36 Z")
    out += body_extra
    if arms == "forward":
        out += shape("M40 50 H72 Q76 54 72 58 H40 Z", shirt)
        out += ball(73, 54, 4.5, 4.5, skin)
    else:
        out += limb(36, 46, 70, 8, shirt) + ball(36, 70, 4.5, 4, skin)
    out += ball(48, 26, 17, 16, skin)
    out += head_extra + face + over
    return out


def player() -> str:
    hood = "M30 30 Q28 8 48 8 Q70 8 68 30 Q68 40 62 40 Q64 22 48 20 Q34 22 34 40 Q30 38 30 30 Z"
    face = '<path d="M34 22 Q44 28 56 20 L62 24 Q60 14 48 12 Q34 14 34 22 Z" fill="#4a3a32"/>' + eye(42, 28, 2.8) + eye(54, 28, 2.8) + blush(38, 34) + blush(58, 34)
    scarf = shape("M34 40 Q48 46 62 40 L62 46 Q48 52 34 46 Z", "#d8573c") + shape("M56 46 L62 62 L54 62 L52 48 Z", "#d8573c")
    return humanoid("#f0d0b0", "#3f7f86", "#5a4a42", "#6e5440", face=face, over=shape(hood, "#2f6a70") + scarf, body_extra='<rect x="36" y="60" width="28" height="4" fill="#8a6544"/>')


def zombie() -> str:
    skin = "#94ab84"
    hair = '<path d="M32 18 Q36 8 46 12 Q52 4 60 12 Q66 14 64 24 Q58 18 52 22 Q46 16 40 22 Q36 18 32 22 Z" fill="#4a4236" stroke="#2a221d" stroke-width="1.2"/>'
    face = eye(42, 28, 3.5, white=True) + f'<path d="M52 28 Q56 31 60 28" fill="none" stroke="{INK}" stroke-width="2.2"/>' + f'<path d="M40 36 L43 33 L46 37 L49 33 L52 37 L55 34" fill="none" stroke="{INK}" stroke-width="2"/>'
    torn = '<path d="M36 64 L40 70 L44 64 L48 70 L52 64 L56 70 L60 64 L64 70 V72 H36 Z" fill="#5a6e8a"/>'
    return humanoid(skin, "#5a7a9a", "#4a4a5e", "#3a3633", head_extra=hair, face=face, arms="forward", body_extra=torn)


def skeleton() -> str:
    bone = "#ece6da"
    out = shadow(50, 90, 20)
    out += line_part("M44 66 V88 M56 66 V88", bone, 4.5)
    out += line_part("M36 44 V68 M64 44 V66", bone, 4)
    out += line_part("M50 40 V66", bone, 5)
    out += "".join(line_part(f"M40 {y} Q50 {y+3} 60 {y}", bone, 3.5) for y in (46, 52, 58))
    out += line_part("M40 66 H60", bone, 4.5)
    out += ball(48, 26, 16, 15, bone)
    out += f'<ellipse cx="42" cy="26" rx="4.5" ry="5.5" fill="{INK}"/><ellipse cx="55" cy="26" rx="4.5" ry="5.5" fill="{INK}"/><path d="M47 33 L49 30 L51 33 Z" fill="{INK}"/>'
    return out + "".join(f'<rect x="{x}" y="35" width="3.4" height="5" fill="#f6f1e6" stroke="{INK}" stroke-width="1"/>' for x in (41, 45, 49, 53))


def witch() -> str:
    skin = "#b8c890"
    hat = shape("M48 -2 L64 22 H32 Z", "#5a3a6e") + shape(E(48, 22, 26, 5), "#4a2e5e") + '<rect x="36" y="16" width="24" height="4" fill="#e8c45a" stroke="#2a221d" stroke-width="1"/>'
    face = eye(42, 30, 2.8) + eye(54, 30, 2.8) + shape("M46 30 Q52 38 48 40 Q45 38 45 34 Z", "#a8b878") + '<circle cx="50" cy="37" r="1.4" fill="#6a7a4a"/>'
    robe = shape("M34 46 L28 88 H72 L66 46 Z", "#5a3a6e", "M34 46 L28 88 H40 L42 46 Z")
    return humanoid(skin, "#5a3a6e", "#5a3a6e", "#3a2a3a", face=face, over=hat, body_extra=robe)


def spider() -> str:
    c = "#3a3633"
    out = shadow(50, 90, 34)
    for k, (x0, reach) in enumerate(((38, -30), (44, -26), (56, 26), (62, 30))):
        out += line_part(f"M{x0} 64 Q{x0 + reach*0.5:.0f} 48 {x0 + reach:.0f} 86", shade(c, FAR) if k in (1, 2) else c, 4)
    out += ball(60, 62, 22, 16, c)
    out += ball(34, 64, 13, 11, "#4a4643")
    out += "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#d8573c"/>' for x, y, r in ((28, 60, 3), (36, 59, 3), (25, 66, 2), (33, 66, 2)))
    for x0, reach in ((30, -20), (40, 22)):
        out += line_part(f"M{x0} 70 Q{x0 + reach*0.5:.0f} 60 {x0 + reach:.0f} 88", c, 4)
    return out


def snowman() -> str:
    out = shadow(50, 90, 26)
    out += ball(50, 72, 26, 18, "#f6f1e6") + ball(50, 40, 19, 17, "#fbf8f0")
    out += line_part("M32 52 L14 40", "#8a6544", 3) + line_part("M68 52 L86 42", "#8a6544", 3)
    out += shape("M32 54 Q50 62 68 54 L70 60 Q50 68 30 60 Z", "#d8573c") + shape("M58 60 L64 80 L56 80 L54 62 Z", "#d8573c")
    out += eye(43, 36, 2.6) + eye(56, 36, 2.6)
    out += shape("M48 42 L32 46 L48 47 Z", "#df8a45")
    return out + "".join(f'<circle cx="50" cy="{y}" r="2.4" fill="{INK}"/>' for y in (70, 80))


def tadpole() -> str:
    return shadow(50, 90, 18, 3) + line_part("M56 56 Q74 42 90 58 Q78 54 68 66", "#5a5048", 6) + ball(40, 56, 20, 16, "#5a5048") + eye(32, 52, 3.2, white=True)


def glinted(svg: str) -> str:
    return svg + glint(0, 0, 0)
