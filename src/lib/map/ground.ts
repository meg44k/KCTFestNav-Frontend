/**
 * 平面図(2D)の地面に敷く絵(道・草など。本人が描いたもの)。
 * 絵は MAP_BEARING の向きに回した座標で、left〜right・bottom〜top(m)の範囲にぴったり重なるように描いてある
 * (informations/map-base/frame.json の範囲。2133×1904 px、1 m = 8 px)
 */
export const GROUND = {
  href: "/map/ground.webp",
  left: -129.05462944874122,
  right: 137.60388793856416,
  bottom: -116.80235864521575,
  top: 121.24548965878475,
};
