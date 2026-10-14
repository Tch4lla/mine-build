"""Block shapes (isometric box compositions) and flat 2D sprites for Sōzō."""

from __future__ import annotations

from geometry import INK, Box, Rand, boxes_svg, ink_group, shade
from materials import Mat


def _b(m: Mat, a0, a1, b0, b1, c0, c1, **kw) -> Box:
    return Box(a0, a1, b0, b1, c0, c1, m.color, m.top, m.side, m.side_color, m.top_color, opacity=m.opacity, **kw)


# --- isometric shapes -------------------------------------------------------------------------


def cube(m: Mat, r: Rand) -> str:
    return boxes_svg([_b(m, 0, 1, 0, 1, 0, 1)], r)


def slab(m: Mat, r: Rand) -> str:
    return boxes_svg([_b(m, 0, 1, 0, 1, 0, 0.5)], r)


def stairs(m: Mat, r: Rand) -> str:
    return boxes_svg([_b(m, 0, 1, 0, 1, 0, 0.5), _b(m, 0.5, 1, 0, 1, 0.5, 1)], r)


def wall(m: Mat, r: Rand) -> str:
    return boxes_svg(
        [
            _b(m, 0.66, 1, 0.3, 0.7, 0, 0.62),
            _b(m, 0.34, 0.66, 0.24, 0.76, 0, 1),
            _b(m, 0, 0.34, 0.3, 0.7, 0, 0.62),
        ],
        r,
    )


def fence(m: Mat, r: Rand) -> str:
    rail = lambda c0, c1: _b(m, 0.44, 0.56, 0.2, 0.8, c0, c1)  # noqa: E731
    return boxes_svg(
        [
            _b(m, 0.38, 0.62, 0.05, 0.3, 0, 1),
            rail(0.55, 0.7),
            rail(0.25, 0.4),
            _b(m, 0.38, 0.62, 0.7, 0.95, 0, 1),
        ],
        r,
    )


def fence_gate(m: Mat, r: Rand) -> str:
    bar = lambda b0, b1, c0, c1: _b(m, 0.44, 0.56, b0, b1, c0, c1)  # noqa: E731
    return boxes_svg(
        [
            _b(m, 0.4, 0.6, 0.0, 0.14, 0.1, 0.95),
            bar(0.14, 0.86, 0.72, 0.85),
            bar(0.14, 0.86, 0.3, 0.43),
            bar(0.43, 0.57, 0.3, 0.85),
            _b(m, 0.4, 0.6, 0.86, 1.0, 0.1, 0.95),
        ],
        r,
    )


def carpet(m: Mat, r: Rand) -> str:
    return boxes_svg([_b(m, 0, 1, 0, 1, 0, 0.0625)], r)


def pressure_plate(m: Mat, r: Rand) -> str:
    return boxes_svg([_b(m, 0.0625, 0.9375, 0.0625, 0.9375, 0, 0.0625)], r)


def button(m: Mat, r: Rand) -> str:
    return boxes_svg([_b(m, 0.2, 0.8, 0.28, 0.72, 0, 0.3)], r)


def pane(m: Mat, r: Rand) -> str:
    return boxes_svg([_b(m, 0.44, 0.56, 0, 1, 0, 1)], r)


def layer(m: Mat, r: Rand, h=0.125) -> str:
    return boxes_svg([_b(m, 0, 1, 0, 1, 0, h)], r)


def pillar_block(m: Mat, r: Rand) -> str:
    return cube(m, r)


def bars(color: str, r: Rand) -> str:
    out = ""
    for k in range(5):
        x = 22 + k * 14
        out += f'<rect x="{x}" y="10" width="5" height="80" rx="2" fill="{color}"/>'
    out += f'<rect x="14" y="16" width="72" height="6" rx="2" fill="{shade(color, 0.85)}"/>'
    out += f'<rect x="14" y="78" width="72" height="6" rx="2" fill="{shade(color, 0.85)}"/>'
    return ink_group(out, 3.5)


def chain(color: str, r: Rand) -> str:
    links = ""
    for k in range(4):
        y = 10 + k * 21
        x, w = (44, 12) if k % 2 else (40, 20)
        links += f'<rect x="{x}" y="{y}" width="{w}" height="24" rx="{w/2}"/>'
    return (
        f'<g fill="none" stroke="{INK}" stroke-width="9">{links}</g>'
        f'<g fill="none" stroke="{color}" stroke-width="4.5">{links}</g>'
    )


# --- flat 2D sprites -------------------------------------------------------------------------


def door(m: Mat, r: Rand, window=True) -> str:
    c = m.color
    out = f'<rect x="26" y="6" width="48" height="88" rx="3" fill="{c}"/>'
    out += f'<rect x="32" y="50" width="36" height="38" rx="2" fill="{shade(c, 0.85)}"/>'
    if window:
        out += f'<rect x="32" y="12" width="36" height="30" rx="2" fill="#bcd8dc"/>'
        out += f'<rect x="48.5" y="12" width="3" height="30" fill="{c}"/>'
    else:
        out += f'<rect x="32" y="12" width="36" height="32" rx="2" fill="{shade(c, 0.85)}"/>'
    body = ink_group(out)
    return body + f'<circle cx="64" cy="54" r="3.4" fill="{INK}"/>'


def trapdoor(m: Mat, r: Rand) -> str:
    return boxes_svg([_b(m, 0, 1, 0, 1, 0, 0.1875)], r)


def sign(m: Mat, r: Rand) -> str:
    c = m.color
    out = f'<rect x="45" y="52" width="10" height="42" fill="{shade(c, 0.8)}"/>'
    out += f'<rect x="10" y="14" width="80" height="44" rx="3" fill="{c}"/>'
    lines = "".join(f'<rect x="20" y="{y}" width="{w}" height="3.5" rx="1.5" fill="{shade(c, 0.62)}"/>' for y, w in ((24, 58), (33, 46), (42, 52)))
    return ink_group(out) + lines


def hanging_sign(m: Mat, r: Rand) -> str:
    c = m.color
    out = f'<rect x="8" y="10" width="84" height="9" rx="2" fill="{shade(c, 0.8)}"/>'
    out += f'<rect x="12" y="38" width="76" height="46" rx="3" fill="{c}"/>'
    chains = f'<path d="M26 19 V38 M74 19 V38" stroke="{INK}" stroke-width="3" stroke-dasharray="4 3"/>'
    lines = "".join(f'<rect x="22" y="{y}" width="{w}" height="3.5" rx="1.5" fill="{shade(c, 0.62)}"/>' for y, w in ((50, 56), (60, 44), (70, 50)))
    return chains + ink_group(out) + lines


def shelf(m: Mat, r: Rand) -> str:
    return boxes_svg(
        [
            Box(0.8, 1, 0, 1, 0, 1, m.color, m.top, m.side),
            Box(0, 0.8, 0, 1, 0.45, 0.58, m.color, m.top, m.side),
            Box(0, 0.8, 0, 1, 0, 0.1, m.color, m.top, m.side),
        ],
        r,
    )


def bed(color: str, r: Rand) -> str:
    wood = "#8a6544"
    return boxes_svg(
        [
            Box(0, 1, 0, 1, 0, 0.18, wood),
            Box(0.05, 0.95, 0.05, 0.95, 0.18, 0.5, color),
            Box(0.6, 0.95, 0.1, 0.9, 0.5, 0.62, "#f2ece0"),
        ],
        r,
    )


def banner(color: str, r: Rand) -> str:
    out = f'<rect x="14" y="8" width="72" height="7" rx="3" fill="#8a6544"/>'
    out += f'<path d="M22 15 H78 V86 L50 74 L22 86 Z" fill="{color}"/>'
    out += f'<path d="M30 30 H70 V36 H30Z" fill="{shade(color, 0.8)}"/>'
    return ink_group(out)


def candle(color: str, r: Rand) -> str:
    out = f'<rect x="38" y="34" width="24" height="56" rx="4" fill="{color}"/>'
    out += f'<path d="M38 40 q12 6 24 0" fill="{shade(color, 1.15)}"/>'
    flame = f'<path d="M50 8 Q60 22 54 30 Q50 34 46 30 Q40 22 50 8Z" fill="#e8b85a"/>'
    return f'<rect x="48.5" y="26" width="3" height="10" fill="{INK}"/>' + ink_group(out + flame)


def torch(flame="#e8b85a", stick="#8a6544") -> str:
    out = f'<rect x="44" y="34" width="12" height="58" rx="3" fill="{stick}"/>'
    out += f'<path d="M50 6 Q66 24 58 36 Q50 42 42 36 Q34 24 50 6Z" fill="#d8573c"/>'
    out += f'<path d="M50 18 Q58 28 54 34 Q50 37 46 34 Q42 28 50 18Z" fill="{flame}"/>'
    return ink_group(out)


def lantern(color="#5a5a5a", glow="#f3cf6a") -> str:
    out = f'<rect x="44" y="6" width="12" height="10" rx="3" fill="{color}"/>'
    out += f'<rect x="28" y="16" width="44" height="10" rx="3" fill="{color}"/>'
    out += f'<rect x="32" y="26" width="36" height="52" rx="3" fill="{glow}"/>'
    out += f'<rect x="28" y="78" width="44" height="12" rx="3" fill="{color}"/>'
    out += f'<rect x="48" y="26" width="4" height="52" fill="{color}"/>'
    return ink_group(out)


def campfire() -> str:
    out = f'<rect x="12" y="72" width="76" height="12" rx="4" fill="#6e5440" transform="rotate(-12 50 78)"/>'
    out += f'<rect x="12" y="72" width="76" height="12" rx="4" fill="#8a6544" transform="rotate(12 50 78)"/>'
    out += '<path d="M50 14 Q76 44 66 66 Q58 78 50 78 Q42 78 34 66 Q24 44 40 30 Q44 46 50 48 Q46 30 50 14Z" fill="#d8573c"/>'
    out += '<path d="M50 44 Q62 56 58 66 Q54 72 50 72 Q44 72 42 64 Q42 54 50 44Z" fill="#e8b85a"/>'
    return ink_group(out)


def ladder(m: Mat, r: Rand) -> str:
    c = m.color
    out = f'<rect x="22" y="6" width="9" height="88" rx="2" fill="{c}"/><rect x="69" y="6" width="9" height="88" rx="2" fill="{c}"/>'
    out += "".join(f'<rect x="28" y="{y}" width="44" height="7" rx="2" fill="{shade(c, 0.9)}"/>' for y in (14, 34, 54, 74))
    return ink_group(out)


def rail() -> str:
    out = "".join(f'<rect x="18" y="{y}" width="64" height="8" rx="2" fill="#8a6544"/>' for y in (14, 34, 54, 74))
    out += '<rect x="30" y="6" width="7" height="88" fill="#a9a296"/><rect x="63" y="6" width="7" height="88" fill="#a9a296"/>'
    return ink_group(out, 3.5)


def lightning_rod(color: str) -> str:
    out = f'<rect x="45" y="22" width="10" height="72" rx="3" fill="{color}"/><circle cx="50" cy="16" r="10" fill="{shade(color, 1.1)}"/>'
    return ink_group(out)


def lever() -> str:
    out = '<rect x="47" y="14" width="7" height="56" rx="3" fill="#8a6544" transform="rotate(25 50 70)"/>'
    out += '<rect x="22" y="64" width="56" height="24" rx="4" fill="#b8b4aa"/>'
    return ink_group(out)


def bell() -> str:
    out = '<rect x="20" y="8" width="60" height="8" rx="3" fill="#6e5440"/>'
    out += '<path d="M50 18 Q30 20 30 50 Q30 66 20 74 H80 Q70 66 70 50 Q70 20 50 18Z" fill="#e8c45a"/>'
    out += '<circle cx="50" cy="80" r="7" fill="#c49a3a"/>'
    return ink_group(out)


def cobweb() -> str:
    lines = "".join(f'<line x1="50" y1="50" x2="{50+44*c:.1f}" y2="{50+44*s:.1f}"/>' for c, s in ((1, 0), (0.7, 0.7), (0, 1), (-0.7, 0.7), (-1, 0), (-0.7, -0.7), (0, -1), (0.7, -0.7)))
    rings = "".join(f'<circle cx="50" cy="50" r="{rr}" fill="none"/>' for rr in (14, 28, 42))
    return f'<g stroke="#f2ece0" stroke-width="6" fill="none">{lines}{rings}</g><g stroke="{INK}" stroke-width="2" fill="none">{lines}{rings}</g>'


def scaffolding() -> str:
    c = "#d9c26a"
    from geometry import Box as B

    return boxes_svg(
        [
            B(0, 1, 0, 1, 0.88, 1, c),
            B(0.85, 1, 0, 0.15, 0, 0.88, c),
            B(0, 0.15, 0, 0.15, 0, 0.88, c),
            B(0.85, 1, 0.85, 1, 0, 0.88, c),
            B(0, 0.15, 0.85, 1, 0, 0.88, c),
        ],
        Rand("scaffold"),
    )


def chest(color="#b07a4a", trim="#5a4a3a") -> str:
    from geometry import Box as B
    import patterns as pt

    lid = pt.face_art(f'<rect x="0" y="5.2" width="16" height="1" fill="{trim}"/><rect x="6.5" y="4" width="3" height="4" fill="#d9c088"/>')
    return boxes_svg([B(0.06, 0.94, 0.06, 0.94, 0, 0.88, color, None, lid)], Rand("chest"))


def cake() -> str:
    from geometry import Box as B
    import patterns as pt

    icing = pt.face_art('<rect x="0" y="0" width="16" height="3" fill="#f6f1e6"/>' + "".join(f'<circle cx="{x}" cy="3" r="1.4" fill="#f6f1e6"/>' for x in (2, 6, 10, 14)))
    berries = pt.face_art("".join(f'<circle cx="{x}" cy="{y}" r="1.3" fill="#c0533a"/>' for x, y in ((4, 4), (11, 5), (6, 11), (12, 12), (8, 8))))
    return boxes_svg([B(0.06, 0.94, 0.06, 0.94, 0, 0.5, "#f6f1e6", berries, icing, side_color="#d9a86a")], Rand("cake"))


def flower_pot(plant: str = "") -> str:
    out = '<path d="M30 56 H70 L64 92 H36 Z" fill="#b8704e"/><rect x="26" y="50" width="48" height="10" rx="3" fill="#c88262"/>'
    return plant + ink_group(out)


def cauldron() -> str:
    out = '<path d="M14 26 H86 V76 Q86 88 74 88 H26 Q14 88 14 76 Z" fill="#5a5a5e"/>'
    out += '<rect x="10" y="20" width="80" height="10" rx="3" fill="#6e6e72"/><rect x="20" y="86" width="12" height="8" fill="#5a5a5e"/><rect x="68" y="86" width="12" height="8" fill="#5a5a5e"/>'
    return ink_group(out)


def anvil() -> str:
    out = '<path d="M10 22 H90 L80 40 H62 V62 H38 V40 H20 Z" fill="#5f6068"/>'
    out += '<rect x="24" y="62" width="52" height="10" fill="#55565e"/><rect x="18" y="72" width="64" height="18" rx="3" fill="#4a4a52"/>'
    return ink_group(out)


def grindstone() -> str:
    out = '<rect x="18" y="56" width="10" height="36" fill="#6e5440"/><rect x="72" y="56" width="10" height="36" fill="#6e5440"/>'
    out += '<circle cx="50" cy="46" r="32" fill="#b8b4aa"/><circle cx="50" cy="46" r="10" fill="#8f8a80"/>'
    return ink_group(out)


def lectern() -> str:
    out = '<rect x="38" y="44" width="24" height="40" fill="#8a6544"/><rect x="22" y="84" width="56" height="10" rx="2" fill="#6e5440"/>'
    out += '<path d="M14 40 L86 22 L90 36 L18 54 Z" fill="#c9a57a"/><path d="M30 38 L70 28 L72 34 L32 44Z" fill="#f2ece0"/>'
    return ink_group(out)


def brewing_stand() -> str:
    out = '<rect x="47" y="10" width="6" height="70" fill="#8a6544"/><rect x="22" y="84" width="56" height="8" rx="3" fill="#8f8a80"/>'
    for x in (24, 50, 76):
        out += f'<circle cx="{x}" cy="68" r="10" fill="#a9cfd8"/><rect x="{x-3}" y="50" width="6" height="10" fill="#d9eaea"/>'
    out += '<circle cx="24" cy="70" r="6" fill="#c0533a"/><circle cx="76" cy="70" r="6" fill="#86629e"/>'
    return ink_group(out)


def hopper() -> str:
    out = '<path d="M10 16 H90 V40 L66 62 V78 H34 V62 L10 40 Z" fill="#5f6068"/><rect x="40" y="78" width="20" height="14" fill="#55565e"/>'
    out += '<rect x="18" y="20" width="64" height="12" fill="#3a3633"/>'
    return ink_group(out)


def composter() -> str:
    from geometry import Box as B
    import patterns as pt

    return boxes_svg([B(0, 1, 0, 1, 0, 1, "#8a6a3e", pt.face_art('<rect x="2" y="2" width="12" height="12" fill="#5a4a32"/>'), pt.planks(5))], Rand("composter"))


def decorated_pot() -> str:
    out = '<path d="M36 10 H64 V20 Q86 30 84 58 Q82 88 50 92 Q18 88 16 58 Q14 30 36 20 Z" fill="#b8704e"/>'
    out += '<path d="M22 50 Q50 58 78 50 L80 64 Q50 72 20 64 Z" fill="#7a3e2e"/>'
    return ink_group(out)


def sponge(wet=False) -> str:
    import patterns as pt
    from materials import Mat as M

    c = "#a8a85a" if wet else "#e0c85a"
    return cube(M(c, pt.speckle(18, 1.2, [shade(c, 0.7)]), pt.speckle(18, 1.2, [shade(c, 0.7)])), Rand("sponge"))


def skull() -> str:
    out = '<path d="M20 50 Q20 14 50 14 Q80 14 80 50 V70 Q80 80 70 80 V90 H30 V80 Q20 80 20 70Z" fill="#ece6da"/>'
    eyes = '<circle cx="37" cy="52" r="8" fill="#2a221d"/><circle cx="63" cy="52" r="8" fill="#2a221d"/><path d="M46 70 L50 62 L54 70Z" fill="#2a221d"/>'
    return ink_group(out) + eyes


def bee_nest(hive=False) -> str:
    from geometry import Box as B
    import patterns as pt

    c = "#d9b866" if hive else "#c8a058"
    front = pt.face_art('<rect x="5" y="7" width="6" height="3" rx="1.5" fill="#3a2a1a"/>')
    side = pt.bands(4, 0.82)
    return boxes_svg([B(0, 1, 0, 1, 0, 1, c, pt.speckle(6, 1.0, [shade(c, 0.8)]), pt.combine(side, front))], Rand("bee"))


def bookshelf() -> str:
    from geometry import Box as B
    import patterns as pt

    return boxes_svg([B(0, 1, 0, 1, 0, 1, "#c9a57a", pt.planks(), pt.books())], Rand("books"))


def note_block() -> str:
    from geometry import Box as B
    import patterns as pt

    note = pt.face_art('<circle cx="6" cy="11" r="2.2" fill="#2a221d"/><rect x="7.4" y="3" width="1.2" height="8" fill="#2a221d"/><path d="M8.6 3 q3 1 3 4" fill="none" stroke="#2a221d" stroke-width="1.2"/>')
    return boxes_svg([B(0, 1, 0, 1, 0, 1, "#8a6544", pt.planks(), note)], Rand("note"))


def blast_barrel() -> str:
    from geometry import Box as B
    import patterns as pt

    band = pt.face_art('<rect x="0" y="5" width="16" height="6" fill="#f2ece0"/><rect x="5" y="6.3" width="6" height="3.4" fill="#2a221d"/>')
    return boxes_svg([B(0, 1, 0, 1, 0, 1, "#c0533a", pt.face_art('<circle cx="8" cy="8" r="2" fill="#2a221d"/>'), pt.combine(pt.strands(0.85), band))], Rand("tnt"))


def frogspawn() -> str:
    eggs = "".join(f'<circle cx="{x}" cy="{y}" r="8" fill="#d9eaea"/>' for x, y in ((30, 40), (50, 34), (70, 42), (38, 60), (60, 60), (50, 76)))
    dots = "".join(f'<circle cx="{x}" cy="{y}" r="2.6" fill="#2a221d"/>' for x, y in ((30, 40), (50, 34), (70, 42), (38, 60), (60, 60), (50, 76)))
    return ink_group(eggs, 3) + dots


def turtle_egg() -> str:
    return ink_group('<ellipse cx="40" cy="58" rx="16" ry="20" fill="#f2ece0"/><ellipse cx="64" cy="66" rx="13" ry="16" fill="#e8e0c8"/>') + '<circle cx="36" cy="52" r="2.5" fill="#7c9a5c"/><circle cx="46" cy="64" r="2" fill="#7c9a5c"/><circle cx="66" cy="62" r="2" fill="#7c9a5c"/>'


def jack_o_lantern(lit: bool, carved: bool) -> str:
    from geometry import Box as B
    import patterns as pt

    face = ""
    if carved:
        glow = "#f3cf6a" if lit else "#3a2a1a"
        face = f'<polygon points="3,5 6,5 4.5,8" fill="{glow}"/><polygon points="10,5 13,5 11.5,8" fill="{glow}"/><path d="M3 10 H13 L11 13 H5Z" fill="{glow}"/>'
    side = pt.combine(pt.bands(4, 0.85) if False else pt.face_art('<rect x="3.5" y="0" width="0.8" height="16" fill="DARK"/><rect x="11.5" y="0" width="0.8" height="16" fill="DARK"/>'))
    top = pt.face_art('<rect x="6.5" y="6.5" width="3" height="3" fill="#6f8f4e"/>')
    return boxes_svg([B(0, 1, 0, 1, 0, 1, "#df8a45", top, pt.combine(side, pt.face_art(face)) if face else side)], Rand("pumpkin"))


def melon() -> str:
    from geometry import Box as B
    import patterns as pt

    return boxes_svg([B(0, 1, 0, 1, 0, 1, "#7caa52", pt.strands(0.78), pt.strands(0.78))], Rand("melon"))


def workstation(top_art: str, side_art: str, color: str, top_color=None) -> str:
    from geometry import Box as B
    import patterns as pt

    return boxes_svg([B(0, 1, 0, 1, 0, 1, color, pt.face_art(top_art), pt.face_art(side_art), top_color=top_color)], Rand(top_art))
