"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "@/lib/api/client";
import { failureMessage } from "@/lib/api/manage";
import { isBot } from "@/lib/bot";
import { clearToken, saveToken } from "@/lib/manage/cookie";

// ログインの回数の上限を数える、ブラウザの番号
const LOGIN_CLIENT_COOKIE = "kct_login_client";

// 失敗したときは入力した ID を返し、フォームに残す(React はアクション後にフォームを空にするため)
export type LoginState = { error: string; loginId: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!loginId || !password) {
    return { error: "ID とパスワードを入力してください", loginId };
  }
  // パスワードの総当たりを入口で止める(ボットにはどちらが違ったかも教えない)
  if (await isBot()) {
    return {
      error: "ログインできませんでした。もう一度お試しください",
      loginId,
    };
  }

  // ログインはこのサーバーからだけ受け付けられる(合言葉が要る)。BotID をすり抜けた直接の呼び出しを断るため
  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    console.error(
      "INTERNAL_API_KEY が設定されていないため、ログインできません",
    );
    return { error: failureMessage("unavailable"), loginId };
  }
  // このブラウザの番号。バックエンドが回数の上限を数えるのに使う(失敗したブラウザだけが止まり、
  // 同じ Wi-Fi の本人は締め出されない)。まだ無ければ作って置いておく
  const jar = await cookies();
  let client = jar.get(LOGIN_CLIENT_COOKIE)?.value;
  if (!client) {
    client = randomUUID();
    jar.set(LOGIN_CLIENT_COOKIE, client, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/manage",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": key,
        "X-Login-Client": client,
      },
      body: JSON.stringify({ login_id: loginId, password }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    console.error("ログインAPIに接続できませんでした", e);
    return { error: failureMessage("unavailable"), loginId };
  }

  if (res.status === 401) {
    // あと何回試せるか(バックエンドが返すとき)
    const remaining = await res
      .json()
      .then((b: { remaining?: unknown }) => b.remaining)
      .catch(() => undefined);
    const left = typeof remaining === "number" ? `(あと ${remaining} 回)` : "";
    return { error: `ID かパスワードが違います${left}`, loginId };
  }
  // 続けて失敗した ID(または全体)は、バックエンドがしばらく止める
  if (res.status === 429) {
    return {
      error:
        "ログインに続けて失敗したため、しばらく止めています。10 分ほど待ってからもう一度お試しください",
      loginId,
    };
  }
  if (!res.ok) return { error: failureMessage("unavailable"), loginId };

  const { token } = (await res.json()) as { token: string };
  await saveToken(token);
  redirect("/manage");
}

export async function logoutAction(): Promise<void> {
  await clearToken();
  redirect("/manage/login");
}
