"""平面図(2D)の地面の絵を、地図の色に塗り替えて public/map/ground.webp に書き出す。

本人が Figma で描いた絵(informations/map-base/frame.json と同じ 2133×1904)を、そのままの色で描いてもらい、
ここで地図の色(「お祭りの夜」: タイトルの星空に合わせた紺。鮮やかな色は混雑度のピンだけに使う)に置き換える。
真っ白は塗っていない所として透明にする。縁のにじみなど表に無い色は、いちばん近い色として扱う。

使い方: python3 scripts/map-ground.py ../informations/MapBackground.png
"""

import sys

import numpy as np
from PIL import Image

# 描くときの色 → 地図の色(None は透明)
PALETTE = {
    "#FFFFFF": None,  # 塗っていない所
    "#606060": "#161B2B",  # 敷地の地面
    "#515151": "#222A3E",  # 道
    "#363636": "#10141F",  # 地面の縁
    "#009843": "#22463D",  # 草・木(混雑度の緑とまぎれない、くすんだ青緑)
    "#00401C": "#1A3530",  # 草・木の縁
    "#CBCBCB": "#3A4462",  # 明るい通路の線
    "#A8A8A8": "#2E3650",  # 通路の線の縁
    "#7E0000": "#3E4663",  # 駐輪場などの屋根(建物より一段暗い)
    "#370000": "#6B7494",  # 屋根の縁
}

hex_rgb = lambda s: [int(s[i : i + 2], 16) for i in (1, 3, 5)]


def main(src: str, dst: str = "public/map/ground.webp") -> None:
    a = np.asarray(Image.open(src).convert("RGBA")).astype(int)
    srcs = np.array([hex_rgb(k) for k in PALETTE])
    # 各画素を、表の中でいちばん近い色に寄せる
    d = ((a[..., None, :3] - srcs[None, None]) ** 2).sum(-1)
    idx = d.argmin(-1)
    out = np.zeros(a.shape, np.uint8)
    for i, dst_hex in enumerate(PALETTE.values()):
        m = idx == i
        if dst_hex is not None:
            out[m, :3] = hex_rgb(dst_hex)
            out[m, 3] = a[m, 3]
    Image.fromarray(out).save(dst, "WEBP", quality=90, method=6)
    print(f"{dst} に書き出しました({out.shape[1]}×{out.shape[0]})")


if __name__ == "__main__":
    main(*sys.argv[1:])
