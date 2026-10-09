// 管理画面から KCTFestNav-Backend を呼ぶ。サーバー側(Server Component / Server Action)専用。
// ログイン Cookie の JWT を Authorization に付ける。
//
// redirect はここではしない。呼び出し側が try/catch で包むと NEXT_REDIRECT を
// 飲み込んでしまうため、失敗の種類を返して呼び出し側で判断する。
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ManageUser, Role } from "@/lib/manage/roles";
import { TOKEN_COOKIE } from "@/lib/manage/session";
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "./client";

export type ManageFailure =
  | "unauthorized"
  | "forbidden"
  | "rejected"
  | "conflict"
  | "unavailable";

export type ManageResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ManageFailure };

export function toFailure(status: number): ManageFailure {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 409) return "conflict";
  if (status >= 400 && status < 500) return "rejected";
  return "unavailable";
}

export async function manageRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<ManageResult<T>> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return { ok: false, reason: "unauthorized" };

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      // 管理画面は常に最新の値を見せる
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    console.error(`${init?.method ?? "GET"} ${path} に接続できませんでした`, e);
    return { ok: false, reason: "unavailable" };
  }

  if (!res.ok) return { ok: false, reason: toFailure(res.status) };
  // 作成・更新・削除の API は本文を返さない(201/200/204 で空)
  const text = await res.text();
  return { ok: true, data: (text ? JSON.parse(text) : undefined) as T };
}

/**
 * ログイン中のユーザー。アカウントが削除されていると、トークンが有効でも
 * バックエンドは 404 を返すため、期限切れと同じくログインし直してもらう
 */
export async function fetchMe(): Promise<ManageResult<ManageUser>> {
  const me = await manageRequest<ManageUser>("/auth/me");
  if (!me.ok && me.reason === "rejected") {
    return { ok: false, reason: "unauthorized" };
  }
  return me;
}

export function failureMessage(reason: ManageFailure): string {
  switch (reason) {
    case "unauthorized":
      return "ログインの有効期限が切れました。もう一度ログインしてください。";
    case "forbidden":
      return "この操作の権限がありません。";
    case "rejected":
      return "入力内容を確認してください。";
    case "conflict":
      return "同じものがすでにあります。";
    default:
      return "接続できませんでした。時間をおいて再度お試しください。";
  }
}

/**
 * ページの最初に呼ぶ。期限切れ・削除済みはログインし直し、
 * ロール外や接続できないときは画面に出す文言を返す
 */
export async function requireRole(
  allowed: Role[],
): Promise<{ ok: true; user: ManageUser } | { ok: false; message: string }> {
  const me = await fetchMe();
  if (!me.ok) {
    if (me.reason === "unauthorized") redirect("/manage/logout");
    return { ok: false, message: failureMessage(me.reason) };
  }
  if (!allowed.includes(me.data.role)) {
    return { ok: false, message: failureMessage("forbidden") };
  }
  return { ok: true, user: me.data };
}
