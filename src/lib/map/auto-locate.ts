/**
 * 地図を開いたとき、自動で現在地を取りにいくか(現在地を出せると気づかない人が多いため)。
 * 「許可しない」を選んでいた人には、開くたびに「使えません」と出さないよう取りにいかない。
 * 許可の状態が分からない(Permissions API が無い)ブラウザでは取りにいく
 */
export function shouldAutoLocate(state: PermissionState | undefined): boolean {
  return state !== "denied";
}
