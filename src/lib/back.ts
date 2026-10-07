/** 戻るボタンのための、このタブでサイトの中を見た記録(sessionStorage に置く) */
export type VisitHistory = { prev?: string; last?: string };

export const VISIT_KEY = "kct-visit";

/** ページを開いたら記録する。同じページの読み直しでは前のページを変えない */
export function recordVisit(h: VisitHistory, path: string): VisitHistory {
  if (h.last === path) return h;
  return { prev: h.last, last: path };
}

/** 今のページの前に、サイトの中のページを見ていたか(無ければトップへ) */
export const canGoBack = (h: VisitHistory, path: string) =>
  h.last === path && h.prev !== undefined;
