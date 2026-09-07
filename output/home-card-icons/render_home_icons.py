from pathlib import Path

from PIL import Image, ImageDraw


SOURCE = Path(r"C:\Users\elija\AppData\Local\Temp\codex-clipboard-dfcb5913-5d98-4e66-9aec-ebd47254d0a5.png")
OUTPUT = Path(__file__).with_name("home-with-card-icons.png")
SCALE = 4
STROKE = (61, 58, 53, 255)


def erase_label(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    """Replace a label using row-wise interpolation from untouched edge pixels."""
    pixels = image.load()
    left, top, right, bottom = box
    for y in range(top, bottom):
        a = pixels[left - 2, y]
        b = pixels[right + 2, y]
        width = right - left
        for i, x in enumerate(range(left, right)):
            t = (i + 1) / (width + 1)
            pixels[x, y] = tuple(round(a[c] * (1 - t) + b[c] * t) for c in range(4))


def line(draw: ImageDraw.ImageDraw, points, width=1.4):
    pts = [(round(x * SCALE), round(y * SCALE)) for x, y in points]
    draw.line(pts, fill=STROKE, width=round(width * SCALE), joint="curve")
    radius = round(width * SCALE / 2)
    for x, y in (pts[0], pts[-1]):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=STROKE)


def writing_icon() -> Image.Image:
    icon = Image.new("RGBA", (22 * SCALE, 22 * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    line(draw, [(2.25, 20.25), (2.25, 1.5), (12.25, 1.5), (15.25, 4.5), (15.25, 10.0)])
    line(draw, [(12.25, 1.5), (12.25, 4.5), (15.25, 4.5)])
    line(draw, [(9.5, 8.0), (19.1, 17.6)])
    line(draw, [(8.55, 7.05), (9.5, 8.0), (8.5, 10.25), (7.15, 8.9), (8.55, 7.05)])
    line(draw, [(19.1, 17.6), (20.5, 18.0), (20.1, 16.6)])
    return icon.resize((22, 22), Image.Resampling.LANCZOS)


def envelope_icon() -> Image.Image:
    icon = Image.new("RGBA", (22 * SCALE, 22 * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    line(draw, [(5.5, 8.0), (5.5, 3.25), (16.5, 3.25), (16.5, 8.0)])
    line(draw, [(1.25, 8.0), (11.0, 1.75), (20.75, 8.0), (20.75, 20.25), (1.25, 20.25), (1.25, 8.0)])
    line(draw, [(1.6, 8.35), (11.0, 15.65), (20.4, 8.35)])
    line(draw, [(1.6, 19.9), (8.9, 13.5)])
    line(draw, [(20.4, 19.9), (13.1, 13.5)])
    return icon.resize((22, 22), Image.Resampling.LANCZOS)


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    if image.size != (590, 1278):
        raise ValueError(f"Unexpected source size: {image.size}")

    erase_label(image, (57, 448, 88, 470))
    erase_label(image, (317, 448, 348, 470))

    image.alpha_composite(writing_icon(), (59, 448))
    image.alpha_composite(envelope_icon(), (319, 448))
    image.convert("RGB").save(OUTPUT, quality=96)


if __name__ == "__main__":
    main()
