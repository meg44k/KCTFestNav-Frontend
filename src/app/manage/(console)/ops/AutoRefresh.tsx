"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";

const INTERVAL_MS = 60_000;

// 入力中やダイアログを開いているときは、勝手に描き直さない
function isBusy(): boolean {
  const el = document.activeElement;
  const typing =
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  const dialogOpen = document.querySelector('[role="dialog"]') !== null;
  return typing || dialogOpen;
}

/** 当日運営の画面を 60 秒ごとに最新にする */
export function AutoRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isBusy()) start(() => router.refresh());
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm">
      <span>60秒ごとに自動で最新にします</span>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => start(() => router.refresh())}
      >
        {pending ? "更新中…" : "今すぐ更新"}
      </Button>
    </div>
  );
}
