import { describe, expect, it } from "vitest";
import { isMaintenanceOn, showsMaintenance } from "./maintenance";

describe("isMaintenanceOn(環境変数でメンテナンス中か)", () => {
  it("1 か true ならメンテナンス中", () => {
    expect(isMaintenanceOn("1")).toBe(true);
    expect(isMaintenanceOn("true")).toBe(true);
    expect(isMaintenanceOn(" TRUE ")).toBe(true);
  });

  it("未設定・0・false などはふだんどおり", () => {
    for (const v of [undefined, "", "0", "false", "off"]) {
      expect(isMaintenanceOn(v)).toBe(false);
    }
  });
});

describe("showsMaintenance(メンテナンス中にこのページを差し替えるか)", () => {
  it("来場者のページは差し替える", () => {
    for (const p of ["/", "/main", "/map", "/class-booth", "/stage-event"]) {
      expect(showsMaintenance(p)).toBe(true);
    }
  });

  it("管理画面は使えるようにしておく(混雑度やお知らせを直すため)", () => {
    expect(showsMaintenance("/manage")).toBe(false);
    expect(showsMaintenance("/manage/login")).toBe(false);
    expect(showsMaintenance("/manage/booths/map")).toBe(false);
  });

  it("メンテナンスのページそのものと、画像などのファイルは差し替えない", () => {
    expect(showsMaintenance("/maintenance")).toBe(false);
    expect(showsMaintenance("/map/ground.webp")).toBe(false);
    expect(showsMaintenance("/icon.png")).toBe(false);
  });

  it("/managementのように manage で始まるだけの別のページは差し替える", () => {
    expect(showsMaintenance("/management")).toBe(true);
  });
});
