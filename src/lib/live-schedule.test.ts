import { describe, expect, it } from "vitest";
import { announcementOrDefault } from "./live-schedule";

describe("announcementOrDefault", () => {
  it("空や取得失敗のときは既定の文", () => {
    expect(announcementOrDefault("13時からライブ")).toBe("13時からライブ");
    expect(announcementOrDefault("  ")).toBe("2026 高専祭開催中!!");
    expect(announcementOrDefault(undefined)).toBe("2026 高専祭開催中!!");
  });
});
