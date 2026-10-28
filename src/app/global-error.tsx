"use client"; // エラーの画面はクライアントコンポーネントでないといけない

import "./globals.css";
import { SorryScreen } from "@/components/layout/SorryScreen";
import { OFF_WHITE } from "@/lib/home/palette";

/**
 * 一番外のレイアウトごと読み込めなかったときの画面。レイアウトの代わりになるので html と body から書く
 */
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="ja" className="h-full">
      <body className="flex min-h-full flex-col antialiased">
        <SorryScreen
          title="うまく読み込めませんでした"
          note="通信が不安定か、サーバーが混み合っているかもしれません。少し待ってから、もう一度読み込んでください。"
        >
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-full px-6 py-2 text-sm font-bold"
            style={{ background: OFF_WHITE, color: "#0E0E10" }}
          >
            もう一度読み込む
          </button>
        </SorryScreen>
      </body>
    </html>
  );
}
