# Transparent catalogue cut-outs (scripts/catalog-studio.swift … <id>.png)
# → public/catalog/<id>.webp (1000 px) and <id>-400.webp, alpha kept.
#
#   python3 scripts/catalog-webp.py [--no-mark] <id>.png [...]   (needs Pillow ≥ 10.1)
#
# Maillot's own photos are marked: a small "Maillot" in the corner and the
# copyright in the file's EXIF data, so copies stay recognisable. Use
# --no-mark for photos Maillot doesn't own (e.g. licensed or prototype images).
import os
import sys

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'catalog')
COPYRIGHT = 'Maillot (maillot.app). All rights reserved.'


def mark(img: Image.Image) -> Image.Image:
    img = img.copy()
    size = img.width
    font = ImageFont.load_default(size=max(12, size // 34))
    draw = ImageDraw.Draw(img)
    text = 'Maillot'
    w = draw.textlength(text, font=font)
    pad = size // 40
    draw.text((size - w - pad, size - pad - font.size), text, font=font, fill=(29, 29, 31, 70))
    return img


def exif() -> bytes:
    e = Image.Exif()
    e[0x8298] = COPYRIGHT  # Copyright
    e[0x013B] = 'Maillot'  # Artist
    return e.tobytes()


args = [a for a in sys.argv[1:] if a != '--no-mark']
marked = '--no-mark' not in sys.argv[1:]
for path in args:
    shirt = os.path.splitext(os.path.basename(path))[0]
    img = Image.open(path).convert('RGBA')
    for size, suffix in ((1000, ''), (400, '-400')):
        out = os.path.join(OUT, shirt + suffix + '.webp')
        resized = img.resize((size, size), Image.LANCZOS)
        if marked:
            resized = mark(resized)
            resized.save(out, 'WEBP', quality=84, method=6, exif=exif())
        else:
            resized.save(out, 'WEBP', quality=84, method=6)
        print(out, os.path.getsize(out) // 1024, 'KB', '(marked)' if marked else '')
