#!/usr/bin/env python3
"""Chroma-key Imagine JPEGs to trimmed RGBA PNGs."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = Path(os.environ.get("IMAGINE_IMG", ROOT / ".imagine-src"))
OUT = ROOT / "public" / "media"
PAD = 10


def is_green(r: int, g: int, b: int) -> bool:
    return g > 60 and g > r + 18 and g > b + 18


def key_image(src: Path) -> Image.Image:
    im = Image.open(src).convert("RGBA")
    pix = im.load()
    w, h = im.size
    assert pix is not None
    for y in range(h):
        for x in range(w):
            r, g, b, _a = pix[x, y]
            if is_green(r, g, b):
                pix[x, y] = (0, 0, 0, 0)
            elif g > r + 8 and g > b + 8:
                drop = min(255, (g - max(r, b)) * 6)
                pix[x, y] = (r, min(g, max(r, b) + 6), b, max(0, 255 - drop))
    return im


def trim(im: Image.Image, pad: int = PAD) -> Image.Image:
    alpha = im.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def save_keyed(name: str, src_name: str) -> None:
    src = IMG / src_name
    im = trim(key_image(src))
    dest = OUT / name
    im.save(dest)
    print(f"{name:20s} {im.size[0]:4d}x{im.size[1]:<4d}  from {src_name}")


def save_ground() -> None:
    im = Image.open(IMG / "3.jpg").convert("RGB")
    w, h = im.size
    # Grass tips meeting dirt — a short side-view ground strip.
    crop = im.crop((0, int(h * 0.22), w, int(h * 0.38)))
    dest = OUT / "ground.png"
    crop.save(dest)
    print(f"{'ground.png':20s} {crop.size[0]:4d}x{crop.size[1]:<4d}  crop")


def save_hills() -> None:
    im = Image.open(IMG / "2.jpg").convert("RGB")
    w, h = im.size
    crop = im.crop((0, int(h * 0.42), w, h))
    dest = OUT / "hills.png"
    crop.save(dest)
    print(f"{'hills.png':20s} {crop.size[0]:4d}x{crop.size[1]:<4d}  crop")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("player.png", "7.jpg"),
        ("player-fly.png", "13.jpg"),
        ("crab.png", "8.jpg"),
        ("bluejay.png", "4.jpg"),
        ("coin.png", "1.jpg"),
        ("fuel.png", "5.jpg"),
        ("cloud-small.png", "6.jpg"),
        ("cloud-large.png", "14.jpg"),
        ("balloon-cat.png", "12.jpg"),
        ("roboskull.png", "15.jpg"),
        ("meteor.png", "16.jpg"),
        ("ufo.png", "17.jpg"),
        ("spike-mine.png", "18.jpg"),
        ("title.png", "11.jpg"),
        ("btn-play.png", "10.jpg"),
        ("btn-again.png", "9.jpg"),
    ]
    for name, src in jobs:
        save_keyed(name, src)
    save_ground()
    save_hills()


if __name__ == "__main__":
    main()
