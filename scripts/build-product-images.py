#!/usr/bin/env python3
"""Build high-quality responsive product photos exclusively from gallery originals.

Requires Pillow. Originals remain untouched. Explicit source mappings are reviewed
against the supplied menu; missing products intentionally receive no false photo.
Run from any directory: python3 scripts/build-product-images.py
"""
from pathlib import Path
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MAPPING = json.loads((ROOT / "lib/product-images.json").read_text())
OUTPUT = ROOT / "public/products"
OUTPUT.mkdir(parents=True, exist_ok=True)

for product_id, entry in MAPPING.items():
    if entry["status"] != "matched":
        continue
    path = ROOT / "assets/originals" / entry["source"]
    with Image.open(path) as original:
        photo = ImageOps.exif_transpose(original).convert("RGB")
        if entry.get("crop"):
            # Remove unused tabletop space from the original photograph only.
            # Every sushi piece remains visible; menu posters are never used.
            left, top, right, bottom = entry["crop"]
            photo = photo.crop((round(left*photo.width), round(top*photo.height),
                                round(right*photo.width), round(bottom*photo.height)))
        for width in (800, 1600, 2400):
            if photo.width < width:
                raise ValueError(f"Refusing to upscale {path.name} to {width}px")
            resized = photo.resize((width, round(photo.height*width/photo.width)), Image.Resampling.LANCZOS)
            basename = OUTPUT / f"{entry['basename']}-{width}"
            resized.save(str(basename)+".jpg", quality=95, subsampling=0, optimize=True, progressive=True)
            resized.save(str(basename)+".webp", quality=94, method=6)
    print(f"{product_id}: {entry['source']} → 800 / 1600 / 2400 px")
