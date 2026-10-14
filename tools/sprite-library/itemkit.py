"""Shared drawing kit for Sōzō item sprites (the batch-1 materials recipe).

A bold ink silhouette, faces in three toon tones (light 1.0 / mid 0.86 / dark 0.7, highlight 1.22),
thin ink lines on inner edges, and white glints on shiny things.
"""

from __future__ import annotations

from geometry import INK, shade

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




# --- element helpers (shared by gear, food and later batches) ---------------------------------

_clip = [0]


def _cid() -> str:
    _clip[0] += 1
    return f"g{_clip[0]}"


def sil(*shapes: str) -> str:
    """Thick ink outline beneath a set of shapes (each an SVG element without fill)."""
    return f'<g fill="{INK}" stroke="{INK}" stroke-width="{OUT * 2}" stroke-linejoin="round" stroke-linecap="round">{"".join(shapes)}</g>'


def fill(shape: str, color: str, edge=True) -> str:
    """Insert a fill (and optional thin inner edge) into a bare SVG element."""
    e = f' stroke="{INK}" stroke-width="{EDGE}" stroke-linejoin="round" stroke-opacity="0.75"' if edge else ""
    return shape.replace("/>", f' fill="{color}"{e}/>', 1)


def Pd(d: str) -> str:
    return f'<path d="{d}"/>'


def R(x, y, w, h, rx=0) -> str:
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}"/>'


def Ci(x, y, r) -> str:
    return f'<circle cx="{x}" cy="{y}" r="{r}"/>'


def clipped(shape_d: str, inner: str) -> str:
    cid = _cid()
    return f'<clipPath id="{cid}"><path d="{shape_d}"/></clipPath><g clip-path="url(#{cid})">{inner}</g>'


def toned(shape_d: str, color: str, light_d: str | None = None, dark_d: str | None = None) -> str:
    """A shape in the mid tone with lighter/darker facets clipped inside it."""
    out = fill(Pd(shape_d), shade(color, MID))
    inner = ""
    if light_d:
        inner += f'<path d="{light_d}" fill="{shade(color, LIGHT)}"/>'
    if dark_d:
        inner += f'<path d="{dark_d}" fill="{shade(color, DARK)}"/>'
    if inner:
        out += clipped(shape_d, inner)
        out += f'<path d="{shape_d}" fill="none" stroke="{INK}" stroke-width="{EDGE}" stroke-opacity="0.75" stroke-linejoin="round"/>'
    return out


def turned(body: str) -> str:
    return f'<g transform="rotate(45 50 50)">{body}</g>'


def lit(shape_d: str, color: str) -> str:
    """Left-light / right-dark toon lighting for a front-facing piece."""
    out = fill(Pd(shape_d), shade(color, MID))
    out += clipped(
        shape_d,
        f'<rect x="-10" y="-10" width="52" height="120" fill="{shade(color, LIGHT)}"/>'
        f'<rect x="64" y="-10" width="60" height="120" fill="{shade(color, DARK)}"/>',
    )
    return out


def line_part(d: str, color: str, w: float) -> str:
    return (
        f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w + OUT * 1.4}" stroke-linecap="round" stroke-linejoin="round"/>'
        f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
    )
