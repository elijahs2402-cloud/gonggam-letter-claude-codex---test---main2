from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


HERE = Path(__file__).resolve().parent
HOME_SOURCE = Path(r"C:\Users\elija\AppData\Local\Temp\codex-clipboard-dfcb5913-5d98-4e66-9aec-ebd47254d0a5.png")


def erase_label(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    """Remove a number while retaining the local paper-color variation."""
    px = image.load()
    left, top, right, bottom = box
    for y in range(top, bottom):
        a = px[left - 2, y]
        b = px[right + 2, y]
        width = right - left
        for i, x in enumerate(range(left, right)):
            t = (i + 1) / (width + 1)
            px[x, y] = tuple(round(a[c] * (1 - t) + b[c] * t) for c in range(4))


def prepare_object(source: Path, width: int, output: Path) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")

    # Eliminate the generator's faint low-alpha halo/drop-shadow while keeping
    # the opaque pen-work and flat fills. Restore a short antialias ramp.
    alpha = alpha.point(lambda a: 0 if a < 112 else min(255, round((a - 112) * 255 / 142)))
    image.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError(f"No visible object in {source}")
    image = image.crop(bbox)

    height = max(1, round(image.height * width / image.width))
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    image = image.filter(ImageFilter.UnsharpMask(radius=0.65, percent=115, threshold=2))
    image.save(output)
    return image


def make_letter_paper_pen(output: Path) -> Image.Image:
    """Draw a compact filled miniature that remains readable at 32 px."""
    scale = 4
    image = Image.new("RGBA", (32 * scale, 20 * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ink = (61, 55, 48, 255)
    cream = (250, 244, 226, 255)
    lavender = (112, 74, 134, 255)
    brass = (174, 142, 83, 255)

    paper = [(3 * scale, 7 * scale), (25 * scale, 2 * scale), (30 * scale, 13 * scale), (8 * scale, 18 * scale)]
    draw.polygon(paper, fill=cream)
    draw.line(paper + [paper[0]], fill=ink, width=scale, joint="curve")

    # Minimal directional paper hatching, kept away from the writing area.
    for offset in (0, 3):
        draw.line(
            [(6 * scale, (13 + offset / 3) * scale), (9 * scale, (15 + offset / 3) * scale)],
            fill=(116, 106, 92, 180),
            width=1,
        )

    # A slim, tidy lavender writing pen placed diagonally across the sheet.
    draw.line([(9 * scale, 15 * scale), (26 * scale, 5 * scale)], fill=ink, width=4 * scale)
    draw.line([(9 * scale, 15 * scale), (26 * scale, 5 * scale)], fill=lavender, width=2 * scale)
    draw.polygon(
        [(7.2 * scale, 16.1 * scale), (9.3 * scale, 14.5 * scale), (10.2 * scale, 16.0 * scale)],
        fill=brass,
        outline=ink,
    )
    draw.line([(23.5 * scale, 6.4 * scale), (25.2 * scale, 8.0 * scale)], fill=ink, width=scale)

    image = image.resize((32, 20), Image.Resampling.LANCZOS)
    image.save(output)
    return image


def main() -> None:
    home = Image.open(HOME_SOURCE).convert("RGBA")
    if home.size != (590, 1278):
        raise ValueError(f"Unexpected home-screen size: {home.size}")

    left = make_letter_paper_pen(HERE / "letter-paper-pen-32px.png")
    right = prepare_object(
        HERE / "closed-envelope-source.png", 31, HERE / "closed-envelope-31px.png"
    )

    erase_label(home, (57, 448, 88, 470))
    erase_label(home, (317, 448, 348, 470))

    # Preserve each label's original left alignment and optical center.
    home.alpha_composite(left, (59, 459 - left.height // 2))
    home.alpha_composite(right, (319, 459 - right.height // 2))
    home.convert("RGB").save(HERE / "home-with-mini-illustrations.png", quality=96)


if __name__ == "__main__":
    main()
