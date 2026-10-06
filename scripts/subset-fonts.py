# Rebuilds src/assets/fonts/ from the full variable fonts: Latin + Latin-1
# and typographic punctuation (enough for EN/DE/FR), only the axis ranges the
# design uses. Needs: pip install fonttools brotli; npm i -D the two
# @fontsource-variable packages temporarily for the source files.
import io, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

U = list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + [0x152, 0x153, 0x178, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x2039, 0x203A, 0x20AC, 0x2122, 0x2190, 0x2192, 0x2212, 0x2032]

def build(src, dst, limits):
    font = TTFont(src)
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=U)
    sub.subset(font)
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    font = instancer.instantiateVariableFont(TTFont(buf), limits)
    font.flavor = 'woff2'
    font.save(dst)
    print(dst, os.path.getsize(src), '->', os.path.getsize(dst))

build('node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2', 'src/assets/fonts/archivo-var.woff2', {'wght': (400, 800), 'wdth': (62, 100)})
build('node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', 'src/assets/fonts/jetbrains-mono-var.woff2', {'wght': (400, 700)})
