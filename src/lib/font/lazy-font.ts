// Zen Kaku Gothic New は日本語の分だけで数 MB ある。最初から読むとページ本体の読み込みと回線を取り合い、
// 初めて開いたときの表示が大きく遅れる。そこで最初は端末のフォントで出し、ページの読み込みが終わってから読む
export const FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;700&display=swap";

type Link = { rel: string; href: string };
type Doc<L extends Link> = {
  readyState: string;
  head: { appendChild: (el: L) => unknown };
  createElement: (tag: "link") => L;
  querySelector: (selector: string) => unknown;
};
type Win = {
  addEventListener: (type: "load", fn: () => void) => void;
  removeEventListener: (type: "load", fn: () => void) => void;
};

/** ページの読み込みが終わってからフォントの指定を足す。戻り値は待つのをやめる関数 */
export function loadFontAfterPageLoad<L extends Link>(
  doc: Doc<L>,
  win: Win,
): () => void {
  const add = () => {
    if (doc.querySelector(`link[href="${FONT_STYLESHEET}"]`)) return;
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_STYLESHEET;
    doc.head.appendChild(link);
  };
  if (doc.readyState === "complete") {
    add();
    return () => {};
  }
  win.addEventListener("load", add);
  return () => win.removeEventListener("load", add);
}
