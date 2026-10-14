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


