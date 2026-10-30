import { describe, expect, it } from "vitest";
import { createPinchTracker } from "./pinch-forward";

describe("createPinchTracker(地図の外から始めたピンチを地図に回す)", () => {
  it("1 本指はどこを触っても地図に回さない", () => {
    const t = createPinchTracker();
    expect(t.down(1, 10, 10, false)).toEqual([]);
    t.up(1);
    expect(t.pinched()).toBe(false);
  });

  it("ボタンの上の指があるところに 2 本目が地図に触れたら、ボタンの上の指を(いまの位置で)回す", () => {
    const t = createPinchTracker();
    t.down(1, 10, 10, false);
    t.move(1, 12, 14);
    expect(t.down(2, 100, 100, true)).toEqual([{ id: 1, x: 12, y: 14 }]);
  });

  it("地図の上の指があるところに 2 本目がボタンに触れたら、その 2 本目を回す", () => {
    const t = createPinchTracker();
    t.down(1, 100, 100, true);
    expect(t.down(2, 10, 10, false)).toEqual([{ id: 2, x: 10, y: 10 }]);
  });

  it("2 本ともボタンの上でも、2 本とも回す(先に触れた順)", () => {
    const t = createPinchTracker();
    t.down(1, 10, 10, false);
    expect(t.down(2, 20, 20, false)).toEqual([
      { id: 1, x: 10, y: 10 },
      { id: 2, x: 20, y: 20 },
    ]);
  });

  it("2 本とも地図の上なら何もしない(地図がそのまま受ける)", () => {
    const t = createPinchTracker();
    t.down(1, 10, 10, true);
    expect(t.down(2, 20, 20, true)).toEqual([]);
    expect(t.pinched()).toBe(false);
  });

  it("一度回した指は 2 度回さない", () => {
    const t = createPinchTracker();
    t.down(1, 10, 10, false);
    t.down(2, 20, 20, true);
    expect(t.down(3, 30, 30, true)).toEqual([]);
  });

  it("回したピンチのあとは、指を離してもボタンを押したことにしない。次に触れたら元に戻る", () => {
    const t = createPinchTracker();
    t.down(1, 10, 10, false);
    t.down(2, 20, 20, true);
    t.up(1);
    t.up(2);
    expect(t.pinched()).toBe(true);
    t.down(3, 10, 10, false);
    expect(t.pinched()).toBe(false);
  });
});
