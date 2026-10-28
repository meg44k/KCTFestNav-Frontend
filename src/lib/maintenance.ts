/** メンテナンス画面のパス */
export const MAINTENANCE_PATH = "/maintenance";

/**
 * 環境変数 MAINTENANCE_MODE でメンテナンス中か。1 か true のときだけ。
 * Vercel で値を変えて再デプロイすると切り替わる(バックエンドが止まっていても切り替えられるよう、フロントだけで決める)
 */
export function isMaintenanceOn(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true";
}

/** 管理画面のパスか(/manage と /manage/ の下。/management などは含まない) */
export const underManage = (p: string) =>
  p === "/manage" || p.startsWith("/manage/");

/**
 * メンテナンス中に、このページをメンテナンス画面に差し替えるか。
 * 管理画面は使えるままにする(混雑度やお知らせを直すため)。画像などのファイル(拡張子のあるもの)も差し替えない
 */
export function showsMaintenance(pathname: string): boolean {
  if (pathname === MAINTENANCE_PATH || underManage(pathname)) return false;
  const last = pathname.split("/").pop() ?? "";
  return !last.includes(".");
}
