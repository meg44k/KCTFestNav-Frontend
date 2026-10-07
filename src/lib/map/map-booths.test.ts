import { describe, expect, it } from "vitest";
import type { Booth } from "@/lib/api/booths";
import { type CampusData, loadCampus } from "./campus";
import {
  boothKind,
  boothsByFloor,
  mapPins,
  mapQuery,
  parseMapQuery,
  resolveInitial,
} from "./map-booths";

const LAT = 33.816;
const LON = 130.872;
const M_LAT = 1 / 110540;
const M_LON = 1 / (111320 * Math.cos((LAT * Math.PI) / 180));
const ll = (x: number, y: number) => ({
  longitude: LON + x * M_LON,
  latitude: LAT + y * M_LAT,
});
const rect = (x0: number, y0: number, w: number, h: number) =>
  [
    [x0, y0],
    [x0 + w, y0],
    [x0 + w, y0 + h],
    [x0, y0 + h],
    [x0, y0],
  ].map(([x, y]) => [LON + x * M_LON, LAT + y * M_LAT]);
const campus = loadCampus({
  features: [
    {
      geometry: { type: "Polygon", coordinates: [rect(0, 0, 20, 20)] },
      properties: {
        buildingId: "A",
        buildingName: "A館",
        height: 14,
        heightUsed: 14,
        storeys: 4,
        storeysManual: 4,
        baseFloor: null,
        baseHeight: 0,
      },
    },
  ],
} as CampusData);

const booth = (
  id: number,
  organizer: string,
  floor: number,
  pos?: { latitude: number; longitude: number },
): Booth => ({
  id,
  name: `ブース${id}`,
  description: "",
  organizer,
  location: "",
  congestionStatus: "empty",
  floor,
  ...pos,
});

const booths = [
  booth(1, "3-1", 2, ll(5, 5)),
  booth(2, "2-4", 1, ll(15, 15)),
  booth(3, "軽音部", 0, ll(40, 40)),
  booth(4, "1-1", 0), // 位置未設定
];

describe("parseMapQuery", () => {
  it("type・view・booth を読む。おかしな値は無視", () => {
    expect(parseMapQuery({ type: "club", view: "2d", booth: "3" })).toEqual({
      type: "club",
      view: "2d",
      boothId: 3,
    });
    expect(parseMapQuery({ type: "x", view: "4d", booth: "abc" })).toEqual({
      type: "all",
    });
    expect(parseMapQuery({ booth: ["1", "2"] })).toEqual({ type: "all" });
  });
});

describe("resolveInitial", () => {
  it("指定が無ければ 3D・全部。クラブバザーなら 2D", () => {
    expect(resolveInitial({ type: "all" }, booths)).toEqual({
      type: "all",
      view: "3d",
      boothId: null,
    });
    expect(resolveInitial({ type: "club" }, booths)).toEqual({
      type: "club",
      view: "2d",
      boothId: null,
    });
    expect(resolveInitial({ type: "club", view: "3d" }, booths).view).toBe(
      "3d",
    );
  });

  it("ブース指定: 建物の中は 3D、屋外は 2D。無い・位置未設定のブースは選ばない", () => {
    expect(resolveInitial({ type: "all", boothId: 1 }, booths)).toEqual({
      type: "all",
      view: "3d",
      boothId: 1,
    });
    expect(resolveInitial({ type: "all", boothId: 3 }, booths)).toEqual({
      type: "all",
      view: "2d",
      boothId: 3,
    });
    expect(
      resolveInitial({ type: "all", boothId: 4 }, booths).boothId,
    ).toBeNull();
    expect(
      resolveInitial({ type: "all", boothId: 99 }, booths).boothId,
    ).toBeNull();
  });
});

describe("mapQuery", () => {
  it("既定値は書かない", () => {
    expect(mapQuery({ type: "all", view: "3d", boothId: null })).toBe("");
    expect(mapQuery({ type: "club", view: "2d", boothId: 3 })).toBe(
      "?type=club&view=2d&booth=3",
    );
  });
});

describe("pins", () => {
  it("種類はクラス(学年-組)かそれ以外", () => {
    expect(boothKind(booths[0])).toBe("class");
    expect(boothKind(booths[2])).toBe("club");
  });

  it("位置のあるブースだけ、絞り込みに合わせて、床の高さに置く", () => {
    const all = mapPins(campus, booths, "all");
    expect(all.map((p) => [p.id, p.kind, p.floor, p.buildingId])).toEqual([
      [1, "class", 2, "A"],
      [2, "class", 1, "A"],
      [3, "club", 0, undefined],
    ]);
    expect(all[0].elevation).toBeCloseTo(3.5);
    expect(mapPins(campus, booths, "club").map((p) => p.id)).toEqual([3]);
  });

  it("棟のブースを階ごとに", () => {
    const pins = mapPins(campus, booths, "all");
    expect(
      boothsByFloor(pins, booths, "A").map((g) => [
        g.floor,
        g.booths.map((b) => b.id),
      ]),
    ).toEqual([
      [1, [2]],
      [2, [1]],
    ]);
  });
});
