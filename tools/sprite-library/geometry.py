"""Isometric box geometry for Sōzō block sprites.

All sprites share the game's icon box: viewBox "-6 -6 112 112", content in 0–100.
A block is the unit cube a, b, c ∈ [0, 1]:
  a runs up-right (screen +40, -20), b runs down-right (+40, +20), c is height (0, -48).
The visible faces of a box are its top (c = c1), its front-left face (a = a0) and its
front-right face (b = b1).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

INK = "#2a221d"
STROKE = 3.2


def P(a: float, b: float, c: float) -> tuple[float, float]:
    return (10 + 40 * a + 40 * b, 26 - 20 * a + 20 * b + 48 * (1 - c))


def pts(points) -> str:
    return " ".join(f"{x:.2f},{y:.2f}" for x, y in points)


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def shade(h: str, k: float) -> str:
    """Multiply a colour (k < 1 darkens, k > 1 lightens towards white)."""
    r, g, b = hex_to_rgb(h)
    if k <= 1:
        r, g, b = r * k, g * k, b * k
    else:
        t = k - 1
        r, g, b = r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(v))) for v in (r, g, b))


def mix(h1: str, h2: str, t: float) -> str:
    a, b = hex_to_rgb(h1), hex_to_rgb(h2)
    return "#%02x%02x%02x" % tuple(round(x + (y - x) * t) for x, y in zip(a, b))


# A face painter draws detail in texture space: a w × h rectangle (16 units per block edge,
# u to the right, v downwards) and returns SVG fragments in those coordinates.
Painter = Callable[[float, float, str, "Rand"], str]


class Rand:
    """Small deterministic RNG (so every sprite renders the same every time)."""

    def __init__(self, seed: str):
        h = 2166136261
        for ch in seed:
            h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
        self.s = h or 1

    def __call__(self) -> float:
        self.s ^= (self.s << 13) & 0xFFFFFFFF
        self.s ^= self.s >> 17
        self.s ^= (self.s << 5) & 0xFFFFFFFF
        return (self.s & 0xFFFFFFFF) / 4294967296


@dataclass
class Box:
    a0: float
    a1: float
    b0: float
    b1: float
    c0: float
    c1: float
    color: str  # base colour (top face)
    top: Painter | None = None
    side: Painter | None = None
    side_color: str | None = None
    top_color: str | None = None
    faces: tuple[bool, bool, bool] = (True, True, True)  # top, left, right
    outline: bool = True
    opacity: float = 1.0
    extra: dict = field(default_factory=dict)


_clip_id = [0]


def _face(origin, u, v, w, h, fill, painter, rand, opacity) -> str:
    """One parallelogram face: flat fill, painted detail (clipped), returned with its outline path."""
    ox, oy = origin
    poly = [origin, (ox + u[0], oy + u[1]), (ox + u[0] + v[0], oy + u[1] + v[1]), (ox + v[0], oy + v[1])]
    op = f' fill-opacity="{opacity}"' if opacity < 1 else ""
    out = f'<polygon points="{pts(poly)}" fill="{fill}"{op}/>'
    if painter is not None and w > 0 and h > 0:
        detail = painter(w, h, fill, rand)
        if detail:
            _clip_id[0] += 1
            cid = f"c{_clip_id[0]}"
            m = (u[0] / w, u[1] / w, v[0] / h, v[1] / h, ox, oy)
            out += (
                f'<clipPath id="{cid}"><polygon points="{pts(poly)}"/></clipPath>'
                f'<g clip-path="url(#{cid})"><g transform="matrix({" ".join(f"{x:.4f}" for x in m)})">{detail}</g></g>'
            )
    return out, poly


def box_svg(bx: Box, rand: Rand) -> str:
    a0, a1, b0, b1, c0, c1 = bx.a0, bx.a1, bx.b0, bx.b1, bx.c0, bx.c1
    top_c = bx.top_color or bx.color
    side_c = bx.side_color or bx.color
    body = ""
    outlines = []
    show_top, show_left, show_right = bx.faces
    if show_left and b1 > b0 and c1 > c0:
        o = P(a0, b0, c1)
        u = (P(a0, b1, c1)[0] - o[0], P(a0, b1, c1)[1] - o[1])
        v = (0, 48 * (c1 - c0))
        s, poly = _face(o, u, v, (b1 - b0) * 16, (c1 - c0) * 16, shade(side_c, 0.86), bx.side, rand, bx.opacity)
        body += s
        outlines.append(poly)
    if show_right and a1 > a0 and c1 > c0:
        o = P(a0, b1, c1)
        u = (P(a1, b1, c1)[0] - o[0], P(a1, b1, c1)[1] - o[1])
        v = (0, 48 * (c1 - c0))
        s, poly = _face(o, u, v, (a1 - a0) * 16, (c1 - c0) * 16, shade(side_c, 0.7), bx.side, rand, bx.opacity)
        body += s
        outlines.append(poly)
    if show_top and a1 > a0 and b1 > b0:
        o = P(a0, b0, c1)
        u = (P(a1, b0, c1)[0] - o[0], P(a1, b0, c1)[1] - o[1])
        v = (P(a0, b1, c1)[0] - o[0], P(a0, b1, c1)[1] - o[1])
        s, poly = _face(o, u, v, (a1 - a0) * 16, (b1 - b0) * 16, top_c, bx.top, rand, bx.opacity)
        body += s
        outlines.append(poly)
    if bx.outline:
        sw = STROKE if (a1 - a0) > 0.3 or (c1 - c0) > 0.3 else STROKE * 0.75
        body += "".join(
            f'<polygon points="{pts(p)}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>'
            for p in outlines
        )
    return body


def boxes_svg(boxes: list[Box], rand: Rand) -> str:
    """Boxes are drawn in list order: shape builders list far boxes first."""
    return "".join(box_svg(bx, rand) for bx in boxes)


def svg_doc(body: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112" width="112" height="112">{body}</svg>'


def ink_group(body: str, width: float = 4.2) -> str:
    """Wrap filled 2D shapes so each gets an ink outline under its fill (icon style)."""
    return (
        f'<g stroke="{INK}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round" '
        f'paint-order="stroke">{body}</g>'
    )
