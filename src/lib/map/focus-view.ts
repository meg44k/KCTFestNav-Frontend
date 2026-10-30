// 下のカードに隠れないよう、選んだピンは画面の上から 35% の所に置く
const FROM_TOP = 0.35;

/**
 * 点 p(拡大前の viewBox の座標)が、見えている範囲 screen の左右の真ん中・上寄りに来る拡大・移動。
 * 拡大は zoom にする。いまの拡大 current がそれより大きければ、そのまま
 */
export function viewShowing(
  p: { x: number; y: number },
  screen: { cx: number; cy: number; h: number },
  zoom: number,
  current = 0,
) {
  const k = Math.max(zoom, current);
  const y = screen.cy - screen.h / 2 + screen.h * FROM_TOP;
  return { k, tx: screen.cx - k * p.x, ty: y - k * p.y };
}
