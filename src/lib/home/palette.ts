// 入口ページの色・太さ。スマホ(有機EL)でまぶしくちらつかないよう、真っ黒と鮮やかすぎる黄色を避ける

/** 背景。真っ黒(#000)ではなく、ごく濃い灰色 */
export const BG = "#0E0E10";
/** 黄色。少し明るさと鮮やかさを落とした */
export const YELLOW = "#F2A900";
// 「● LIVE」の赤(黒地でまぶしすぎない、少しやわらかい赤)
export const LIVE_RED = "#E5484D";
/** 細い枠の黄色(少し透かして、線のちらつきを抑える) */
export const YELLOW_LINE = "rgba(242, 169, 0, 0.8)";
/** タイルの地(背景から少し浮く黒) */
export const TILE = "#1C1C1C";
/** 大きい文字の白(ロゴと同じ、少しあたたかい白) */
export const OFF_WHITE = "#F4F1EA";
export const GRAY = "#9E9E9E";

/** アイコンの線の太さ(画面の px)。ICON_LINE と一緒に使い、アイコンの大きさによらず同じ太さに見せる */
export const ICON_STROKE = 1.75;
/** アイコンの線を拡大・縮小しない(大きいアイコンだけ線が太くなるのを防ぐ) */
export const ICON_LINE = "[&_*]:[vector-effect:non-scaling-stroke]";
