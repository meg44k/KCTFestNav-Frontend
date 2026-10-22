import { describe, expect, it } from "vitest";
import type { XY } from "./campus";
import { clusterPins } from "./cluster";

const pin = (id: number, xy: XY) => ({ id, xy });

describe("clusterPins(近いピンをまとめる)", () => {
  it("離れているピンは 1 本ずつのまま", () => {
    const groups = clusterPins([pin(1, [0, 0]), pin(2, [100, 0])], 10);
    expect(groups.map((g) => g.members.map((m) => m.id))).toEqual([[1], [2]]);
  });

  it("近いピンは 1 つにまとめ、真ん中に置く", () => {
    const groups = clusterPins(
      [pin(1, [0, 0]), pin(2, [4, 0]), pin(3, [2, 6])],
      10,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((m) => m.id)).toEqual([1, 2, 3]);
    expect(groups[0].xy).toEqual([2, 2]);
  });

  it("拡大する(まとめる距離が地図の上で短くなる)と、ほどける", () => {
    const pins = [pin(1, [0, 0]), pin(2, [4, 0])];
    expect(clusterPins(pins, 10)).toHaveLength(1);
    expect(clusterPins(pins, 3)).toHaveLength(2);
  });

  it("選んでいるピンはまとめず、いつも 1 本で出す", () => {
    const groups = clusterPins([pin(1, [0, 0]), pin(2, [1, 0])], 10, 2);
    expect(groups.map((g) => g.members.map((m) => m.id))).toEqual([[1], [2]]);
  });

  it("同じ場所に重なったピンは、どれだけ拡大してもまとめたまま", () => {
    const groups = clusterPins([pin(1, [5, 5]), pin(2, [5, 5])], 0.001);
    expect(groups).toHaveLength(1);
  });
});
