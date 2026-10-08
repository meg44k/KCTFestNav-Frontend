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
