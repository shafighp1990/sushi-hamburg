#!/usr/bin/env python3
"""Generate additional product angles from original gallery photographs.

Requires Pillow. Existing primary assets are intentionally not rewritten.
Source filenames, output dimensions and optional crop rectangles are tracked in
lib/product-gallery.json. Overhead angles retain their natural portrait framing.
"""
from pathlib import Path
import json
import sys
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MAPPING = json.loads((ROOT / "lib/product-gallery.json").read_text())
OUTPUT = ROOT / "public/products"
OUTPUT.mkdir(parents=True, exist_ok=True)

for product_id, gallery in MAPPING.items():
    sources = [entry["source"] for entry in gallery["images"]]
    if len(set(sources)) != len(sources):
        raise ValueError(f"Repeated source for {product_id}")
    for entry in gallery["images"][1:]:
        if len(sys.argv) > 1 and entry["basename"] not in sys.argv[1:]:
            continue
        if not entry["basename"].startswith(product_id + "-angle"):
            raise ValueError("Refusing to overwrite primary product asset")
        source = ROOT / "assets/originals" / entry["source"]
        with Image.open(source) as original:
            photo = ImageOps.exif_transpose(original).convert("RGB")
            if entry.get("crop"):
                left, top, right, bottom = entry["crop"]
                photo = photo.crop((round(left*photo.width), round(top*photo.height),
                                    round(right*photo.width), round(bottom*photo.height)))
            for width in (800, 1600, 2400):
                if photo.width < width:
                    raise ValueError(f"Refusing to upscale {source.name}")
                resized = photo.resize((width, round(photo.height*width/photo.width)), Image.Resampling.LANCZOS)
                target = OUTPUT / f"{entry['basename']}-{width}"
                resized.save(str(target)+".jpg", quality=95, subsampling=0, optimize=True, progressive=True)
                resized.save(str(target)+".webp", quality=94, method=6)
        print(f"{entry['basename']}: {entry['source']}", flush=True)
