#!/usr/bin/env python3
"""Validate repository-owned image paths and file extensions."""

from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET


ROOTS = (Path("pictures"), Path("assets/img"))
IMAGE_SUFFIXES = {".gif", ".jpg", ".png", ".svg"}
SAFE_COMPONENT = re.compile(r"^[a-z0-9]+(?:[-_][a-z0-9]+)*$")


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
    errors: list[str] = []
    seen: dict[str, Path] = {}
    checked = 0

    for root in ROOTS:
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
            if path.suffix != path.suffix.lower() or not SAFE_COMPONENT.fullmatch(path.stem):
                errors.append(f"unsafe image name: {path}")

            folded = path.as_posix().casefold()
            if folded in seen:
                errors.append(f"case-insensitive duplicate: {seen[folded]} and {path}")
            seen[folded] = path

            actual = detected_type(path)
            if actual != path.suffix:
                errors.append(f"extension mismatch: {path} contains {actual}")

    if errors:
        print("Image validation failed:", file=sys.stderr)
        print("\n".join(f"- {error}" for error in errors), file=sys.stderr)
        return 1

    print(f"Image validation passed for {checked} files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
