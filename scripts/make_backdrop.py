#!/usr/bin/env python3
"""Build a looping hills strip and a periodic ground tile."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = Path(os.environ.get("IMAGINE_IMG", ROOT / ".imagine-src"))
OUT = ROOT / "public" / "media"


def is_sky(r: int, g: int, b: int) -> bool:
    if g > r + 20 and g > b + 8:
        return False
    return (r + g + b) / 3 > 186


def punch_sky(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    pix = im.load()
    assert pix is not None
    w, h = im.size
    fade = 10
    for x in range(w):
        y = 0
        while y < h:
            r, g, b, _a = pix[x, y]
            if not is_sky(r, g, b):
                break
            pix[x, y] = (0, 0, 0, 0)
            y += 1
        for k in range(fade):
            yy = y + k
            if yy >= h:
                break
            r, g, b, a = pix[x, yy]
            pix[x, yy] = (r, g, b, int(a * ((k + 1) / fade)))
    return im


def mirror_x(im: Image.Image) -> Image.Image:
    flip = im.transpose(Image.FLIP_LEFT_RIGHT)
    out = Image.new(im.mode, (im.width * 2, im.height), (0, 0, 0, 0))
    out.paste(im, (0, 0))
    out.paste(flip, (im.width, 0))
    return out


def make_hills() -> None:
    src = Image.open(IMG / "2.jpg").convert("RGB")
    w, h = src.size
    crop = src.crop((0, int(h * 0.40), w, h))
    crop = punch_sky(crop)
    strip = mirror_x(crop)
    dest = OUT / "hills.png"
    strip.save(dest)
    print(f"hills.png  {strip.size[0]}x{strip.size[1]}  mirrored loop")


def make_ground() -> None:
    src = Image.open(IMG / "3.jpg").convert("RGB")
    w, h = src.size
    crop = src.crop((0, int(h * 0.255), w, int(h * 0.355)))
    strip = mirror_x(crop.convert("RGBA")).convert("RGB")
    dest = OUT / "ground.png"
    strip.save(dest)
    print(f"ground.png {strip.size[0]}x{strip.size[1]}  mirrored loop")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    make_hills()
    make_ground()
