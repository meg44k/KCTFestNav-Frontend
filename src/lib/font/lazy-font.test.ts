import { describe, expect, it } from "vitest";
import { FONT_STYLESHEET, loadFontAfterPageLoad } from "./lazy-font";

// document と window の、使う所だけの作りもの
function fakePage(readyState: "loading" | "interactive" | "complete") {
  const appended: { rel: string; href: string }[] = [];
  const listeners: Record<string, () => void> = {};
  const doc = {
    readyState,
    head: {
      appendChild: (el: { rel: string; href: string }) => appended.push(el),
    },
    createElement: () => ({ rel: "", href: "" }),
    querySelector: (sel: string) =>
      appended.some((a) => sel.includes(a.href)) ? {} : null,
  };
  const win = {
    addEventListener: (type: string, fn: () => void) => {
      listeners[type] = fn;
    },
    removeEventListener: (type: string) => {
      delete listeners[type];
    },
  };
  return { doc, win, appended, listeners };
}

describe("フォントを後から読む", () => {
  it("ページの読み込みが終わる前は、まだ読まない", () => {
    const page = fakePage("interactive");
    loadFontAfterPageLoad(page.doc, page.win);
    expect(page.appended).toHaveLength(0);
    expect(page.listeners.load).toBeDefined();
  });

  it("読み込みが終わったら、フォントの指定を 1 つ足す", () => {
    const page = fakePage("interactive");
    loadFontAfterPageLoad(page.doc, page.win);
    page.listeners.load();
    expect(page.appended).toEqual([
      { rel: "stylesheet", href: FONT_STYLESHEET },
    ]);
  });

  it("もう読み込みが終わっていれば、すぐ足す", () => {
    const page = fakePage("complete");
    loadFontAfterPageLoad(page.doc, page.win);
    expect(page.appended).toHaveLength(1);
  });

  it("2 回呼んでも 1 つだけ", () => {
    const page = fakePage("complete");
    loadFontAfterPageLoad(page.doc, page.win);
    loadFontAfterPageLoad(page.doc, page.win);
    expect(page.appended).toHaveLength(1);
  });

  it("太さは 400 と 700 だけ、切り替えは swap", () => {
    expect(FONT_STYLESHEET).toContain("Zen+Kaku+Gothic+New:wght@400;700");
    expect(FONT_STYLESHEET).toContain("display=swap");
  });

  it("片付けると、待っていた読み込みをやめる", () => {
    const page = fakePage("interactive");
    const stop = loadFontAfterPageLoad(page.doc, page.win);
    stop();
    expect(page.listeners.load).toBeUndefined();
  });
});
