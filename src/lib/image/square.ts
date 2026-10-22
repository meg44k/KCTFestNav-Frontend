/** 写真のまん中の正方形(sx, sy から size 四方)と、縮めたあとの一辺(max より大きくしない) */
export function squareCrop(
  w: number,
  h: number,
  max = 1080,
): { sx: number; sy: number; size: number; out: number } {
  const size = Math.min(w, h);
  return {
    sx: Math.floor((w - size) / 2),
    sy: Math.floor((h - size) / 2),
    size,
    out: Math.min(size, max),
  };
}
