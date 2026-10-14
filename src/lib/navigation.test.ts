import { describe, expect, it } from "vitest";
import {
  NAV_ENTRANCES,
  NAV_HOME,
  TILE_ENTRANCES,
  TILE_MAP,
} from "./navigation";

describe("行き先の一覧", () => {
  it("入口は 4 つで、マップは /map", () => {
    expect(NAV_ENTRANCES.map((n) => [n.label, n.href])).toEqual([
      ["マップ", "/map"],
      ["クラス展示", "/class-booth"],
      ["クラブバザー", "/bazaar"],
      ["ステージイベント", "/stage-event"],
    ]);
  });

  it("トップは入口ページ", () => {
    expect(NAV_HOME.href).toBe("/main");
  });

  it("トップはマップを大きく 1 つ、その下に小さい 3 つ(メニューはそのまま)", () => {
    expect(TILE_MAP.href).toBe("/map");
    expect(TILE_ENTRANCES.map((n) => n.label)).toEqual([
      "クラブバザー",
      "クラス展示",
      "ステージイベント",
    ]);
  });
});
