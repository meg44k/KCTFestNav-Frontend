"use server";

import { redirect } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";
import { failureMessage } from "@/lib/api/manage";
import { clearToken, saveToken } from "@/lib/manage/cookie";

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

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_id: loginId, password }),
      cache: "no-store",
    });
  } catch (e) {
    console.error("ログインAPIに接続できませんでした", e);
    return { error: failureMessage("unavailable"), loginId };
  }

  if (res.status === 401) {
    return { error: "ID かパスワードが違います", loginId };
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
