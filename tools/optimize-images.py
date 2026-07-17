#!/usr/bin/env python3
"""Create optimized image copies without changing the source files."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ModuleNotFoundError:  # pragma: no cover - depends on local environment
    print(
        "Pillow is required for image optimization. Install it in your Python env with: "
        "python -m pip install Pillow",
        file=sys.stderr,
    )
    raise SystemExit(2)


SUPPORTED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def iter_images(source: Path) -> list[Path]:
    if source.is_file():
        return [source] if source.suffix.lower() in SUPPORTED_SUFFIXES else []
    return sorted(
        path
        for path in source.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES
    )


def target_path(source_root: Path, image_path: Path, output_root: Path) -> Path:
    if source_root.is_file():
        return output_root / image_path.name
    return output_root / image_path.relative_to(source_root)


def optimize_image(image_path: Path, source_root: Path, output_root: Path, quality: int, max_width: int | None) -> int:
    out_path = target_path(source_root, image_path, output_root)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(image_path) as image:
        image = ImageOps.exif_transpose(image)

        if max_width and image.width > max_width:
            ratio = max_width / image.width
            next_size = (max_width, max(1, round(image.height * ratio)))
            image = image.resize(next_size, Image.Resampling.LANCZOS)

        suffix = image_path.suffix.lower()
        before = image_path.stat().st_size

        if suffix in {".jpg", ".jpeg"}:
            image = image.convert("RGB")
            image.save(out_path, "JPEG", quality=quality, optimize=True, progressive=True)
        elif suffix == ".png":
            image.save(out_path, "PNG", optimize=True)
        elif suffix == ".webp":
            image.save(out_path, "WEBP", quality=quality, method=6)
        else:
            return 0

    after = out_path.stat().st_size
    saved = before - after
    print(f"{image_path} -> {out_path} ({before} bytes to {after} bytes, saved {saved} bytes)")
    return saved


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Optimize image copies for local review.")
    parser.add_argument("source", type=Path, help="Source file or directory.")
    parser.add_argument("--out", type=Path, default=Path(".tmp/optimized-media"), help="Output directory.")
    parser.add_argument("--quality", type=int, default=82, help="JPEG/WebP quality from 1 to 95.")
    parser.add_argument("--max-width", type=int, default=None, help="Optional max width in pixels.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = args.source.resolve()
    output = args.out.resolve()

    if not source.exists():
        print(f"Source not found: {source}", file=sys.stderr)
        return 1

    quality = max(1, min(95, args.quality))
    images = iter_images(source)
    if not images:
        print("No supported images found.")
        return 0

    total_saved = sum(
        optimize_image(image_path, source, output, quality, args.max_width)
        for image_path in images
    )
    print(f"Done. Optimized {len(images)} image(s). Total saved: {total_saved} bytes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
