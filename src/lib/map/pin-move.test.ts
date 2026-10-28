import { describe, expect, it } from "vitest";
import realData from "@/data/campus.json";
import { buildingAt, type CampusData, loadCampus, type XY } from "./campus";
import { floorAfterMove } from "./pin-move";

const campus = loadCampus(realData as unknown as CampusData);
const centerOf = (name: string): XY => {
  const b = campus.buildings.find((x) => x.name === name);
  if (!b) throw new Error(name);
  return b.center;
};
// 建物の無い所(敷地の外れ)
const outside: XY = [campus.bounds.minX - 30, campus.bounds.minY - 30];

describe("floorAfterMove(ピンを動かしたあとの階)", () => {
  it("建物の外に出したら屋外(0)", () => {
    expect(buildingAt(campus, outside)).toBeUndefined();
    expect(floorAfterMove(campus, outside, 3)).toBe(0);
    expect(floorAfterMove(campus, outside, 0)).toBe(0);
  });

  it("外から建物の中へ入れたら、その棟のいちばん下の階", () => {
    expect(floorAfterMove(campus, centerOf("6号館"), 0)).toBe(1);
  });

  it("建物から別の建物へ移したら階はそのまま", () => {
    expect(floorAfterMove(campus, centerOf("6号館"), 3)).toBe(3);
  });

  it("移した先にその階が無ければ、いちばん近い階", () => {
    // 2号館は 2 階建て
    expect(floorAfterMove(campus, centerOf("2号館"), 4)).toBe(2);
  });
});
