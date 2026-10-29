// 入口ページの色・太さ。スマホ(有機EL)でまぶしくちらつかないよう、真っ黒と鮮やかすぎる黄色を避ける

/** 背景。真っ黒(#000)ではなく、ごく濃い灰色 */
export const BG = "#0E0E10";
/** 黄色。少し明るさと鮮やかさを落とした */
export const YELLOW = "#F2A900";
// 「● LIVE」の赤(黒地でまぶしすぎない、少しやわらかい赤)
export const LIVE_RED = "#E5484D";
/** 細い枠の黄色。暗めにして、線を細く見せる(ちらつきも抑える) */
export const YELLOW_LINE = "rgba(242, 169, 0, 0.5)";
/** 入口のボタン(タイル)の地。半透明のガラスで、後ろの星が少し透ける */
export const TILE = "rgba(255, 255, 255, 0.07)";
/** タイルの縁。上の縁だけ光らせ、まわりはごく薄い線で形を見せる */
export const TILE_EDGE =
  "inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.06)";
/** タイルの後ろをぼかす(星がにじんで、文字の邪魔をしない) */
export const TILE_BLUR = "blur(6px)";
/** 大きい文字の白(ロゴと同じ、少しあたたかい白) */
export const OFF_WHITE = "#F4F1EA";
export const GRAY = "#9E9E9E";

/** アイコンの線の太さ(画面の px)。ICON_LINE と一緒に使い、アイコンの大きさによらず同じ太さに見せる */
export const ICON_STROKE = 1.75;
/** アイコンの線を拡大・縮小しない(大きいアイコンだけ線が太くなるのを防ぐ) */
export const ICON_LINE = "[&_*]:[vector-effect:non-scaling-stroke]";
