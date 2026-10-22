/**
 * しずく形のピン(地図アプリのピン)の輪郭。先が (0,0) で、半径 r の頭の丸の中心が height だけ真上(画面の上は y が負)。
 * 先からの 2 本の線は頭の丸に接するので角ばらない。頭の真ん中に半径 hole の穴をあける(fillRule="evenodd" で描く)
 */
export function pinShape(r: number, height: number, hole: number) {
  // 中心 → 接点 の向きが真下となす角(cos = r / height)
  const a = Math.acos(r / height);
  const tx = r * Math.sin(a);
  const ty = -height + r * Math.cos(a);
  const n = (v: number) => Number(v.toFixed(3));
  const d =
    `M0,0 L${n(-tx)},${n(ty)} A${r},${r} 0 1 1 ${n(tx)},${n(ty)} Z ` +
    `M${-hole},${-height} A${hole},${hole} 0 1 0 ${hole},${-height} A${hole},${hole} 0 1 0 ${-hole},${-height} Z`;
  return { d, head: { x: 0, y: -height }, tangent: [tx, ty] as const };
}
