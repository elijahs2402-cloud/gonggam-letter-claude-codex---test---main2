from pathlib import Path

from PIL import Image, ImageFilter


HERE = Path(__file__).resolve().parent
HOME_SOURCE = Path(r"C:\Users\elija\AppData\Local\Temp\codex-clipboard-dfcb5913-5d98-4e66-9aec-ebd47254d0a5.png")


def erase_label(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    """Remove label pixels while preserving local background variation."""
    px = image.load()
    left, top, right, bottom = box
    for y in range(top, bottom):
        a = px[left - 2, y]
        b = px[right + 2, y]
        width = right - left
        for i, x in enumerate(range(left, right)):
            t = (i + 1) / (width + 1)
            px[x, y] = tuple(round(a[c] * (1 - t) + b[c] * t) for c in range(4))


def prepare_object(
    source: Path,
    output: Path,
    *,
    max_width: int,
    max_height: int,
    alpha_floor: int = 112,
) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")

    # Remove faint generated glow/shadow and retain a short antialias ramp.
    alpha = alpha.point(
        lambda a: 0
        if a < alpha_floor
        else min(255, round((a - alpha_floor) * 255 / (254 - alpha_floor)))
    )
    image.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError(f"No visible object in {source}")
    image = image.crop(bbox)

    ratio = min(max_width / image.width, max_height / image.height)
    size = (max(1, round(image.width * ratio)), max(1, round(image.height * ratio)))
    image = image.resize(size, Image.Resampling.LANCZOS)
    image = image.filter(ImageFilter.UnsharpMask(radius=0.65, percent=115, threshold=2))
    image.save(output)
    return image


def main() -> None:
    home = Image.open(HOME_SOURCE).convert("RGBA")
    if home.size != (590, 1278):
        raise ValueError(f"Unexpected home-screen size: {home.size}")

    pen = prepare_object(
        HERE / "lavender-pen-source.png",
        HERE / "lavender-pen-32px.png",
        max_width=32,
        max_height=32,
    )
    envelope = prepare_object(
        HERE / "closed-envelope-source.png",
        HERE / "closed-envelope-29px.png",
        max_width=29,
        max_height=24,
    )
    # Enforce the requested compact 1.3:1 envelope silhouette after alpha crop.
    envelope = envelope.resize((29, 22), Image.Resampling.LANCZOS)
    envelope.save(HERE / "closed-envelope-29px.png")

    erase_label(home, (57, 448, 88, 470))
    erase_label(home, (317, 448, 348, 470))

    # Keep the optical center of the original numeric labels and their left edge.
    home.alpha_composite(pen, (59, 459 - pen.height // 2))
    home.alpha_composite(envelope, (319, 459 - envelope.height // 2))
    home.convert("RGB").save(HERE / "home-with-pen-envelope.png", quality=96)


if __name__ == "__main__":
    main()
