import { describe, expect, it } from "vitest";
import {
  geoErrorMessage,
  hasArrived,
  readHeading,
  sensorErrorMessage,
} from "./compass";

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

describe("readHeading(向きのイベントから北基準の向きを読む)", () => {
  it("iPhone は webkitCompassHeading をそのまま使う", () => {
    expect(
      readHeading({ webkitCompassHeading: 90, alpha: 10, absolute: false }),
    ).toBe(90);
  });

  it("北基準(absolute)の alpha は時計回りに直す", () => {
    expect(readHeading({ alpha: 90, absolute: true })).toBe(270);
  });

  it("値が無い(センサーの無い PC など)は noSensor", () => {
    expect(readHeading({ alpha: null, absolute: false })).toBe("noSensor");
  });

  it("北基準でない alpha は notAbsolute", () => {
    expect(readHeading({ alpha: 90, absolute: false })).toBe("notAbsolute");
  });
});

describe("sensorErrorMessage(向きが取れないときの文)", () => {
  it("センサーが無いときは、矢印が使えないと書く", () => {
    expect(sensorErrorMessage("noSensor")).toContain("使えません");
  });

  it("北基準でないときは、矢印がずれるかもと書く", () => {
    expect(sensorErrorMessage("notAbsolute")).toContain("正しくない");
  });
});
