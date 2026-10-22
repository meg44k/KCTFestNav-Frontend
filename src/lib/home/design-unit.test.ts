import { describe, expect, it } from "vitest";
import { u } from "./design-unit";

describe("u(デザインの案の 1px)", () => {
  it("案の幅 264 を入れ物の幅 100% として長さにする", () => {
    expect(u(264)).toBe("calc(264 * 100cqw / 264)");
    expect(u(17)).toBe("calc(17 * 100cqw / 264)");
  });
});
