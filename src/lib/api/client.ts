// KCTFestNav-Backend への fetch を薄くまとめたもの。
//
// 注意: 開発サーバは --experimental-https で HTTPS で動いているため、
// ブラウザ(Client Component)から http:// のAPIを直接叩くと mixed content
// として遮断される。Server Component / Server Action から呼ぶか、
// API 側も HTTPS で配信する必要がある。
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:1323";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(
      res.status,
      `${init?.method ?? "GET"} ${path} が失敗しました (${res.status})`,
    );
  }

  return (await res.json()) as T;
}
