"use client"; // エラーの画面はクライアントコンポーネントでないといけない

import Link from "next/link";
import { useEffect } from "react";
import { SorryScreen } from "@/components/layout/SorryScreen";
import { OFF_WHITE } from "@/lib/home/palette";

/**
 * ページを読み込めなかったとき(バックエンドにつながらないなど)に、Next.js の素のエラー画面の代わりに出す
 */
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
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
      <Link href="/main" className="text-sm underline underline-offset-4">
        トップへ戻る
      </Link>
    </SorryScreen>
  );
}
