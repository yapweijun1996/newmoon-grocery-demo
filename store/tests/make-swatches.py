"""Three colour swatches in each supported container. No scene capture or training."""
import gzip
import math
import struct
from pathlib import Path

points = []
for band, rgb in enumerate([(156, 76, 57), (218, 169, 82), (58, 104, 85)]):
    for ring in range(4):
        for n in range(85):
            a = 2 * math.pi * n / 85
            radius = .275 + ring * .022
            position = ((band - 1) * .63 + radius * math.cos(a),
                        1.19 + radius * math.sin(a), -.48)
            points.append((position, rgb))

out = Path(__file__).parent / 'mock-swatches'
scale = (.027, .027, .018)
out.with_suffix('.splat').write_bytes(b''.join(
    struct.pack('<6f8B', *xyz, *scale, *rgb, 242, 255, 128, 128, 128)
    for xyz, rgb in points))

# Gaussian PLY stores spherical-harmonic DC coefficients, log scales and a logit.
names = 'x y z f_dc_0 f_dc_1 f_dc_2 opacity scale_0 scale_1 scale_2 rot_0 rot_1 rot_2 rot_3'.split()
header = ('ply\nformat binary_little_endian 1.0\ncomment MOCK synthetic swatches\n'
          f'element vertex {len(points)}\n' +
          ''.join(f'property float {k}\n' for k in names) + 'end_header\n')
sh = lambda v: (v / 255 - .5) / .28209479177387814
out.with_suffix('.ply').write_bytes(header.encode() + b''.join(
    struct.pack('<14f', *xyz, *map(sh, rgb), math.log(242 / 13),
                *map(math.log, scale), 1, 0, 0, 0) for xyz, rgb in points))

# SPZ v2: gzip of a structure-of-arrays payload, signed 24-bit fixed-point XYZ.
header = struct.pack('<III4B', 0x5053474e, 2, len(points), 0, 12, 0, 0)
positions = b''.join(round(v * 4096).to_bytes(3, 'little', signed=True)
                     for xyz, _ in points for v in xyz)
alpha = bytes([242]) * len(points)
colour = bytes(round(sh(v) * .15 * 255 + 127.5) for _, rgb in points for v in rgb)
scales = bytes(round((math.log(v) + 10) * 16) for v in scale) * len(points)
quats = bytes([128, 128, 128]) * len(points)
out.with_suffix('.spz').write_bytes(gzip.compress(
    header + positions + alpha + colour + scales + quats, mtime=0))
