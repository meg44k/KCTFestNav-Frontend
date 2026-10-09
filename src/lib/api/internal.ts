// いいねの API を呼ぶ。Next.js のサーバーだけが知る合言葉(X-Internal-Key)を付ける。
// 合言葉はサーバーの環境変数で、ブラウザには出さない(NEXT_PUBLIC_ を付けない)
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "./client";

/** 投票者番号を入れる cookie */
export const VOTER_COOKIE = "kct-voter";
/** cookie の期限(90 日) */
export const VOTER_MAX_AGE = 60 * 60 * 24 * 90;
export const TOO_MANY =
  "混み合っています。少し待ってからもう一度押してください";
export const FAILED = "いいねできませんでした。もう一度押してください";

/** 応答の状態。つながらない・合言葉が無いときは 0 */
export async function internalRequest(
  path: string,
  init: RequestInit & { voter?: string } = {},
): Promise<{ status: number; body?: unknown }> {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) return { status: 0 };
  const { voter, ...rest } = init;
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...rest,
      headers: {
        "X-Internal-Key": key,
        ...(voter ? { "X-Voter": voter } : {}),
      },
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  } catch (e) {
    console.error(`${init.method ?? "GET"} ${path} に接続できませんでした`, e);
    return { status: 0 };
  }
}
