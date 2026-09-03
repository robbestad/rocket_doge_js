#!/usr/bin/env python3
"""Chroma-key selected video frames and pack uniform horizontal sheets."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
FRAMES = ROOT / ".tmp-frames"
OUT = ROOT / "public" / "media"
PAD = 8

SHEETS = {
    "player.png": ("player-walk", list(range(13, 21))),
    "player-fly.png": ("player-fly", list(range(1, 9))),
    "bluejay.png": ("bluejay", list(range(13, 21))),
    "crab.png": ("crab", list(range(1, 9))),
}


def is_green(r: int, g: int, b: int) -> bool:
    return g > 55 and g > r + 16 and g > b + 16


def key(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    pix = im.load()
    assert pix is not None
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _a = pix[x, y]
            if is_green(r, g, b):
                pix[x, y] = (0, 0, 0, 0)
            elif g > r + 8 and g > b + 8:
                drop = min(255, (g - max(r, b)) * 6)
                pix[x, y] = (r, min(g, max(r, b) + 6), b, max(0, 255 - drop))
    return im


def pack(name: str, folder: str, indices: list[int]) -> None:
    keyed: list[Image.Image] = []
    for i in indices:
        src = FRAMES / folder / f"f{i:03d}.png"
        keyed.append(key(Image.open(src)))
    union = [keyed[0].width, keyed[0].height, 0, 0]
    for im in keyed:
        bb = im.split()[-1].getbbox()
        if not bb:
            continue
        union[0] = min(union[0], bb[0])
        union[1] = min(union[1], bb[1])
        union[2] = max(union[2], bb[2])
        union[3] = max(union[3], bb[3])
    l = max(0, union[0] - PAD)
    t = max(0, union[1] - PAD)
    r = min(keyed[0].width, union[2] + PAD)
    b = min(keyed[0].height, union[3] + PAD)
    cell_w, cell_h = r - l, b - t
    sheet = Image.new("RGBA", (cell_w * len(keyed), cell_h), (0, 0, 0, 0))
    for i, im in enumerate(keyed):
        sheet.paste(im.crop((l, t, r, b)), (i * cell_w, 0))
    dest = OUT / name
    sheet.save(dest)
    print(f"{name:18s} {len(keyed)} frames  {cell_w}x{cell_h}  → {sheet.size[0]}x{sheet.size[1]}")


def h_seamless(im: Image.Image, fade: int = 72) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    half = w // 2
    rolled = Image.new("RGB", (w, h))
    rolled.paste(im.crop((half, 0, w, h)), (0, 0))
    rolled.paste(im.crop((0, 0, half, h)), (half, 0))
    band = max(16, min(fade, half - 2))
    seam = rolled.crop((half - band, 0, half + band, h)).filter(
        ImageFilter.GaussianBlur(2.2)
    )
    rolled.paste(seam, (half - band, 0))
    out = Image.new("RGB", (w, h))
    out.paste(rolled.crop((half, 0, w, h)), (0, 0))
    out.paste(rolled.crop((0, 0, half, h)), (half, 0))
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (folder, idx) in SHEETS.items():
        pack(name, folder, idx)
    ground = h_seamless(Image.open(OUT / "ground.png"), 96)
    ground.save(OUT / "ground.png")
    print(f"{'ground.png':18s} seamless {ground.size[0]}x{ground.size[1]}")
    hills = h_seamless(Image.open(OUT / "hills.png"), 120)
    hills.save(OUT / "hills.png")
    print(f"{'hills.png':18s} seamless {hills.size[0]}x{hills.size[1]}")


if __name__ == "__main__":
    main()
