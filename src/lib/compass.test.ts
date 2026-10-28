import { describe, expect, it } from "vitest";
import { geoErrorMessage, hasArrived } from "./compass";

describe("hasArrived(着いたか)", () => {
  it("20m 以内なら着いた", () => {
    expect(hasArrived(20)).toBe(true);
    expect(hasArrived(3)).toBe(true);
  });

  it("20m より遠ければまだ", () => {
    expect(hasArrived(21)).toBe(false);
  });

  it("現在地がまだ取れていない(0)ときは着いたことにしない", () => {
    expect(hasArrived(0)).toBe(false);
  });
});

describe("geoErrorMessage(現在地が取れないときの文)", () => {
  it("許可されていないときは、許可のしかたを書く", () => {
    const msg = geoErrorMessage(1);
    expect(msg).toContain("位置情報");
    expect(msg).toContain("許可");
  });

  it("時間切れのときは、待つか場所を変えるよう書く", () => {
    expect(geoErrorMessage(3)).toContain("もう一度");
  });

  it("ブラウザの英語のエラー文や番号をそのまま出さない", () => {
    for (const code of [1, 2, 3, 99]) {
      expect(geoErrorMessage(code)).not.toMatch(
        /code|denied|timeout|unavailable|\d/i,
      );
    }
  });
});
