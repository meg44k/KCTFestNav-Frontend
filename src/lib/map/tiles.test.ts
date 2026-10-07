import { describe, expect, it } from "vitest";
import realData from "@/data/campus.json";
import { type CampusData, loadCampus } from "./campus";
import { groundTiles, tileUrl } from "./tiles";

const campus = loadCampus(realData as unknown as CampusData);

describe("groundTiles", () => {
  it("建物全体 + 余白を覆う z18 のタイルと、その範囲(メートル)", () => {
    const g = groundTiles(campus, 80, 18);
    const count = (g.tx1 - g.tx0 + 1) * (g.ty1 - g.ty0 + 1);
    // 数十枚に収まる(大量に取りに行かない)
    expect(count).toBeGreaterThan(4);
    expect(count).toBeLessThan(80);
    const { minX, maxX, minY, maxY } = campus.bounds;
    // 建物全体を覆う(北西が x0,y1、南東が x1,y0)
    expect(g.rect.x0).toBeLessThan(minX - 79);
    expect(g.rect.x1).toBeGreaterThan(maxX + 79);
    expect(g.rect.y0).toBeLessThan(minY - 79);
    expect(g.rect.y1).toBeGreaterThan(maxY + 79);
  });

  it("外側の粗い写真(z17・広め)も数十枚に収まる", () => {
    const g = groundTiles(campus, 600, 17);
    expect((g.tx1 - g.tx0 + 1) * (g.ty1 - g.ty0 + 1)).toBeLessThan(60);
  });

  it("地理院の全国最新写真のタイル", () => {
    expect(tileUrl(18, 230000, 104000)).toBe(
      "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/18/230000/104000.jpg",
    );
  });
});
