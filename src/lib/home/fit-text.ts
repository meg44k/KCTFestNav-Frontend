/**
 * 文字が幅に収まる大きさの割合(1 ならそのまま)。長いバンド名を「…」で切らずに小さくして全部見せる。
 * ただし小さくしすぎると読めないので min で止める(そのときだけ「…」になる)
 */
export function fitScale(
  available: number,
  natural: number,
  min = 0.4,
): number {
  if (available <= 0 || natural <= 0 || natural <= available) return 1;
  return Math.max(min, available / natural);
}
