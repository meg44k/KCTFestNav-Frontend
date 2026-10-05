"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  failureMessage,
  type ManageFailure,
  manageRequest,
} from "@/lib/api/manage";
import type { StageBlockResponse } from "@/lib/api/stage";
import {
  parseBlockForm,
  parsePerformerForm,
  parseSectionForm,
} from "@/lib/manage/stage-form";

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

export type StageFormState = { error?: string; done?: boolean } | undefined;

const ITEM_GONE =
  "見つかりませんでした。削除されている可能性があります。画面を更新してください。";

async function send(
  path: string,
  method: "POST" | "PUT",
  payload: unknown,
): Promise<StageFormState> {
  const res = await manageRequest(path, {
    method,
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { error: failed(res.reason, ITEM_GONE) };
  revalidatePath(OPS, "layout");
  return { done: true };
}

/** セクションの追加(sectionId なし)・編集 */
export async function saveSection(
  sectionId: number | undefined,
  _prev: StageFormState,
  formData: FormData,
): Promise<StageFormState> {
  const parsed = parseSectionForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return sectionId === undefined
    ? send("/manage/stage/sections", "POST", parsed.payload)
    : send(`/manage/stage/sections/${sectionId}`, "PUT", parsed.payload);
}

/** ブロックの追加(blockId なし、sectionId の下に)・編集 */
export async function saveBlock(
  sectionId: number,
  blockId: number | undefined,
  _prev: StageFormState,
  formData: FormData,
): Promise<StageFormState> {
  const parsed = parseBlockForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return blockId === undefined
    ? send(`/manage/stage/sections/${sectionId}/blocks`, "POST", parsed.payload)
    : send(`/manage/stage/blocks/${blockId}`, "PUT", parsed.payload);
}

/** 出演者の追加(performerId なし、blockId の最後に)・編集 */
export async function savePerformer(
  blockId: number,
  performerId: number | undefined,
  _prev: StageFormState,
  formData: FormData,
): Promise<StageFormState> {
  const parsed = parsePerformerForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  return performerId === undefined
    ? send(`/manage/stage/blocks/${blockId}/performers`, "POST", parsed.payload)
    : send(`/manage/stage/performers/${performerId}`, "PUT", parsed.payload);
}

const PATHS = {
  section: "sections",
  block: "blocks",
  performer: "performers",
} as const;
export type StageItemKind = keyof typeof PATHS;

export async function deleteStageItem(
  kind: StageItemKind,
  id: number,
): Promise<{ error?: string }> {
  if (!Object.hasOwn(PATHS, kind) || !isId(id)) {
    return { error: "画面を更新して、もう一度お試しください。" };
  }
  const res = await manageRequest(`/manage/stage/${PATHS[kind]}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) return { error: failed(res.reason, ITEM_GONE) };
  revalidatePath(OPS, "layout");
  return {};
}

/** 出演順を上下の出演者と入れ替える */
export async function movePerformer(
  id: number,
  direction: "up" | "down",
): Promise<{ error?: string }> {
  if (!isId(id) || (direction !== "up" && direction !== "down")) {
    return { error: "画面を更新して、もう一度お試しください。" };
  }
  const res = await manageRequest(`/manage/stage/performers/${id}/move`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  });
  if (!res.ok) return { error: failed(res.reason, ITEM_GONE) };
  revalidatePath(OPS, "layout");
  return {};
}
