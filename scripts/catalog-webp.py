# Transparent catalogue cut-outs (scripts/catalog-studio.swift … <id>.png)
# → public/catalog/<id>.webp (1000 px) and <id>-400.webp, alpha kept.
#
#   python3 scripts/catalog-webp.py <id>.png [...]   (needs Pillow)
import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'catalog')
for path in sys.argv[1:]:
    shirt = os.path.splitext(os.path.basename(path))[0]
    img = Image.open(path).convert('RGBA')
    for size, suffix in ((1000, ''), (400, '-400')):
        out = os.path.join(OUT, shirt + suffix + '.webp')
        img.resize((size, size), Image.LANCZOS).save(out, 'WEBP', quality=84, method=6)
        print(out, os.path.getsize(out) // 1024, 'KB')
