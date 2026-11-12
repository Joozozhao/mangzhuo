#!/usr/bin/env python3
"""Build standalone member titles from official Ma Shan Zheng TTF outlines.

Keep the downloaded TTF and temporary dependencies outside the repository:
    UV_CACHE_DIR=/tmp/mangzhuo-fonttools-cache uv run --no-project \
        --with fonttools python scripts/build-member-calligraphy.py \
        --font /tmp/MaShanZheng-Regular.ttf

The original font copyright, full OFL and download URLs accompany the SVGs.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from hashlib import sha256
from math import ceil
from pathlib import Path
from xml.sax.saxutils import escape


FONT_SHA256 = "6d2546bb189c732a8ca29af9e22457b152387d158aa459e4ac2ce1e51788b7fb"
OUTPUT_DIR = (
    Path(__file__).resolve().parents[1]
    / "miniprogram/assets/member-level/calligraphy"
)
TITLES = (
    ("heading.svg", "知味九阶"),
    ("chapter-1.svg", "初识"),
    ("chapter-2.svg", "入境"),
    ("chapter-3.svg", "归真"),
    ("level-1.svg", "问泉客"),
    ("level-2.svg", "寻芳友"),
    ("level-3.svg", "识味生"),
    ("level-4.svg", "酌醇人"),
    ("level-5.svg", "鉴真士"),
    ("level-6.svg", "辨香客"),
    ("level-7.svg", "知味宗"),
    ("level-8.svg", "壶天仙"),
    ("level-9.svg", "太白真"),
)
FILL = "#274d3b"
EM_SIZE = 1000
TRACKING = 25  # 0.025 em added to the font's natural advance widths.
PADDING = 120  # At least 0.12 em of clear space around the actual ink.


def number(value: float) -> str:
    """Keep one decimal for implied quadratic midpoints, without zero padding."""
    result = f"{value:.1f}".rstrip("0").rstrip(".")
    return "0" if result == "-0" else result


def build_assets(font_path: Path) -> tuple[dict[str, bytes], dict[str, str]]:
    """Validate every glyph before producing any files; never synthesize strokes."""
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.ttLib import TTFont

    digest = sha256(font_path.read_bytes()).hexdigest()
    if digest != FONT_SHA256:
        raise ValueError(
            "Font SHA-256 does not match the verified official TTF. "
            "Use the download recorded in calligraphy/SOURCE.md."
        )

    with TTFont(font_path) as font:
        if font["name"].getDebugName(1) != "Ma Shan Zheng":
            raise ValueError("Expected the official Ma Shan Zheng font family.")
        glyph_set = font.getGlyphSet()
        cmap = font.getBestCmap() or {}
        characters = sorted({char for _, title in TITLES for char in title})
        coverage = {char: cmap.get(ord(char)) for char in characters}
        missing = [
            char
            for char, glyph in coverage.items()
            if not glyph or glyph == ".notdef" or font.getGlyphID(glyph) == 0
        ]
        if missing:
            raise ValueError(f"Missing Chinese glyphs: {''.join(missing)}")

        scale = EM_SIZE / font["head"].unitsPerEm

        def draw_title(title: str, pen, dx: float = 0, dy: float = 0) -> None:
            cursor = 0.0
            for char in title:
                glyph_name = coverage[char]
                # Bake the font's Y-up -> SVG's Y-down flip into the path itself.
                transform = (scale, 0, 0, -scale, cursor + dx, dy)
                glyph_set[glyph_name].draw(TransformPen(pen, transform))
                cursor += glyph_set[glyph_name].width * scale + TRACKING

        # Reject empty or degenerate mapped glyphs, as well as missing cmap entries.
        for char, glyph_name in coverage.items():
            pen = BoundsPen(glyph_set)
            glyph_set[glyph_name].draw(pen)
            if pen.bounds is None:
                raise ValueError(f"Empty outline for {char} ({glyph_name}).")
            x_min, y_min, x_max, y_max = pen.bounds
            if x_min >= x_max or y_min >= y_max:
                raise ValueError(f"Degenerate outline for {char} ({glyph_name}).")

        bounds = {}
        widths_by_length = defaultdict(float)
        for _, title in TITLES:
            pen = BoundsPen(glyph_set)
            draw_title(title, pen)
            bounds[title] = pen.bounds
            x_min, _, x_max, _ = pen.bounds
            widths_by_length[len(title)] = max(
                widths_by_length[len(title)], x_max - x_min
            )

        # One shared baseline/height, and one width per character count. Measure
        # real curve extrema rather than advance boxes or control-point bounds.
        y_min = min(box[1] for box in bounds.values())
        y_max = max(box[3] for box in bounds.values())
        dy = ceil(PADDING - y_min)
        height = ceil(y_max + dy + PADDING)
        widths = {
            length: ceil(ink_width) + 2 * PADDING + 2
            for length, ink_width in widths_by_length.items()
        }

        assets = {}
        for filename, title in TITLES:
            width = widths[len(title)]
            x_min, _, x_max, _ = bounds[title]
            # Integer translation preserves the TTF's integral/half-unit points.
            dx = round((width - (x_max - x_min)) / 2 - x_min)
            pen = SVGPathPen(glyph_set, ntos=number)
            draw_title(title, pen, dx, dy)
            path = pen.getCommands()
            if not path:
                raise ValueError(f"Empty SVG path for {title}.")
            svg = (
                '<svg xmlns="http://www.w3.org/2000/svg" '
                f'viewBox="0 0 {width} {height}" width="{width}" height="{height}" '
                'role="img" aria-labelledby="title">\n'
                f'  <title id="title">{escape(title)}</title>\n'
                f'  <path fill="{FILL}" d="{path}"/>\n'
                '</svg>\n'
            )
            assets[filename] = svg.encode("utf-8")
        return assets, coverage


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--font", required=True, type=Path, help="Official MaShanZheng-Regular.ttf in /tmp."
    )
    args = parser.parse_args()
    try:
        assets, coverage = build_assets(args.font)
    except ImportError as error:
        parser.exit(
            1,
            f"{error}\nRun with uv run --no-project --with fonttools; see the script docstring.\n",
        )
    except (OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, data in assets.items():
        (OUTPUT_DIR / filename).write_bytes(data)
        print(f"{filename}: {len(data)} bytes")
    print(f"Total: {sum(map(len, assets.values()))} SVG bytes")
    print(
        f"Glyph coverage: {len(coverage)}/{len(coverage)} unique Chinese characters; "
        f"{sum(len(title) for _, title in TITLES)} text positions"
    )
    for char, glyph in coverage.items():
        print(f"  {char} U+{ord(char):04X} -> {glyph}")


if __name__ == "__main__":
    main()
