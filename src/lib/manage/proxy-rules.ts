const PUBLIC_PATHS = new Set(["/manage/login", "/manage/logout"]);

/** ログイン Cookie が無いときにログイン画面へ飛ばすか。権限の判断はしない */
export function needsLogin(pathname: string, hasToken: boolean): boolean {
  return !hasToken && !PUBLIC_PATHS.has(pathname);
}
