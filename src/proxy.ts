// メンテナンス画面への差し替えと、管理画面の振り分け。
// 管理画面は Cookie の有無だけを見る。権限の判断はバックエンドが行う(proxy で重い認可をしないのは Next.js の推奨どおり)
import { type NextRequest, NextResponse } from "next/server";
import {
  isMaintenanceOn,
  MAINTENANCE_PATH,
  showsMaintenance,
  underManage,
} from "@/lib/maintenance";
import { needsLogin } from "@/lib/manage/proxy-rules";
import { TOKEN_COOKIE } from "@/lib/manage/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const maintenance = isMaintenanceOn(process.env.MAINTENANCE_MODE);

  if (underManage(pathname)) return manage(request);
  if (pathname === MAINTENANCE_PATH && !maintenance) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (maintenance && showsMaintenance(pathname)) {
    // URL はそのままで中身だけ差し替える(戻ったとき元のページを開き直せるように)。
    // 一時的に止めていると検索エンジンに伝わるよう 503 で返す
    const res = NextResponse.rewrite(new URL(MAINTENANCE_PATH, request.url), {
      status: 503,
    });
    res.headers.set("Retry-After", "600");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  return NextResponse.next();
}

function manage(request: NextRequest) {
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
  // Next.js の静的ファイルと、拡張子のあるファイル(画像など)は通さない
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
