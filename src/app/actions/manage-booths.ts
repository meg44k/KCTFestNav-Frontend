"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BoothResponse } from "@/lib/api/booths";
import { failureMessage, manageRequest } from "@/lib/api/manage";
import { parseBoothForm } from "@/lib/manage/booth-form";

export type ActionState = { error?: string; done?: boolean } | undefined;

export async function saveBooth(
  current: BoothResponse | undefined,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseBoothForm(formData, current);
  if (!parsed.ok) return { error: parsed.error };

  const res = await manageRequest(
    current ? `/manage/booths/${current.id}` : "/manage/booths",
    { method: current ? "PUT" : "POST", body: JSON.stringify(parsed.payload) },
  );
  if (!res.ok) {
    if (res.reason === "unauthorized") redirect("/manage/logout");
    return { error: failureMessage(res.reason) };
  }
  revalidatePath("/manage/booths");
  return { done: true };
}

export async function deleteBooth(id: number): Promise<{ error?: string }> {
  const res = await manageRequest(`/manage/booths/${id}`, { method: "DELETE" });
  if (!res.ok) {
    if (res.reason === "unauthorized") redirect("/manage/logout");
    return { error: failureMessage(res.reason) };
  }
  revalidatePath("/manage/booths");
  return {};
}

export type BoothMove = {
  id: number;
  latitude: number;
  longitude: number;
  floor: number;
};

/**
 * 地図でピンを動かしたブースの位置(緯度・経度・階)だけを保存する。
 * 開いてから時間がたっていても混雑度などを古い値で上書きしないよう、1 件ずつ最新の内容を読み直してから書き換える。
 * 途中で失敗したらそこで止め、何件保存できたかを返す
 */
export async function moveBooths(
  moves: BoothMove[],
): Promise<{ saved: number; error?: string }> {
  const ok = (m: BoothMove) =>
    Number.isInteger(m.id) &&
    Number.isFinite(m.latitude) &&
    Number.isFinite(m.longitude) &&
    Number.isInteger(m.floor) &&
    m.floor >= 0;
  if (!moves.every(ok))
    return { saved: 0, error: "位置の値が正しくありません" };

  let saved = 0;
  for (const m of moves) {
    const latest = await manageRequest<BoothResponse>(`/booths/${m.id}`);
    const res = latest.ok
      ? await manageRequest(`/manage/booths/${m.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: latest.data.name,
            organizer: latest.data.organizer,
            detail: latest.data.detail,
            location: latest.data.location,
            image_url: latest.data.image_url,
            congestion_status: latest.data.congestion_status,
            x: latest.data.x,
            y: latest.data.y,
            z: latest.data.z,
            latitude: m.latitude,
            longitude: m.longitude,
            floor: m.floor,
          }),
        })
      : latest;
    if (!res.ok) {
      if (res.reason === "unauthorized") redirect("/manage/logout");
      if (saved > 0) revalidatePath("/manage/booths");
      return { saved, error: failureMessage(res.reason) };
    }
    saved++;
  }
  revalidatePath("/manage/booths");
  return { saved };
}
