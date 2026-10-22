import type { XY } from "./campus";

export type PinCluster<T> = {
  /** まとめたピン(1 本ならそのピンだけ) */
  members: T[];
  /** まとめたピンの真ん中 */
  xy: XY;
};

/**
 * 近いピンを 1 つにまとめる。radius は地図の上の距離で、画面の上で同じ間隔になるよう
 * 拡大の度合いから決めて渡す(拡大するほど短くなり、ほどけていく)。
 * 並びの順に、真ん中が radius 以内のまとまりに入れていく。keepId のピンはまとめない
 */
export function clusterPins<T extends { id: number; xy: XY }>(
  pins: T[],
  radius: number,
  keepId: number | null = null,
): PinCluster<T>[] {
  const out: PinCluster<T>[] = [];
  for (const pin of pins) {
    const group =
      pin.id === keepId
        ? undefined
        : out.find(
            (g) =>
              g.members[0].id !== keepId &&
              Math.hypot(g.xy[0] - pin.xy[0], g.xy[1] - pin.xy[1]) <= radius,
          );
    if (!group) {
      out.push({ members: [pin], xy: pin.xy });
      continue;
    }
    const n = group.members.push(pin);
    group.xy = [
      group.xy[0] + (pin.xy[0] - group.xy[0]) / n,
      group.xy[1] + (pin.xy[1] - group.xy[1]) / n,
    ];
  }
  return out;
}
