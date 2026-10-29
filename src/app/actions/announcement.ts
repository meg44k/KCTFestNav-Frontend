"use server";

import { unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { announcementOrDefault } from "@/lib/live-schedule";

/** 帯に流すお知らせ。管理画面で変えたらすぐ出るよう毎回読み直し、読めないときは決まりの文 */
export async function currentAnnouncement(): Promise<string> {
  try {
    const { content } = await apiFetch<{ content: string }>("/announcements", {
      cache: "no-store",
    });
    return announcementOrDefault(content);
  } catch (e) {
    // ビルド時の「このページは毎回作る」などの Next.js の合図はエラーの形で来るので、受け止めずに返す
    unstable_rethrow(e);
    console.error("お知らせの取得に失敗しました", e);
    return announcementOrDefault(undefined);
  }
}
