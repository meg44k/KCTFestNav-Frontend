import { describe, expect, it } from "vitest";
import { canLike, nextVote, voteState } from "./likes";

describe("nextVote(押したあとの自分の票)", () => {
  it("まだ入れていなければ、押した展示に入る", () => {
    expect(nextVote(null, 2)).toBe(2);
  });

  it("入れている展示をもう一度押すと取り消す", () => {
    expect(nextVote(2, 2)).toBeNull();
  });

  it("ほかの展示に入れていれば、押した展示へ移す(1 人 1 票)", () => {
    expect(nextVote(1, 2)).toBe(2);
  });
});

describe("voteState(ボタンの見た目)", () => {
  it("入れていない・この展示に入れている・ほかの展示に入れている", () => {
    expect(voteState(null, 2)).toBe("none");
    expect(voteState(2, 2)).toBe("mine");
    expect(voteState(1, 2)).toBe("other");
  });
});

describe("canLike", () => {
  it("クラス展示だけ", () => {
    expect(canLike("3-2")).toBe(true);
    expect(canLike("天文部")).toBe(false);
    expect(canLike("")).toBe(false);
  });
});
