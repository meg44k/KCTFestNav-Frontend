// タイトル(/)と入口(/main)は、ページの中に自分の星(StarField)を持っている
const OWN_STARS = new Set(["/", "/main"]);
// 地図は画面いっぱいに描くので、星を出しても隠れる
const NO_STARS = ["/map", "/manage"];

/** 画面に固定した背景の星(PageStars)を出すページか */
export function showsPageStars(pathname: string): boolean {
  if (OWN_STARS.has(pathname)) return false;
  return !NO_STARS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
