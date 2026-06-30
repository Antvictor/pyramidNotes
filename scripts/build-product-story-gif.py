#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a GIF from ordered screenshots using the repository's Node GIF encoder."
    )
    parser.add_argument("--output", required=True, help="Output GIF path")
    parser.add_argument(
        "--frame",
        action="append",
        default=[],
        help="Frame spec in the form /path/to/image.png:delay_ms",
    )
    return parser.parse_args()


def parse_frame_spec(spec: str) -> tuple[Path, int]:
    if ":" not in spec:
        raise ValueError(f"Invalid frame spec: {spec}")
    raw_path, raw_delay = spec.rsplit(":", 1)
    path = Path(raw_path).expanduser()
    if not path.exists():
        raise FileNotFoundError(path)
    delay_ms = int(raw_delay)
    if delay_ms <= 0:
        raise ValueError(f"Invalid delay: {raw_delay}")
    return path, delay_ms


def main() -> int:
    args = parse_args()
    frames = [parse_frame_spec(spec) for spec in args.frame]
    if not frames:
        raise SystemExit("No --frame values provided")

    output = Path(args.output).expanduser()
    manifest = {
        "output": str(output),
        "frames": [
            {"path": str(path), "delayMs": delay_ms}
            for path, delay_ms in frames
        ],
    }

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
        json.dump(manifest, handle)
        manifest_path = handle.name

    try:
        subprocess.run(
            ["node", "scripts/build-product-story-gif.mjs", manifest_path],
            check=True,
        )
    finally:
        try:
            Path(manifest_path).unlink()
        except FileNotFoundError:
            pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
