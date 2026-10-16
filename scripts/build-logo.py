"""
把老板给的 logo 处理成页面能用的资产：
  1. 自动找出「图形标」与「文字」两条墨迹带，只取图形标（需求：不要文字）
  2. 白底反预乘成透明（像素 = 颜色*alpha + 白*(1-alpha)，解出 alpha 与纯色）
  3. 输出 mark.png（正文用）与 mark-64.png（favicon），并把 base64 内联进 index.html

用法：python scripts/build-logo.py
"""
from __future__ import annotations

import base64
import io
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "logo" / "source.jpg"
OUT_DIR = ROOT / "assets" / "logo"
INDEX = ROOT / "index.html"

MARK_WIDTH = 384          # 图形标导出宽度（页面最大显示约 186px，够 2x）
FAVICON = 64
INK_THRESHOLD = 235       # 低于这个亮度算墨迹
PAD = 6


def ink_bands(px: np.ndarray, step: int = 2) -> list[tuple[int, int]]:
    dark = px.min(axis=2) < INK_THRESHOLD
    rows = dark[:, ::step].sum(axis=1)
    bands: list[tuple[int, int]] = []
    start = None
    for y, count in enumerate(rows):
        if count > 2:
            start = y if start is None else start
        else:
            if start is not None and y - start > 4:
                bands.append((start, y))
            start = None
    if start is not None:
        bands.append((start, len(rows)))
    return bands


def unpremultiply_white(rgb: np.ndarray) -> np.ndarray:
    """白底 -> 透明：解出 alpha 与不受白底污染的纯色。"""
    arr = rgb.astype(np.float32) / 255.0
    alpha = 1.0 - arr.min(axis=2)
    safe = np.maximum(alpha, 1e-6)
    colour = np.clip((arr - (1.0 - alpha)[..., None]) / safe[..., None], 0.0, 1.0)
    out = np.dstack([colour * 255.0, alpha * 255.0]).astype(np.uint8)
    return out


def png_bytes(img: Image.Image, quantize: bool) -> bytes:
    buf = io.BytesIO()
    if quantize:
        img.convert("RGBA").quantize(colors=128, method=Image.FASTOCTREE).save(
            buf, format="PNG", optimize=True
        )
    else:
        img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def main() -> None:
    src = Image.open(SOURCE).convert("RGB")
    full = np.asarray(src)
    bands = ink_bands(full)
    if not bands:
        raise SystemExit("没在源图里找到任何墨迹")
    top = bands[0]
    print(f"墨迹带 {bands}；取第一条作为图形标：y {top[0]}..{top[1]}")

    y0 = max(0, top[0] - PAD)
    y1 = min(src.height, top[1] + PAD)
    dark = full.min(axis=2) < INK_THRESHOLD
    cols = np.where(dark[y0:y1].any(axis=0))[0]
    x0 = max(0, int(cols.min()) - PAD)
    x1 = min(src.width, int(cols.max()) + 1 + PAD)
    print(f"裁剪 x {x0}..{x1}  y {y0}..{y1}  -> {x1 - x0}x{y1 - y0}")

    crop = src.crop((x0, y0, x1, y1))
    rgba = Image.fromarray(unpremultiply_white(np.asarray(crop)), mode="RGBA")

    scale = MARK_WIDTH / rgba.width
    mark = rgba.resize((MARK_WIDTH, max(1, round(rgba.height * scale))), Image.LANCZOS)
    mark.save(OUT_DIR / "mark.png")

    # favicon：把图形标放进正方形画布居中
    side = max(mark.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2), mark)
    icon = square.resize((FAVICON, FAVICON), Image.LANCZOS)
    icon.save(OUT_DIR / "mark-64.png")

    raw = png_bytes(mark, quantize=False)
    quant = png_bytes(mark, quantize=True)
    print(f"mark.png {mark.size} 无损 {len(raw) // 1024}KB / 量化 {len(quant) // 1024}KB")
    chosen = quant if len(quant) < len(raw) * 0.75 else raw
    print(f"选用：{'量化' if chosen is quant else '无损'}，base64 约 {len(base64.b64encode(chosen)) // 1024}KB")

    mark_uri = "data:image/png;base64," + base64.b64encode(chosen).decode("ascii")
    icon_uri = "data:image/png;base64," + base64.b64encode(png_bytes(icon, True)).decode("ascii")

    html = INDEX.read_text(encoding="utf8")

    # 标记里的占位符 -> 实际 data URI（保持单文件、零外部请求）
    if "__LOGO_MARK__" in html:
        html = html.replace("__LOGO_MARK__", mark_uri)
        print("已替换标记里的 __LOGO_MARK__ 占位符")
    elif mark_uri not in html:
        raise SystemExit("index.html 里既没有 __LOGO_MARK__ 占位符，也没有现成的图形标")

    icon_pattern = re.compile(r'(<link rel="icon" href=")[^"]*(")', re.I)
    if icon_pattern.search(html):
        html = icon_pattern.sub(lambda m: m.group(1) + icon_uri + m.group(2), html)
        print("已更新 favicon")

    INDEX.write_text(html, encoding="utf8")
    (OUT_DIR / "mark-uri.txt").write_text(mark_uri, encoding="utf8")


if __name__ == "__main__":
    main()
