import { describe, expect, it } from "vitest";
import { squareCrop } from "./square";

describe("squareCrop", () => {
  it("横長はまん中の正方形", () => {
    expect(squareCrop(4000, 3000)).toEqual({
      sx: 500,
      sy: 0,
      size: 3000,
      out: 1080,
    });
  });
  it("縦長はまん中の正方形", () => {
    expect(squareCrop(3000, 4000)).toEqual({
      sx: 0,
      sy: 500,
      size: 3000,
      out: 1080,
    });
  });
  it("正方形はそのまま", () => {
    expect(squareCrop(2000, 2000)).toEqual({
      sx: 0,
      sy: 0,
      size: 2000,
      out: 1080,
    });
  });
  it("小さい写真は大きくしない", () => {
    expect(squareCrop(600, 400)).toEqual({
      sx: 100,
      sy: 0,
      size: 400,
      out: 400,
    });
  });
  it("奇数のずれは切り捨て", () => {
    expect(squareCrop(1001, 1000).sx).toBe(0);
  });
});
