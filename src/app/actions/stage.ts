"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  failureMessage,
  type ManageFailure,
  manageRequest,
} from "@/lib/api/manage";
import type { StageBlockResponse } from "@/lib/api/stage";

// 当日運営の画面(ライブ・番組表の編集)をまとめて更新する
const OPS = "/manage/ops";

// 認証切れはログインし直し、それ以外は画面に出す文言にする
function failed(reason: ManageFailure, gone: string): string {
  if (reason === "unauthorized") redirect("/manage/logout");
  // 送る前に入力は確かめているので、断られるのはほぼ「消されていた」とき
  if (reason === "rejected") return gone;
  return failureMessage(reason);
}

const isId = (id: number) => Number.isInteger(id) && id > 0;

const BLOCK_GONE = "このブロックは削除されています。画面を更新してください。";

/** 演奏中を次の出演者へ進める / 1 つ戻す(学生会・管理者) */
export async function stepBlock(
  blockId: number,
  dir: "next" | "prev",
): Promise<{ error?: string; block?: StageBlockResponse }> {
  if (!isId(blockId) || (dir !== "next" && dir !== "prev")) {
    return { error: "画面を更新して、もう一度お試しください。" };
  }
  const res = await manageRequest<StageBlockResponse>(
    `/manage/stage/blocks/${blockId}/${dir}`,
    { method: "POST" },
  );
  if (!res.ok) return { error: failed(res.reason, BLOCK_GONE) };
  revalidatePath(OPS, "layout");
  return { block: res.data };
}
