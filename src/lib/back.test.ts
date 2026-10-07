import { describe, expect, it } from "vitest";
import { canGoBack, recordVisit } from "./back";

describe("戻るボタン", () => {
  it("サイトの中で前に見たページがあれば戻れる", () => {
    let h = recordVisit({}, "/main");
    expect(canGoBack(h, "/main")).toBe(false);
    h = recordVisit(h, "/class-booth");
    expect(canGoBack(h, "/class-booth")).toBe(true);
  });

  it("同じページを読み直しても前のページは変わらない", () => {
    let h = recordVisit({}, "/main");
    h = recordVisit(h, "/map");
    h = recordVisit(h, "/map");
    expect(h).toEqual({ prev: "/main", last: "/map" });
  });

  it("QR などから直接開いたページは戻り先がない(トップへ)", () => {
    expect(canGoBack(recordVisit({}, "/map"), "/map")).toBe(false);
  });
});
