"""Turn one-ink Recraft screenprints of Borzik into recolourable masks.

Each drawing becomes two alpha masks with the same crop: `<pose>-ink.webp`
(the printed lines and fills) and `<pose>-fill.webp` (the silhouette, i.e. the
paper inside the outline). <InkArt> paints them with tokens, so the colours on
the page are exact whatever Recraft actually printed.

    python3 scripts/ink-masks.py --out public/art/borzik [--flat] bowl=src/bowl.png ...

`--flat` also writes `<pose>.webp`, a paper-and-ultramarine composite with a
transparent surround, for places that take a plain image (the cabin's Get Info).
"""

import argparse
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

PAPER = (0xF4, 0xF5, 0xF7)
ULTRA = (0x2B, 0x3A, 0xE0)
MAX_SIDE = 900
PAD = 20


def ink_alpha(rgb: Image.Image) -> np.ndarray:
    # Blue ink is dark in red and green; paper is bright in every channel.
    a = np.asarray(rgb).astype(np.float32)
    m = np.minimum(a[..., 0], a[..., 1])
    return np.clip((238.0 - m) / (238.0 - 60.0), 0, 1)


def silhouette(alpha: np.ndarray, grow: int = 11) -> np.ndarray:
    # Close small gaps in the outline, flood the outside from the border, and
    # whatever the flood could not reach is the body.
    barrier = Image.fromarray(((alpha > 0.3) * 255).astype(np.uint8))
    barrier = barrier.filter(ImageFilter.MaxFilter(grow))
    padded = ImageOps.expand(barrier, border=4, fill=0)
    ImageDraw.floodfill(padded, (0, 0), 128)
    inside = np.asarray(padded)[4:-4, 4:-4] != 128
    sil = Image.fromarray((inside * 255).astype(np.uint8))
    sil = sil.filter(ImageFilter.MinFilter(grow)).filter(ImageFilter.GaussianBlur(1.2))
    s = np.asarray(sil).astype(np.float32) / 255.0
    return np.maximum(np.clip((s - 0.5) * 2.2 + 0.5, 0, 1), alpha)


def as_mask(alpha: np.ndarray, box: tuple[int, int, int, int]) -> Image.Image:
    im = Image.fromarray((alpha * 255).astype(np.uint8)).crop(box)
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return im


def white_rgba(mask: Image.Image) -> Image.Image:
    out = Image.new("RGBA", mask.size, (255, 255, 255, 0))
    out.putalpha(mask)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--flat", action="store_true")
    ap.add_argument("poses", nargs="+", help="name=path.png")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    for spec in args.poses:
        name, path = spec.split("=", 1)
        rgb = Image.open(path).convert("RGB")
        ink = ink_alpha(rgb)
        fill = silhouette(ink)
        ys, xs = np.where(fill > 0.05)
        box = (
            max(int(xs.min()) - PAD, 0),
            max(int(ys.min()) - PAD, 0),
            min(int(xs.max()) + PAD, rgb.width),
            min(int(ys.max()) + PAD, rgb.height),
        )
        ink_m, fill_m = as_mask(ink, box), as_mask(fill, box)
        white_rgba(ink_m).save(os.path.join(args.out, f"{name}-ink.webp"), "WEBP", quality=90, method=6)
        white_rgba(fill_m).save(os.path.join(args.out, f"{name}-fill.webp"), "WEBP", quality=90, method=6)

        if args.flat:
            flat = Image.new("RGBA", ink_m.size, PAPER + (0,))
            flat.putalpha(fill_m)
            flat.paste(Image.new("RGBA", ink_m.size, ULTRA + (255,)), mask=ink_m)
            flat.save(os.path.join(args.out, f"{name}.webp"), "WEBP", quality=88, method=6)

        print(f"{name}: {ink_m.width}x{ink_m.height}")


if __name__ == "__main__":
    main()
