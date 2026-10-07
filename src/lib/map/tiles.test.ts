import { describe, expect, it } from "vitest";
import realData from "@/data/campus.json";
import { type CampusData, loadCampus } from "./campus";
import { FLAT_COLORS, flattenPhoto, groundTiles, tileUrl } from "./tiles";

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

describe("2D のデフォルメした地面", () => {
  const rgb = (hex: string) =>
    [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  // 3×3 の同じ色の画素で、航空写真の 1 か所を表す
  const kindOf = (r: number, g: number, b: number) => {
    const px = new Uint8ClampedArray(9 * 4);
    for (let i = 0; i < 9; i++) px.set([r, g, b, 255], i * 4);
    flattenPhoto(px, 3, 3);
    const got = [px[16], px[17], px[18]].join(",");
    return Object.entries(FLAT_COLORS).find(
      ([, hex]) => rgb(hex).join(",") === got,
    )?.[0];
  };

  it("草木は緑、道路や舗装は灰色、グラウンドの土は茶色、水は青", () => {
    expect(kindOf(70, 110, 60)).toBe("green");
    expect(kindOf(40, 60, 35)).toBe("green");
    expect(kindOf(120, 122, 125)).toBe("paved");
    expect(kindOf(190, 170, 140)).toBe("soil");
    expect(kindOf(50, 80, 120)).toBe("water");
  });

  it("まわりと違う 1 画素だけの点は、まわりの色にならす", () => {
    const px = new Uint8ClampedArray(9 * 4);
    for (let i = 0; i < 9; i++) px.set([70, 110, 60, 255], i * 4);
    px.set([120, 122, 125, 255], 4 * 4); // 真ん中だけ灰色
    flattenPhoto(px, 3, 3);
    expect([px[16], px[17], px[18]]).toEqual(rgb(FLAT_COLORS.green));
  });
});
