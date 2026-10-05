"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BoothResponse } from "@/lib/api/booths";
import {
  failureMessage,
  type ManageFailure,
  manageRequest,
  requireRole,
} from "@/lib/api/manage";
import { parseDetailForm } from "@/lib/manage/booth-form";

export type DetailState = { error?: string; saved?: boolean } | undefined;

const NOT_FOUND = "担当ブースが見つかりません。管理者に連絡してください。";

// 認証切れはログインし直し、それ以外は画面に出す文言にする
function failed(reason: ManageFailure): string {
  if (reason === "unauthorized") redirect("/manage/logout");
  return failureMessage(reason);
}

/**
 * ログイン中の企画担当のブース。ページ(Server Component)から呼ぶ。
 * 担当ブースが未設定・削除済みなら管理者への連絡を促す
 */
export async function loadMyBooth(): Promise<
  { ok: true; booth: BoothResponse } | { ok: false; message: string }
> {
  const auth = await requireRole(["Student"]);
  if (!auth.ok) return auth;
  const boothId = auth.user.assigned_booth_id;
  if (!boothId) return { ok: false, message: NOT_FOUND };

  const booth = await manageRequest<BoothResponse>(`/booths/${boothId}`);
  if (!booth.ok) {
    return {
      ok: false,
      message: booth.reason === "rejected" ? NOT_FOUND : failed(booth.reason),
    };
  }
  return { ok: true, booth: booth.data };
}

export async function setCongestion(
  boothId: number,
  status: number,
): Promise<{ error?: string }> {
  if (![0, 1, 2].includes(status)) {
    return { error: "混雑度を選び直してください" };
  }
  // 担当ブース以外はバックエンドが 403 を返す
  const res = await manageRequest(`/manage/booths/${boothId}/congestion`, {
    method: "PATCH",
    body: JSON.stringify({ congestion_status: status }),
  });
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath("/manage/my-booth");
  return {};
}

export async function saveDetail(
  current: BoothResponse,
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const parsed = parseDetailForm(formData, current);
  if (!parsed.ok) return { error: parsed.error };
  const res = await manageRequest(`/manage/booths/${current.id}`, {
    method: "PUT",
    body: JSON.stringify(parsed.payload),
  });
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath("/manage/my-booth");
  return { saved: true };
}
