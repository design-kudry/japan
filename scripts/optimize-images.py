#!/usr/bin/env python3
"""Resize and recompress site photos under image/ to progressive JPEG."""
from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "image"
MAX_SIDE = 1000
JPEG_Q = 80


def process(path: Path) -> tuple[str, int, int]:
    old = path.stat().st_size
    with Image.open(path) as im:
        im.load()
        if im.mode != "RGB":
            if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                bg = Image.new("RGB", im.size, (243, 243, 241))
                rgba = im.convert("RGBA")
                bg.paste(rgba, mask=rgba.split()[-1])
                im = bg
            else:
                im = im.convert("RGB")
        w, h = im.size
        scale = MAX_SIDE / max(w, h)
        if scale < 1:
            im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
        out = path.with_suffix(".jpg")
        tmp = path.with_suffix(".jpg.tmp")
        im.save(tmp, "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
    new = tmp.stat().st_size
    tmp.replace(out)
    if path != out and path.exists():
        path.unlink()
    return path.name, old, new


def main() -> None:
    total_old = total_new = 0
    for path in sorted(IMG.iterdir()):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        name, old, new = process(path)
        total_old += old
        total_new += new
        print(f"{name}: {old/1024:.0f}KB → {new/1024:.0f}KB")
    print(f"\nTotal: {total_old/1024/1024:.1f}MB → {total_new/1024/1024:.1f}MB")


if __name__ == "__main__":
    main()
