// 管理画面から KCTFestNav-Backend を呼ぶ。サーバー側(Server Component / Server Action)専用。
// ログイン Cookie の JWT を Authorization に付ける。
//
// redirect はここではしない。呼び出し側が try/catch で包むと NEXT_REDIRECT を
// 飲み込んでしまうため、失敗の種類を返して呼び出し側で判断する。
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/manage/session";
import { API_BASE_URL } from "./client";

export type ManageFailure =
  | "unauthorized"
  | "forbidden"
  | "rejected"
  | "unavailable";

export type ManageResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ManageFailure };

export function toFailure(status: number): ManageFailure {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
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
  // 更新・削除の API は本文を返さない
  const data = res.status === 204 ? undefined : await res.json();
  return { ok: true, data: data as T };
}

export function failureMessage(reason: ManageFailure): string {
  switch (reason) {
    case "unauthorized":
      return "ログインの有効期限が切れました。もう一度ログインしてください。";
    case "forbidden":
      return "この操作の権限がありません。";
    case "rejected":
      return "入力内容を確認してください。";
    default:
      return "サーバーに接続できません。時間をおいて再度お試しください。";
  }
}
