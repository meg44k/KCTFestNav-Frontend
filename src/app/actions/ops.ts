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

// 当日運営の 3 ページ(混雑度・ライブ・お知らせ)をまとめて更新する
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

const patchLiveStatus = (id: number, status: number) =>
  manageRequest(`/manage/lives/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

const LIVE_GONE = "このライブは削除されています。画面を更新してください。";

export async function setLiveStatus(
  liveId: number,
  status: number,
): Promise<{ error?: string }> {
  if (!isLevel(status)) return { error: "状態を選び直してください" };

  // 画面が古くて削除済みのライブを選んでいることがあるので、今の一覧で確かめる
  const lives = await manageRequest<{ lives: LiveResponse[] }>("/lives");
  if (!lives.ok) return { error: failed(lives.reason) };
  const target = lives.data.lives.find((l) => l.id === liveId);
  if (!target) return { error: LIVE_GONE };

  // 公演中は 1 つだけにする(来場者画面の「今のライブ」は 1 件しか出ないため)
  const ended: string[] = [];
  if (status === 1) {
    for (const other of lives.data.lives) {
      if (other.id === liveId || other.status !== 1) continue;
      const res = await patchLiveStatus(other.id, 2);
      if (!res.ok) {
        if (ended.length) revalidatePath(OPS, "layout");
        return {
          error: `「${other.name}」を終了にできませんでした。${failed(res.reason)}`,
        };
      }
      ended.push(other.name);
    }
  }

  const res = await patchLiveStatus(liveId, status);
  if (!res.ok) {
    if (!ended.length) return { error: failed(res.reason) };
    // ここまでに変えたものは戻さない。何が変わったかを伝え、画面も最新にする
    revalidatePath(OPS, "layout");
    const names = ended.map((n) => `「${n}」`).join("、");
    return {
      error: `${names}は終了にしましたが、「${target.name}」を公演中にできませんでした。${failed(res.reason)}`,
    };
  }
  revalidatePath(OPS, "layout");
  return {};
}

/**
 * ライブを保存する。編集では、開いている間に学生会が状態を切り替えていても戻さないよう、
 * 状態は保存の直前に取り直した値を使う。クライアントから受け取るのは ID だけ
 */
export async function saveLive(
  current: LiveResponse | undefined,
  _prev: LiveFormState,
  formData: FormData,
): Promise<LiveFormState> {
  let latest: LiveResponse | undefined;
  if (current) {
    const res = await manageRequest<LiveResponse>(`/lives/${current.id}`);
    if (!res.ok) {
      return {
        error: res.reason === "rejected" ? LIVE_GONE : failed(res.reason),
      };
    }
    latest = res.data;
  }

  const parsed = parseLiveForm(formData, latest);
  if (!parsed.ok) return { error: parsed.error };
  const res = await manageRequest(
    latest ? `/manage/lives/${latest.id}` : "/manage/lives",
    { method: latest ? "PUT" : "POST", body: JSON.stringify(parsed.payload) },
  );
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath(OPS, "layout");
  return { done: true };
}

export async function deleteLive(id: number): Promise<{ error?: string }> {
  const res = await manageRequest(`/manage/lives/${id}`, { method: "DELETE" });
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
