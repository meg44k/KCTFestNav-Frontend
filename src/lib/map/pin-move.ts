import { buildingAt, type Campus, floorRange, type XY } from "./campus";

/**
 * 管理画面でピンを動かしたあとの階。建物の外なら屋外(0)、外から建物へ入れたらその棟のいちばん下の階、
 * 建物どうしなら今の階のまま(その棟に無い階なら、いちばん近い階)
 */
export function floorAfterMove(campus: Campus, xy: XY, floor: number): number {
  const hit = buildingAt(campus, xy);
  if (!hit) return 0;
  const [lowest, highest] = floorRange(hit);
  if (floor <= 0) return lowest;
  return Math.min(Math.max(floor, lowest), highest);
}
