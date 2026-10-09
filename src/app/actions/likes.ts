"use server";

import { checkBotId } from "botid/server";
import { cookies } from "next/headers";
import {
  FAILED,
  internalRequest,
  TOO_MANY,
  VOTER_COOKIE,
  VOTER_MAX_AGE,
} from "@/lib/api/internal";

/** 新しい投票者番号をもらって cookie に入れる。もらえなければ応答の状態を返す */
async function issueVoter(): Promise<string | number> {
  const res = await internalRequest("/internal/voters", { method: "POST" });
  const voter = (res.body as { voter?: string } | undefined)?.voter;
  if (res.status !== 201 || !voter) return res.status;
  (await cookies()).set(VOTER_COOKIE, voter, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: VOTER_MAX_AGE,
  });
  return voter;
}

/**
 * プログラムからの大量投票を入口で止める(Vercel BotID。`next dev` では常に人として通る)。
 * BotID 自体が失敗したとき(Vercel の外・一時的な障害)は止めない。いいねが全部押せなくなるより、
 * 後から管理画面で見つけて取り消すほうを選ぶ
 */
async function isBot(): Promise<boolean> {
  try {
    return (await checkBotId()).isBot;
  } catch (e) {
    console.error("BotID の判定に失敗しました。止めずに通します", e);
    return false;
  }
}

const errorOf = (status: number) => (status === 429 ? TOO_MANY : FAILED);

/** クラス展示にいいねする(on)・取り消す */
export async function toggleLike(
  boothId: number,
  on: boolean,
): Promise<{ error?: string }> {
  if (!Number.isInteger(boothId)) return { error: FAILED };
  if (await isBot()) return { error: FAILED };
  let voter: string | number | undefined = (await cookies()).get(
    VOTER_COOKIE,
  )?.value;
  // 番号の作り直しは 1 回だけ(秘密を変えたなどで古い番号が通らないとき)
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!voter) {
      voter = await issueVoter();
      if (typeof voter === "number") return { error: errorOf(voter) };
    }
    const res = await internalRequest(`/internal/likes/${boothId}`, {
      method: on ? "PUT" : "DELETE",
      voter,
    });
    if (res.status === 204) return {};
    if (res.status !== 401 || attempt === 1)
      return { error: errorOf(res.status) };
    voter = undefined;
  }
  return { error: FAILED };
}

/** 自分が押したクラス展示の ID。番号が無ければ問い合わせない */
export async function myLikes(): Promise<number[]> {
  const voter = (await cookies()).get(VOTER_COOKIE)?.value;
  if (!voter) return [];
  const res = await internalRequest("/internal/likes/mine", { voter });
  if (res.status !== 200) return [];
  return (res.body as { booth_ids?: number[] }).booth_ids ?? [];
}
