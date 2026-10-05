"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BoothResponse } from "@/lib/api/booths";
import {
  failureMessage,
  type ManageFailure,
  manageRequest,
} from "@/lib/api/manage";
import {
  boothsWithoutAccount,
  generatePassword,
  type IssuedAccount,
  loginIdForBooth,
} from "@/lib/manage/accounts";
import type { ManageUser } from "@/lib/manage/roles";

export type IssueResult = {
  issued: IssuedAccount[];
  failed: string[];
  error?: string;
};
export type AddState = { error?: string; issued?: IssuedAccount } | undefined;

const newPassword = () => generatePassword((max) => randomInt(max));

// 認証切れはログインし直し、それ以外は画面に出す文言にする
function failed(reason: ManageFailure): string {
  if (reason === "unauthorized") redirect("/manage/logout");
  return failureMessage(reason);
}

export async function issueMissingAccounts(): Promise<IssueResult> {
  const booths = await manageRequest<{ booths: BoothResponse[] }>("/booths");
  if (!booths.ok)
    return { issued: [], failed: [], error: failed(booths.reason) };
  const users = await manageRequest<{ users: ManageUser[] }>("/manage/users");
  if (!users.ok) return { issued: [], failed: [], error: failed(users.reason) };

  const result: IssueResult = { issued: [], failed: [] };
  // 1件ずつ作る。途中で失敗しても残りは続け、失敗したブースを返す
  for (const booth of boothsWithoutAccount(
    booths.data.booths,
    users.data.users,
  )) {
    const loginId = loginIdForBooth(booth.id);
    const password = newPassword();
    const res = await manageRequest("/manage/users", {
      method: "POST",
      body: JSON.stringify({
        login_id: loginId,
        name: booth.organizer || booth.name,
        password,
        assigned_booth_id: booth.id,
        role: "Student",
      }),
    });
    if (res.ok) {
      result.issued.push({ boothName: booth.name, loginId, password });
    } else {
      if (res.reason === "unauthorized") redirect("/manage/logout");
      result.failed.push(booth.name);
    }
  }
  revalidatePath("/manage/accounts");
  return result;
}

export async function resetPassword(
  userId: string,
): Promise<{ loginId?: string; password?: string; error?: string }> {
  const user = await manageRequest<ManageUser>(`/manage/users/${userId}`);
  if (!user.ok) return { error: failed(user.reason) };

  const password = newPassword();
  const { name, login_id, assigned_booth_id, role } = user.data;
  const res = await manageRequest(`/manage/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ name, login_id, assigned_booth_id, role, password }),
  });
  if (!res.ok) return { error: failed(res.reason) };
  return { loginId: login_id, password };
}

// 担当(Student)はブースから発行するので、ここでは学生会と管理者だけを作る
const ADDABLE_ROLES = new Set(["Gakuseikai", "Admin"]);

export async function addAccount(
  _prev: AddState,
  formData: FormData,
): Promise<AddState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || loginId;
  const role = String(formData.get("role") ?? "");
  if (!loginId) return { error: "ログイン ID を入力してください" };
  if (!ADDABLE_ROLES.has(role)) return { error: "ロールを選んでください" };

  const password = newPassword();
  const res = await manageRequest("/manage/users", {
    method: "POST",
    body: JSON.stringify({
      login_id: loginId,
      name,
      password,
      assigned_booth_id: 0,
      role,
    }),
  });
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath("/manage/accounts");
  return { issued: { boothName: name, loginId, password } };
}
