"""Surface painters for block faces, drawn in texture space (16 units per block edge).

Each painter takes (w, h, fill, rand) and returns SVG for a w × h rectangle whose origin is the
face's top-left corner. Detail stays sparse: Sōzō blocks are flat ink washes with a few
brush marks, not busy pixel textures.
"""

from __future__ import annotations

from geometry import INK, shade, mix


def rect(x, y, w, h, fill, op=1.0):
    o = f' fill-opacity="{op:.2f}"' if op < 1 else ""
    return f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" fill="{fill}"{o}/>'


def circ(x, y, r, fill, op=1.0):
    o = f' fill-opacity="{op:.2f}"' if op < 1 else ""
    return f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}" fill="{fill}"{o}/>'


def poly(points, fill, op=1.0):
    o = f' fill-opacity="{op:.2f}"' if op < 1 else ""
    return f'<polygon points="{" ".join(f"{x:.2f},{y:.2f}" for x, y in points)}" fill="{fill}"{o}/>'


def line(x1, y1, x2, y2, fill, t=0.7):
    """A thin stroke as a filled quad (strokes would be skewed by the face transform)."""
    import math

    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1
    nx, ny = -dy / n * t / 2, dx / n * t / 2
    return poly([(x1 + nx, y1 + ny), (x2 + nx, y2 + ny), (x2 - nx, y2 - ny), (x1 - nx, y1 - ny)], fill)


def seam(fill):
    return shade(fill, 0.78)


# --- painters -------------------------------------------------------------------------------


def speckle(count=10, size=0.9, colors=None, op=0.9):
    def p(w, h, fill, r):
        cs = colors or [shade(fill, 0.85), shade(fill, 1.12)]
        n = max(1, round(count * w * h / 256))
        return "".join(circ(r() * w, r() * h, size * (0.6 + r() * 0.8), cs[int(r() * len(cs))], op) for _ in range(n))

    return p


def planks(every=4):
    def p(w, h, fill, r):
        out = ""
        y = every
        row = 0
        while y < h + 0.01:
            out += rect(0, y - 0.45, w, 0.9, seam(fill))
            x = (r() * 8 + row * 5) % 16
            while x < w:
                out += rect(x, y - every, 0.8, every, seam(fill), 0.7)
                x += 10 + r() * 6
            y += every
            row += 1
        return out

    return p


def bricks(rows=4, mortar="#e3d6c2", cols=8):
    def p(w, h, fill, r):
        out = ""
        y = 0.0
        row = 0
        while y < h:
            out += rect(0, y + rows - 0.5, w, 1.0, mortar)
            off = (cols / 2) * (row % 2)
            x = off
            while x < w:
                out += rect(x - 0.5, y, 1.0, rows, mortar)
                x += cols
            # a little tone variation per brick
            x = off - cols
            while x < w:
                out += rect(x + 0.6, y + 0.6, cols - 1.2, rows - 1.6, shade(fill, 0.9 + r() * 0.2), 0.5)
                x += cols
            y += rows
            row += 1
        return out

    return p


def stone_bricks(mortar_k=0.72):
    return bricks(rows=8, cols=16, mortar=None) if False else _stone_bricks(mortar_k)


def _stone_bricks(k):
    def p(w, h, fill, r):
        m = shade(fill, k)
        out = ""
        y = 0.0
        row = 0
        while y < h:
            out += rect(0, y + 7.4, w, 1.2, m)
            x = 8 * (row % 2)
            while x < w:
                out += rect(x - 0.6, y, 1.2, 8, m)
                x += 16
            y += 8
            row += 1
        return out

    return p


def tiles(size=8):
    def p(w, h, fill, r):
        m = seam(fill)
        out = ""
        x = size
        while x < w:
            out += rect(x - 0.5, 0, 1, h, m)
            x += size
        y = size
        while y < h:
            out += rect(0, y - 0.5, w, 1, m)
            y += size
        return out

    return p


def cobble():
    def p(w, h, fill, r):
        out = ""
        cols = [shade(fill, 0.82), shade(fill, 0.92), shade(fill, 1.1)]
        n = max(3, round(9 * w * h / 256))
        for _ in range(n):
            cx, cy = r() * w, r() * h
            rx, ry = 2 + r() * 2.5, 1.6 + r() * 2
            out += f'<ellipse cx="{cx:.2f}" cy="{cy:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" fill="{cols[int(r()*3)]}"/>'
            out += f'<ellipse cx="{cx:.2f}" cy="{cy:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" fill="none" stroke="{shade(fill, 0.7)}" stroke-width="0.6"/>'
        return out

    return p


def log_side(bark):
    def p(w, h, fill, r):
        out = ""
        x = 1.5 + r() * 2
        while x < w:
            y0 = r() * 4
            out += rect(x, y0, 1.0, h * (0.5 + r() * 0.5), shade(bark, 0.8))
            x += 3 + r() * 2.5
        return out

    return p


def log_top(bark, rings):
    def p(w, h, fill, r):
        cx, cy = w / 2, h / 2
        out = rect(0, 0, w, h, bark)
        out += f'<ellipse cx="{cx}" cy="{cy}" rx="{w/2-1.6:.2f}" ry="{h/2-1.6:.2f}" fill="{fill}"/>'
        for k in (0.62, 0.36):
            out += f'<ellipse cx="{cx}" cy="{cy}" rx="{(w/2-1.6)*k:.2f}" ry="{(h/2-1.6)*k:.2f}" fill="none" stroke="{rings}" stroke-width="0.8"/>'
        return out

    return p


def ore(gem, count=5):
    def p(w, h, fill, r):
        out = ""
        n = max(2, round(count * w * h / 256))
        for _ in range(n):
            cx, cy = 2 + r() * (w - 4), 2 + r() * (h - 4)
            s = 1.4 + r() * 1.1
            out += poly([(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)], gem)
            out += circ(cx - s * 0.3, cy - s * 0.3, s * 0.3, shade(gem, 1.4))
        return out

    return p


def glass(frame):
    def p(w, h, fill, r):
        out = rect(0, 0, w, 1.4, frame) + rect(0, h - 1.4, w, 1.4, frame)
        out += rect(0, 0, 1.4, h, frame) + rect(w - 1.4, 0, 1.4, h, frame)
        out += line(3, h * 0.55, w * 0.45, 3, "#ffffff", 1.4)
        out += line(4.5, h * 0.75, w * 0.6, 4.5, "#ffffff", 0.8)
        return out

    return p


def wool():
    def p(w, h, fill, r):
        out = ""
        y = 2.5
        while y < h:
            d = ""
            x = 0
            d = f"M0 {y:.2f}"
            while x < w:
                d += f" q2 -1.2 4 0 q2 1.2 4 0"
                x += 8
            out += f'<path d="{d}" fill="none" stroke="{shade(fill, 0.84)}" stroke-width="0.8"/>'
            y += 4
        return out

    return p


def polished(k=1.12):
    def p(w, h, fill, r):
        return rect(1.6, 1.6, w - 3.2, h - 3.2, shade(fill, k), 0.6) + rect(1.6, 1.6, w - 3.2, 0.8, "#ffffff", 0.35)

    return p


def chiseled(motif="diamond"):
    def p(w, h, fill, r):
        m = shade(fill, 0.72)
        out = rect(2, 2, w - 4, h - 4, "none")
        out += f'<rect x="2.2" y="2.2" width="{w-4.4:.2f}" height="{h-4.4:.2f}" fill="none" stroke="{m}" stroke-width="1"/>'
        cx, cy = w / 2, h / 2
        s = min(w, h) * 0.22
        if motif == "diamond":
            out += poly([(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)], m)
        elif motif == "circle":
            out += circ(cx, cy, s, m)
        elif motif == "lines":
            for k in (-1, 0, 1):
                out += rect(cx - s, cy + k * s * 0.7 - 0.5, 2 * s, 1, m)
        return out

    return p


def cracked():
    def p(w, h, fill, r):
        m = shade(fill, 0.6)
        x, y = w * (0.2 + r() * 0.2), 0.0
        out = ""
        while y < h:
            nx, ny = x + (r() - 0.5) * 6, y + 2.5 + r() * 2
            out += line(x, y, nx, ny, m, 0.8)
            x, y = nx, ny
        return out

    return p


def mossy(moss="#7c9a5c"):
    def p(w, h, fill, r):
        out = ""
        n = max(2, round(6 * w * h / 256))
        for _ in range(n):
            out += f'<ellipse cx="{r()*w:.2f}" cy="{r()*h:.2f}" rx="{2+r()*3:.2f}" ry="{1.5+r()*2:.2f}" fill="{moss}"/>'
        return out

    return p


def leaves(dark):
    def p(w, h, fill, r):
        out = ""
        n = max(3, round(12 * w * h / 256))
        for _ in range(n):
            cx, cy, s = r() * w, r() * h, 1.6 + r() * 1.4
            c = dark if r() < 0.6 else shade(fill, 1.15)
            out += f'<ellipse cx="{cx:.2f}" cy="{cy:.2f}" rx="{s:.2f}" ry="{s*0.6:.2f}" transform="rotate({r()*180:.0f} {cx:.2f} {cy:.2f})" fill="{c}"/>'
        return out

    return p


def grate(hole):
    def p(w, h, fill, r):
        out = ""
        y = 2
        while y < h - 1:
            x = 2
            while x < w - 1:
                out += rect(x, y, 2.6, 2.6, hole)
                x += 4
            y += 4
        return out

    return p


def glazed(accent):
    def p(w, h, fill, r):
        cx, cy = w / 2, h / 2
        out = f'<path d="M{cx-6} {cy} q6 -8 12 0 q-6 8 -12 0z" fill="{accent}"/>'
        out += circ(cx, cy, 1.6, fill)
        out += poly([(0, 0), (4, 0), (0, 4)], accent) + poly([(w, h), (w - 4, h), (w, h - 4)], accent)
        return out

    return p


def capped_side(top_color, band=4.0, drips=True):
    """Side of a covered block (grass, snow, moss): a band of the top colour with soft drips."""

    def p(w, h, fill, r):
        out = rect(0, 0, w, band, top_color)
        if drips:
            x = 1 + r() * 2
            while x < w:
                dh = 1 + r() * 2.5
                out += f'<rect x="{x:.2f}" y="{band-0.5:.2f}" width="2" height="{dh:.2f}" rx="1" fill="{top_color}"/>'
                x += 3 + r() * 3
        return out

    return p


def bands(every=4, k=0.88):
    def p(w, h, fill, r):
        out = ""
        y = every
        while y < h:
            out += rect(0, y - 0.6, w, 1.2, shade(fill, k))
            y += every
        return out

    return p


def pillar():
    def p(w, h, fill, r):
        out = ""
        for x in (w * 0.25, w * 0.5, w * 0.75):
            out += rect(x - 0.5, 1, 1, h - 2, shade(fill, 0.85))
        return out + rect(0, 0, w, 1.4, shade(fill, 0.8)) + rect(0, h - 1.4, w, 1.4, shade(fill, 0.8))

    return p


def rivets():
    def p(w, h, fill, r):
        m = shade(fill, 0.75)
        return "".join(circ(x, y, 0.8, m) for x in (2.5, w - 2.5) for y in (2.5, h - 2.5)) + rect(
            1, h / 2 - 0.4, w - 2, 0.8, shade(fill, 1.15), 0.6
        )

    return p


def patina(green):
    def p(w, h, fill, r):
        out = ""
        for _ in range(max(2, round(5 * w * h / 256))):
            out += f'<ellipse cx="{r()*w:.2f}" cy="{r()*h:.2f}" rx="{1.5+r()*2.5:.2f}" ry="{1+r()*1.5:.2f}" fill="{green}"/>'
        return out

    return p


def checker(k=0.85, size=4):
    def p(w, h, fill, r):
        out = ""
        for yi in range(int(h // size) + 1):
            for xi in range(int(w // size) + 1):
                if (xi + yi) % 2:
                    out += rect(xi * size, yi * size, size, size, shade(fill, k))
        return out

    return p


def strands(k=0.82):
    def p(w, h, fill, r):
        out = ""
        x = 1
        while x < w:
            out += rect(x, 0, 0.7, h, shade(fill, k))
            x += 1.6 + r() * 1.2
        return out + rect(0, h * 0.45, w, 1.6, shade(fill, 0.7))

    return p


def books():
    cols = ["#c0533a", "#3f7f86", "#d9b866", "#5b6f9a", "#7c9a5c", "#8a6544"]

    def p(w, h, fill, r):
        out = rect(0, 0, w, h, shade(fill, 0.75))
        for shelf in (1.5, 9.5):
            x = 1
            while x < w - 1:
                bw = 1.4 + r() * 1.4
                bh = 5 + r() * 1.2
                out += rect(x, shelf + (6.5 - bh), bw, bh, cols[int(r() * len(cols))])
                x += bw + 0.3
        out += rect(0, 0, w, 1.2, fill) + rect(0, 7.6, w, 1.6, fill) + rect(0, h - 1, w, 1, fill)
        return out

    return p


def face_art(svg):
    """A fixed drawing in a 16 × 16 face (furnace fronts, crafting tops, etc.)."""

    def p(w, h, fill, r):
        return svg.replace("FILL", fill).replace("DARK", shade(fill, 0.6)).replace("INK", INK)

    return p


def combine(*painters):
    def p(w, h, fill, r):
        return "".join(q(w, h, fill, r) for q in painters if q)

    return p


def tint(color, op=0.5):
    def p(w, h, fill, r):
        return rect(0, 0, w, h, color, op)

    return p


__all__ = [n for n in dir() if not n.startswith("_")]
_ = mix
