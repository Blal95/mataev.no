"""Turn screenshots of shipped sites into one-ink prints.

A screenshot is set in grey, then dithered to ink or no ink (Floyd–Steinberg),
the way a one-colour press would print a photo. It becomes the same pair of
alpha masks as a Borzik drawing, so <InkArt> paints it with the tone's ink on
the tone's paper: `<slug>-ink.webp` (the dots, and a thin edge so a light
page still reads as a page on the paper) and `<slug>-fill.webp` (the whole
sheet, since a screenshot has no outline to cut the paper to).

    python3 scripts/ink-prints.py --out public/art/prints mash-partners=shots/mash.png ...

Take the screenshots at 1440×900, the front page as a visitor first sees it.
`<slug>.webp` is also written: ultramarine on paper, for places that take a
plain image (the cabin's Get Info).
"""

import argparse
import os

import numpy as np
from PIL import Image

PAPER = (0xF4, 0xF5, 0xF7)
ULTRA = (0x2B, 0x3A, 0xE0)
# Twice the widest column a print sits in, for sharp dots on a 2x screen.
WIDTH = 640
# Grey lighter than this is paper, so page backgrounds print clean; darker
# than BLACK is solid ink. Between them the dots get denser.
WHITE = 232
BLACK = 24
# The printed edge, in mask pixels: about 1 CSS px where the print sits.
EDGE = 2


def mask(alpha: np.ndarray) -> Image.Image:
    out = Image.new("RGBA", (alpha.shape[1], alpha.shape[0]), (255, 255, 255, 0))
    out.putalpha(Image.fromarray(alpha))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("shots", nargs="+", help="slug=path.png")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    for spec in args.shots:
        slug, path = spec.split("=", 1)
        grey = Image.open(path).convert("L")
        grey = grey.resize((WIDTH, round(grey.height * WIDTH / grey.width)), Image.LANCZOS)
        level = np.clip((np.asarray(grey).astype(np.float32) - BLACK) / (WHITE - BLACK), 0, 1)
        dots = Image.fromarray((level * 255).astype(np.uint8)).convert("1")
        ink = np.where(np.asarray(dots), 0, 255).astype(np.uint8)
        ink[:EDGE, :] = ink[-EDGE:, :] = ink[:, :EDGE] = ink[:, -EDGE:] = 255
        sheet = np.full(ink.shape, 255, dtype=np.uint8)

        # Lossless: lossy compression would blur the dots into a grey tint.
        mask(ink).save(os.path.join(args.out, f"{slug}-ink.webp"), "WEBP", lossless=True, method=6)
        mask(sheet).save(os.path.join(args.out, f"{slug}-fill.webp"), "WEBP", lossless=True, method=6)

        flat = Image.new("RGB", dots.size, PAPER)
        flat.paste(Image.new("RGB", dots.size, ULTRA), mask=Image.fromarray(ink))
        flat.save(os.path.join(args.out, f"{slug}.webp"), "WEBP", lossless=True, method=6)

        print(f"{slug}: {dots.width}x{dots.height}")


if __name__ == "__main__":
    main()
