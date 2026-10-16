"""
量首屏的关键尺寸，用于和参考站做视觉对齐。
输出每条水平「墨迹带」（起止 y、最左/最右 x、峰值像素数），以及若干派生指标。
用法：python scripts/measure-fold.py <图片> [--label 名字]
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

LABEL = ""
paths: list[str] = []
args = sys.argv[1:]
i = 0
while i < len(args):
    if args[i] == "--label":
        LABEL = args[i + 1]
        i += 2
        continue
    paths.append(args[i])
    i += 1


def bands_of(path: str) -> None:
    img = Image.open(path).convert("L")
    w, h = img.size
    px = img.load()

    # 每行的「墨迹」强度：与背景（取右上角）差异大的像素数
    bg = px[w - 3, 3]
    rows = []
    for y in range(h):
        n = 0
        left = right = -1
        for x in range(0, w, 2):
            if abs(px[x, y] - bg) > 34:
                n += 1
                if left < 0:
                    left = x
                right = x
        rows.append((n, left, right))

    print(f"\n=== {LABEL or Path(path).name}  {w}x{h}  背景灰度 {bg} ===")
    cur = None
    out = []
    for y, (n, left, right) in enumerate(rows):
        if n >= 2:
            if cur is None:
                cur = {"y0": y, "y1": y, "minL": left, "maxR": right, "peak": n}
            else:
                cur["y1"] = y
                cur["minL"] = min(cur["minL"], left)
                cur["maxR"] = max(cur["maxR"], right)
                cur["peak"] = max(cur["peak"], n)
        else:
            if cur and cur["y1"] - cur["y0"] >= 2:
                out.append(cur)
            cur = None
    if cur:
        out.append(cur)

    for b in out[:14]:
        print(
            f"  y {b['y0']:>5}..{b['y1']:<5} 高 {b['y1'] - b['y0'] + 1:>4}px"
            f"  x {b['minL']:>5}..{b['maxR']:<5} 峰值 {b['peak']}"
        )
    if len(out) > 14:
        print(f"  …… 另有 {len(out) - 14} 条带")


for p in paths:
    bands_of(p)
