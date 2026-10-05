// 管理画面の振り分け。Cookie の有無だけを見る。
// 権限の判断はバックエンドが行う(proxy で重い認可をしないのは Next.js の推奨どおり)
import { type NextRequest, NextResponse } from "next/server";
import { needsLogin } from "@/lib/manage/proxy-rules";
import { TOKEN_COOKIE } from "@/lib/manage/session";

export function proxy(request: NextRequest) {
  const hasToken = request.cookies.has(TOKEN_COOKIE);
  if (needsLogin(request.nextUrl.pathname, hasToken)) {
    return NextResponse.redirect(new URL("/manage/login", request.url));
  }
  const res = NextResponse.next();
  // ログアウト後に戻るボタンで管理画面が見えないよう、ブラウザに保存させない
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: "/manage/:path*",
};
