// ログイン Cookie の保存と削除。Server Action と Route Handler からだけ呼べる
import { cookies } from "next/headers";
import { TOKEN_COOKIE, TOKEN_MAX_AGE } from "./session";

export async function saveToken(token: string): Promise<void> {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/manage",
    maxAge: TOKEN_MAX_AGE,
  });
}

// delete() は path を指定できないため、同じ path で期限切れにして消す
export async function clearToken(): Promise<void> {
  (await cookies()).set(TOKEN_COOKIE, "", { path: "/manage", maxAge: 0 });
}
