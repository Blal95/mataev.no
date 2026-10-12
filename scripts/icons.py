"""Render the site's icons from `src/app/icon.svg`, so every icon is the mark.

The SVG is the one source: an ultramarine tile and the tower-M on it, drawn as
a solid silhouette so it holds at 16px. This reads its shapes (rects, and
paths made of M/L/Z, a <g> translate+scale, a <use> matrix) and fills them at
16x, then scales down, which anti-aliases the edges.

    python3 scripts/icons.py

Writes `src/app/favicon.ico` and `public/favicon.ico` (16, 32, 48),
`public/icon-{48,192,512}.png` (the rounded tile, transparent corners) and
`public/apple-touch-icon.png` (180, square: iOS rounds it itself).
"""

import os
import re

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, "src/app/icon.svg")
VIEW = 64
SUPER = 16


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def parse(svg: str):
    tile = re.search(r'<rect width="64" height="64" rx="([\d.]+)" fill="(#[0-9a-fA-F]{6})"', svg)
    group = re.search(r'<g transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)" fill="(#[0-9a-fA-F]{6})">', svg)
    assert tile and group, "icon.svg no longer has the shape this script reads"
    body = svg[group.end():]
    shapes: list[list[tuple[float, float]]] = []
    for x, y, w, h in re.findall(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"', body):
        x, y, w, h = map(float, (x, y, w, h))
        shapes.append([(x, y), (x + w, y), (x + w, y + h), (x, y + h)])
    tower = body[body.index('<g id="t">'):body.index("</g>")]
    towers = [[tuple(map(float, p)) for p in re.findall(r"[ML]\s*([\d.]+)\s+([\d.]+)", d)] for d in re.findall(r'<path d="([^"]+)"', tower)]
    rest = body.replace(tower, "")
    for d in re.findall(r'<path d="([^"]+)"', rest):
        shapes.append([tuple(map(float, p)) for p in re.findall(r"[ML]\s*([\d.]+)\s+([\d.]+)", d)])
    use = re.search(r'<use href="#t" transform="matrix\(-1,0,0,1,([\d.]+),0\)"/>', body)
    assert use, "icon.svg no longer mirrors the tower with <use>"
    mirror_x = float(use.group(1))
    shapes += towers + [[(mirror_x - x, y) for x, y in poly] for poly in towers]
    tx, ty, s = float(group.group(1)), float(group.group(2)), float(group.group(3))
    mark = [[(tx + x * s, ty + y * s) for x, y in poly] for poly in shapes]
    return float(tile.group(1)), hex_rgb(tile.group(2)), hex_rgb(group.group(4)), mark


def render(size: int, rounded: bool, rx: float, tile: tuple, ink: tuple, mark) -> Image.Image:
    big = size * SUPER
    k = big / VIEW
    im = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    draw.rounded_rectangle((0, 0, big - 1, big - 1), radius=rx * k if rounded else 0, fill=tile + (255,))
    for poly in mark:
        draw.polygon([(x * k, y * k) for x, y in poly], fill=ink + (255,))
    return im.resize((size, size), Image.LANCZOS)


def main() -> None:
    rx, tile, ink, mark = parse(open(SVG).read())
    for size in (48, 192, 512):
        render(size, True, rx, tile, ink, mark).save(os.path.join(ROOT, f"public/icon-{size}.png"), optimize=True)
    render(180, False, rx, tile, ink, mark).save(os.path.join(ROOT, "public/apple-touch-icon.png"), optimize=True)
    ico = render(256, True, rx, tile, ink, mark)
    for path in ("src/app/favicon.ico", "public/favicon.ico"):
        ico.save(os.path.join(ROOT, path), sizes=[(16, 16), (32, 32), (48, 48)])
    print("icons written")


if __name__ == "__main__":
    main()
