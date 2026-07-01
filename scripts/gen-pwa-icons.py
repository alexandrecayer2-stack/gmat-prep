#!/usr/bin/env python3
"""Generate PWA icons (no external deps) — indigo #4f46e5 tile with three
ascending white bars, a "progress" motif that reads at small sizes. Regenerate
with: python3 scripts/gen-pwa-icons.py"""
import struct
import zlib
from pathlib import Path

BG = (79, 70, 229)      # --primary #4f46e5
FG = (255, 255, 255)
PUBLIC = Path(__file__).resolve().parent.parent / "public"


def rounded(size: int, radius: int, x: int, y: int) -> bool:
    """True if (x,y) is inside a rounded-rect corner cutout (transparent)."""
    for cx, cy in ((radius, radius), (size - radius, radius),
                   (radius, size - radius), (size - radius, size - radius)):
        inx = (x < radius and cx == radius) or (x >= size - radius and cx == size - radius)
        iny = (y < radius and cy == radius) or (y >= size - radius and cy == size - radius)
        if inx and iny and (x - cx) ** 2 + (y - cy) ** 2 > radius ** 2:
            return True
    return False


def make(size: int, maskable: bool) -> bytes:
    # Maskable icons must be full-bleed (OS applies its own mask); "any" icons
    # get gentle rounded corners so they look right when the OS does not round.
    radius = 0 if maskable else int(size * 0.18)
    # Safe-zone motif: keep bars within the centre 60% so maskable crop is clean.
    inner = size * 0.60
    left = (size - inner) / 2
    baseline = size * 0.72
    bar_w = inner / 3 * 0.62
    gap = (inner - bar_w * 3) / 2
    heights = (0.42, 0.66, 0.92)  # ascending

    rows = bytearray()
    for y in range(size):
        rows.append(0)  # PNG filter type 0 per scanline
        for x in range(size):
            transparent = (not maskable) and rounded(size, radius, x, y)
            color, alpha = BG, 255
            if not transparent:
                for i, h in enumerate(heights):
                    bx = left + i * (bar_w + gap)
                    top = baseline - inner * h
                    if bx <= x < bx + bar_w and top <= y < baseline:
                        color = FG
                        break
            else:
                alpha = 0
            rows += bytes((color[0], color[1], color[2], alpha))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    idat = zlib.compress(bytes(rows), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


targets = [
    ("icon-192.png", 192, True),
    ("icon-512.png", 512, True),
    ("apple-touch-icon.png", 180, False),
]
for name, size, maskable in targets:
    (PUBLIC / name).write_bytes(make(size, maskable))
    print(f"wrote public/{name} ({size}x{size})")
