#!/usr/bin/env python3
"""Validate repository-owned image paths and file extensions.

The full check enforces the canonical naming convention in both the raw archive
and deployed assets. ``--deployment`` checks only files shipped by Jekyll and
treats URL-safe legacy separator styles as warnings, so an old cosmetic name
cannot take the entire public website offline.
"""

import argparse
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET


ROOTS = (Path("pictures"), Path("assets/img"))
IMAGE_SUFFIXES = {".gif", ".jpg", ".png", ".svg"}
SAFE_COMPONENT = re.compile(r"^[a-z0-9]+(?:[-_][a-z0-9]+)*$")
URL_SAFE_COMPONENT = re.compile(r"^[a-z0-9][a-z0-9_-]*$")


def detected_type(path: Path) -> str:
    header = path.read_bytes()[:16]
    if header.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if header.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if path.suffix == ".svg":
        try:
            ET.parse(path)
        except ET.ParseError:
            return ".invalid-svg"
        return ".svg"
    return ".unknown"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--deployment",
        action="store_true",
        help="check deployed assets; report non-canonical URL-safe names as warnings",
    )
    options = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []
    seen: dict[str, Path] = {}
    checked = 0

    roots = (Path("assets/img"),) if options.deployment else ROOTS
    for root in roots:
        if not root.is_dir():
            errors.append(f"missing image root: {root}")
            continue

        for path in sorted(root.rglob("*")):
            relative = path.relative_to(root)
            components = relative.parts[:-1] if path.is_file() else relative.parts
            for component in components:
                if not SAFE_COMPONENT.fullmatch(component):
                    errors.append(f"unsafe directory name: {path}")
                    break

            if not path.is_file() or path.name == "README.md":
                continue
            if path.suffix.lower() not in IMAGE_SUFFIXES:
                continue

            checked += 1
            canonical = (
                path.suffix == path.suffix.lower()
                and SAFE_COMPONENT.fullmatch(path.stem)
            )
            if not canonical:
                url_safe = (
                    path.suffix == path.suffix.lower()
                    and URL_SAFE_COMPONENT.fullmatch(path.stem)
                )
                target = warnings if options.deployment and url_safe else errors
                target.append(f"non-canonical image name: {path}")

            folded = path.as_posix().casefold()
            if folded in seen:
                errors.append(f"case-insensitive duplicate: {seen[folded]} and {path}")
            seen[folded] = path

            actual = detected_type(path)
            if actual != path.suffix:
                errors.append(f"extension mismatch: {path} contains {actual}")

    if warnings:
        print("Image validation warnings:", file=sys.stderr)
        print("\n".join(f"- {warning}" for warning in warnings), file=sys.stderr)

    if errors:
        print("Image validation failed:", file=sys.stderr)
        print("\n".join(f"- {error}" for error in errors), file=sys.stderr)
        return 1

    print(f"Image validation passed for {checked} files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
