// 訪問者の数え方。ブラウザごとに番号を 1 つ持ち、その日にまだ知らせていなければ 1 回だけ知らせる
import { MAINTENANCE_PATH, underManage } from "@/lib/maintenance";

/** ブラウザに覚えておく番号 */
export const VISITOR_ID_KEY = "kct-visitor-id";
/** 最後に知らせた日(日本時間の 2006-01-02) */
export const VISIT_DAY_KEY = "kct-visit-day";

/** 日本時間の日付(バックエンドも日本時間で数える) */
export function jstDay(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60_000).toISOString().slice(0, 10);
}

/** 今日知らせるか。同じ日には 1 回だけ */
export function shouldReport(lastDay: string | null, today: string): boolean {
  return lastDay !== today;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 番号の形(crypto.randomUUID の小文字の UUID) */
export function isVisitorId(id: string): boolean {
  return UUID.test(id);
}

/** 数えるページか。来場者のページだけ(管理画面・メンテナンス画面は数えない) */
export function countsVisit(pathname: string): boolean {
  return !underManage(pathname) && pathname !== MAINTENANCE_PATH;
}
