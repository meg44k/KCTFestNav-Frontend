import { describe, expect, it } from "vitest";
import realData from "@/data/campus.json";
import { buildingAt, type CampusData, loadCampus, type XY } from "./campus";
import { placeLabel } from "./place-label";

const campus = loadCampus(realData as unknown as CampusData);
// その棟の中の点(L 字の棟は真ん中が外になるため、外周の範囲を 1m ごとに探す)
const lonLatOf = (name: string) => {
  const b = campus.buildings.find((x) => x.name === name);
  if (!b) throw new Error(name);
  const ring = b.parts[0].polygons[0][0];
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x++)
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++)
      if (buildingAt(campus, [x, y])?.building === b) {
        const [longitude, latitude] = campus.toLonLat(x, y);
        return { longitude, latitude };
      }
  throw new Error(name);
};
const outside: XY = [campus.bounds.minX - 30, campus.bounds.minY - 30];
const [outLon, outLat] = campus.toLonLat(...outside);

describe("placeLabel(コンパスに出す場所)", () => {
  it("建物の中なら「N号館 N階」", () => {
    expect(placeLabel(campus, { ...lonLatOf("6号館"), floor: 2 })).toBe(
      "6号館 2階",
    );
  });

  it("全角の号館名は半角にそろえる", () => {
    expect(placeLabel(campus, { ...lonLatOf("１号館"), floor: 4 })).toBe(
      "1号館 4階",
    );
  });

  it("名前の括弧の中は省く", () => {
    expect(
      placeLabel(campus, { ...lonLatOf("体育館(ステージイベント)"), floor: 1 }),
    ).toBe("体育館 1階");
  });

  it("屋外(階 0)なら場所の説明を出す", () => {
    expect(placeLabel(campus, { ...lonLatOf("6号館"), floor: 0 }, "中庭")).toBe(
      "中庭",
    );
  });

  it("建物の外なら階があっても場所の説明を出す", () => {
    expect(
      placeLabel(
        campus,
        { longitude: outLon, latitude: outLat, floor: 4 },
        "1号館4階",
      ),
    ).toBe("1号館4階");
  });

  it("建物の外で説明も無ければ出さない", () => {
    expect(
      placeLabel(campus, { longitude: outLon, latitude: outLat, floor: 3 }),
    ).toBeUndefined();
  });
});
