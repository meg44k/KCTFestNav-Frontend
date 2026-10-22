import { describe, expect, it } from "vitest";
import { splitBoothsByKind } from "./booth-groups";

const b = (id: number, organizer: string) => ({ id, organizer });

describe("splitBoothsByKind(ブース管理の表を、クラス展示とクラブバザーに分ける)", () => {
  it("クラス表記はクラス展示、それ以外はクラブバザーに入れる", () => {
    const { classes, clubs } = splitBoothsByKind([
      b(1, "弓道部"),
      b(2, "1-1"),
      b(3, "2-3"),
      b(4, "学生会"),
    ]);
    expect(classes.map((x) => x.id)).toEqual([2, 3]);
    expect(clubs.map((x) => x.id).sort()).toEqual([1, 4]);
  });

  it("クラス展示はクラスの順(1-2 の次に 1-10)に並べる", () => {
    const { classes } = splitBoothsByKind([
      b(1, "1-10"),
      b(2, "2-1"),
      b(3, "1-2"),
    ]);
    expect(classes.map((x) => x.organizer)).toEqual(["1-2", "1-10", "2-1"]);
  });
});
