"""
把 world-atlas 的 110m 陆地 TopoJSON 栅格化成一张低分辨率陆地掩码，
再压成 base64 位串写进 index.html 的 LAND 标记区。

为什么这么做：首页要一个"会转的地球"，但页面必须零外部请求、断网可开。
所以不挂贴图，而是内联一张 180x90 的陆地掩码（约 2.7KB base64），
浏览器端按球面均匀撒点、查表决定哪些点是陆地，然后画出来。

用法：python scripts/build-land.py
"""
from __future__ import annotations

import base64
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "geo" / "land-110m.json"
INDEX = ROOT / "index.html"

COLS, ROWS = 180, 90      # 2 度一格
SS = 4                    # 超采样倍数，低分辨率下让海岸线不至于碎掉


def decode_topology(topo: dict) -> list[list[tuple[float, float]]]:
    """把 TopoJSON 的量化 delta 弧还原成经纬度点列，并拼回多边形环。"""
    scale = topo["transform"]["scale"]
    translate = topo["transform"]["translate"]

    arcs: list[list[tuple[float, float]]] = []
    for arc in topo["arcs"]:
        x = y = 0
        points = []
        for dx, dy in arc:
            x += dx
            y += dy
            points.append((translate[0] + scale[0] * x, translate[1] + scale[1] * y))
        arcs.append(points)

    def ring(indexes) -> list[tuple[float, float]]:
        out: list[tuple[float, float]] = []
        for idx in indexes:
            part = arcs[idx] if idx >= 0 else list(reversed(arcs[~idx]))
            out.extend(part if not out else part[1:])
        return out

    rings: list[list[tuple[float, float]]] = []
    collection = topo["objects"]["land"]
    geometries = collection.get("geometries", [collection])

    for geom in geometries:
        if geom["type"] == "MultiPolygon":
            polygons = geom["arcs"]          # [多边形][环][弧索引]
        elif geom["type"] == "Polygon":
            polygons = [geom["arcs"]]
        else:
            continue
        for polygon in polygons:
            for piece in polygon:
                rings.append(ring(piece))
    return rings


def to_pixel(lon: float, lat: float, w: int, h: int) -> tuple[float, float]:
    return ((lon + 180.0) / 360.0 * w, (90.0 - lat) / 180.0 * h)


def main() -> None:
    topo = json.loads(SRC.read_text(encoding="utf8"))
    rings = decode_topology(topo)

    w, h = COLS * SS, ROWS * SS
    img = Image.new("1", (w, h), 0)
    draw = ImageDraw.Draw(img)
    for points in rings:
        pts = [to_pixel(lon, lat, w, h) for lon, lat in points]
        if len(pts) >= 3:
            draw.polygon(pts, fill=1)
    print(f"多边形环 {len(rings)} 个，按 {w}x{h} 绘制完成")

    # 4x4 超采样 -> COLS x ROWS：多数表决，避免"任一子像素即陆地"把海岸线撑胖
    bits = []
    threshold = (SS * SS) // 2
    for row in range(ROWS):
        for col in range(COLS):
            covered = 0
            for y in range(row * SS, (row + 1) * SS):
                for x in range(col * SS, (col + 1) * SS):
                    covered += 1 if img.getpixel((x, y)) else 0
            bits.append(1 if covered > threshold else 0)

    packed = bytearray()
    for i in range(0, len(bits), 8):
        byte = 0
        for j, bit in enumerate(bits[i : i + 8]):
            if bit:
                byte |= 1 << (7 - j)
        packed.append(byte)

    payload = base64.b64encode(bytes(packed)).decode("ascii")
    land_ratio = sum(bits) / len(bits)
    print(f"掩码 {COLS}x{ROWS}，陆地占比 {land_ratio:.1%}，base64 {len(payload)} 字符")

    html = INDEX.read_text(encoding="utf8")
    pattern = re.compile(
        r"(/\* LAND:BEGIN \*/)(.*?)(/\* LAND:END \*/)", re.S
    )
    if not pattern.search(html):
        raise SystemExit("index.html 里找不到 /* LAND:BEGIN */ ... /* LAND:END */ 标记")

    replacement = (
        "/* LAND:BEGIN */\n"
        f"  var LAND_COLS = {COLS}, LAND_ROWS = {ROWS};\n"
        f"  var LAND_B64 =\n    '{payload}';\n"
        "  /* LAND:END */"
    )
    INDEX.write_text(pattern.sub(lambda _: replacement, html), encoding="utf8")
    print("已写入 index.html")


if __name__ == "__main__":
    main()
