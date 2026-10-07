import { describe, expect, it } from "vitest";
import realData from "@/data/campus.json";
import {
  buildingAt,
  type CampusData,
  floorBand,
  floorLabel,
  loadCampus,
  nearCampus,
  placeOnFloor,
} from "./campus";

const LAT = 33.816;
const LON = 130.872;
const M_LAT = 1 / 110540;
const M_LON = 1 / (111320 * Math.cos((LAT * Math.PI) / 180));

// 原点から (x0,y0) の位置にある w×h メートルの長方形(経緯度)
const rect = (x0: number, y0: number, w: number, h: number) => [
  [LON + x0 * M_LON, LAT + y0 * M_LAT],
  [LON + (x0 + w) * M_LON, LAT + y0 * M_LAT],
  [LON + (x0 + w) * M_LON, LAT + (y0 + h) * M_LAT],
  [LON + x0 * M_LON, LAT + (y0 + h) * M_LAT],
  [LON + x0 * M_LON, LAT + y0 * M_LAT],
];

type Props = CampusData["features"][number]["properties"];
const feature = (
  buildingId: string,
  ring: number[][],
  props: Partial<Props> = {},
  holes: number[][][] = [],
) => ({
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [ring, ...holes] },
  properties: {
    buildingId,
    buildingName: null,
    height: null,
    heightUsed: 3.5,
    storeys: null,
    storeysManual: null,
    baseFloor: null,
    baseHeight: 0,
    ...props,
  },
});

const data = {
  type: "FeatureCollection",
  features: [
    // 4 階建て(実測 14m)。真ん中に 2m 四方の中庭(穴)
    feature(
      "A",
      rect(0, 0, 20, 20),
      { buildingName: "A館", height: 14, storeysManual: 4 },
      [rect(9, 9, 2, 2)],
    ),
    // 天井の高い 1 階建て(体育館)
    feature("G", rect(40, 0, 20, 20), {
      buildingName: "体育館",
      height: 11.7,
      storeysManual: 1,
    }),
    // 統合した棟: 3 階の部分と 2 階の部分
    feature("M", rect(0, 40, 10, 10), {
      buildingName: "M館",
      height: 10.5,
      storeysManual: 3,
    }),
    feature("M", rect(10, 40, 10, 10), {
      buildingName: "M館",
      height: 7,
      storeysManual: 2,
    }),
    // 渡り廊下: 2 階から 1 階分浮いている(実測 height は地面からなので使わない)
    feature("W", rect(25, 5, 10, 2), {
      height: 9,
      storeysManual: 1,
      baseFloor: 2,
      baseHeight: 3.5,
      heightUsed: 3.5,
    }),
    // 実測が無く階数も無い倉庫
    feature("S", rect(70, 0, 5, 5), { heightUsed: 6 }),
  ],
} as unknown as CampusData;

const campus = loadCampus(data);
const at = (x: number, y: number) =>
  campus.toXY(LON + x * M_LON, LAT + y * M_LAT);
const byId = (id: string) => {
  const b = campus.buildings.find((x) => x.id === id);
  if (!b) throw new Error(`棟 ${id} が無い`);
  return b;
};

describe("loadCampus", () => {
  it("部分を棟にまとめ、名前・階数を持つ", () => {
    expect(campus.buildings.map((b) => [b.id, b.name, b.floors])).toEqual([
      ["A", "A館", 4],
      ["G", "体育館", 1],
      ["M", "M館", 3],
      ["W", undefined, 2],
      ["S", undefined, 1],
    ]);
  });

  it("高さは実測を優先し、浮いた部分と実測の無い部分は heightUsed", () => {
    expect(byId("G").parts[0].height).toBeCloseTo(11.7);
    expect(byId("W").parts[0]).toMatchObject({
      bottom: 3.5,
      height: 3.5,
      baseFloor: 2,
    });
    expect(byId("S").parts[0].height).toBe(6);
  });

  it("経緯度とメートルを行き来できる", () => {
    const [x, y] = at(10, 10);
    const [lon, lat] = campus.toLonLat(x, y);
    expect(lon).toBeCloseTo(LON + 10 * M_LON, 9);
    expect(lat).toBeCloseTo(LAT + 10 * M_LAT, 9);
  });
});

describe("buildingAt", () => {
  it("点を含む棟。穴(中庭)と外は undefined", () => {
    expect(buildingAt(campus, at(5, 5))?.building.id).toBe("A");
    expect(buildingAt(campus, at(10, 10))).toBeUndefined();
    expect(buildingAt(campus, at(30, 30))).toBeUndefined();
  });

  it("渡り廊下の下は浮いた部分の棟として返す", () => {
    expect(buildingAt(campus, at(30, 6))?.building.id).toBe("W");
  });
});

describe("floorBand / placeOnFloor", () => {
  it("階の帯 = 部分の高さ ÷ 階数", () => {
    expect(floorBand(byId("A").parts[0], 2)).toEqual({ bottom: 3.5, top: 7 });
    expect(floorBand(byId("G").parts[0], 1)).toEqual({ bottom: 0, top: 11.7 });
    expect(floorBand(byId("A").parts[0], 5)).toBeUndefined();
    expect(floorBand(byId("W").parts[0], 1)).toBeUndefined();
    expect(floorBand(byId("W").parts[0], 2)).toEqual({ bottom: 3.5, top: 7 });
  });

  it("ブースの床の高さ。屋外は地面", () => {
    expect(placeOnFloor(campus, at(5, 5), 3)).toMatchObject({
      elevation: 7,
      floor: 3,
    });
    expect(placeOnFloor(campus, at(5, 5), 3).building?.id).toBe("A");
    expect(placeOnFloor(campus, at(30, 30), 0)).toEqual({
      elevation: 0,
      building: undefined,
      floor: 0,
    });
  });

  it("統合した棟で、その点の部分に無い階は部分の最上階に置く", () => {
    // 2 階建ての部分の上に 3 階のブース
    expect(placeOnFloor(campus, at(15, 45), 3).elevation).toBeCloseTo(3.5);
    expect(placeOnFloor(campus, at(5, 45), 3).elevation).toBeCloseTo(7);
  });

  it("建物の外で階が付いていても地面", () => {
    expect(placeOnFloor(campus, at(30, 30), 2)).toEqual({
      elevation: 0,
      building: undefined,
      floor: 0,
    });
  });
});

describe("nearCampus / floorLabel", () => {
  it("建物全体の範囲 + 100m の内側か", () => {
    expect(nearCampus(campus, at(-50, 0))).toBe(true);
    expect(nearCampus(campus, at(-150, 0))).toBe(false);
  });

  it("階の表記", () => {
    expect(floorLabel(0)).toBe("屋外");
    expect(floorLabel(2)).toBe("2F");
  });
});

describe("本物のデータ", () => {
  const real = loadCampus(realData as unknown as CampusData);
  it("名前のある棟と、8号館・体育館の階数と高さ", () => {
    const named = real.buildings.filter((b) => b.name);
    expect(named.length).toBe(12);
    expect(named.find((b) => b.name === "8号館")?.floors).toBe(3);
    const gym = named.find((b) => b.name?.startsWith("体育館"));
    expect(gym?.floors).toBe(1);
    expect(gym?.parts[0].height).toBeCloseTo(11.7);
  });
});
