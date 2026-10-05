"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  failureMessage,
  type ManageFailure,
  manageRequest,
} from "@/lib/api/manage";

export type AnnouncementState = { error?: string; saved?: boolean } | undefined;

// 当日運営の画面(混雑度・お知らせなど)をまとめて更新する
const OPS = "/manage/ops";
const isLevel = (n: number) => [0, 1, 2].includes(n);

// 認証切れはログインし直し、それ以外は画面に出す文言にする
function failed(reason: ManageFailure): string {
  if (reason === "unauthorized") redirect("/manage/logout");
  return failureMessage(reason);
}

/** 学生会が担当者の代わりに混雑度を変える */
export async function setBoothCongestion(
  boothId: number,
  status: number,
): Promise<{ error?: string }> {
  if (!isLevel(status)) return { error: "混雑度を選び直してください" };
  const res = await manageRequest(`/manage/booths/${boothId}/congestion`, {
    method: "PATCH",
    body: JSON.stringify({ congestion_status: status }),
  });
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath(OPS, "layout");
  return {};
}

export async function saveAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "お知らせを入力してください" };
  const res = await manageRequest("/manage/announcements", {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath(OPS, "layout");
  return { saved: true };
}
