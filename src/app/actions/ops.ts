"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LiveResponse } from "@/lib/api/lives";
import {
  failureMessage,
  type ManageFailure,
  manageRequest,
} from "@/lib/api/manage";
import { parseLiveForm } from "@/lib/manage/ops";

export type LiveFormState = { error?: string; done?: boolean } | undefined;
export type AnnouncementState = { error?: string; saved?: boolean } | undefined;

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
  revalidatePath(OPS);
  return {};
}

const patchLiveStatus = (id: number, status: number) =>
  manageRequest(`/manage/lives/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export async function setLiveStatus(
  liveId: number,
  status: number,
): Promise<{ error?: string }> {
  if (!isLevel(status)) return { error: "状態を選び直してください" };

  if (status === 1) {
    // 公演中は 1 つだけにする(来場者画面の「今のライブ」は 1 件しか出ないため)
    const lives = await manageRequest<{ lives: LiveResponse[] }>("/lives");
    if (!lives.ok) return { error: failed(lives.reason) };
    for (const other of lives.data.lives) {
      if (other.id === liveId || other.status !== 1) continue;
      const res = await patchLiveStatus(other.id, 2);
      if (!res.ok) {
        return {
          error: `「${other.name}」を終了にできませんでした。${failed(res.reason)}`,
        };
      }
    }
  }

  const res = await patchLiveStatus(liveId, status);
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath(OPS);
  return {};
}

export async function saveLive(
  current: LiveResponse | undefined,
  _prev: LiveFormState,
  formData: FormData,
): Promise<LiveFormState> {
  const parsed = parseLiveForm(formData, current);
  if (!parsed.ok) return { error: parsed.error };
  const res = await manageRequest(
    current ? `/manage/lives/${current.id}` : "/manage/lives",
    { method: current ? "PUT" : "POST", body: JSON.stringify(parsed.payload) },
  );
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath(OPS);
  return { done: true };
}

export async function deleteLive(id: number): Promise<{ error?: string }> {
  const res = await manageRequest(`/manage/lives/${id}`, { method: "DELETE" });
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath(OPS);
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
  revalidatePath(OPS);
  return { saved: true };
}
