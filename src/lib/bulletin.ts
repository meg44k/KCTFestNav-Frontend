/** お知らせの帯を出すページか。タイトル画面(アニメーション)と管理画面には出さない */
export function showsBulletin(pathname: string): boolean {
  if (pathname === "/") return false;
  return !(pathname === "/manage" || pathname.startsWith("/manage/"));
}
