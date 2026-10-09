"use server";

import { redirect } from "next/navigation";
import { manageRequest } from "@/lib/api/manage";

/**
 * ブース・出演者の写真をバックエンドに上げる。formData は file(ブラウザで正方形に縮めたもの)と
 * target(booth:<ID> / performer:<ID>)。返った URL はフォームの保存で使う
 */
export async function uploadImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const file = formData.get("file");
  const target = String(formData.get("target") ?? "");
  if (!(file instanceof Blob) || file.size === 0) {
    return { error: "写真を選んでください" };
  }
  if (!/^(booth|performer):[1-9]\d*$/.test(target)) {
    return { error: "アップロードできませんでした。もう一度お試しください" };
  }

  const res = await manageRequest<{ url: string }>("/manage/images", {
    method: "POST",
    body: formData,
  });
  if (res.ok) return { url: res.data.url };
  switch (res.reason) {
    case "unauthorized":
      redirect("/manage/logout");
      break;
    case "rejected":
      return {
        error: "この写真は使えません。JPEG・PNG・WebP の写真を選んでください",
      };
    case "forbidden":
      return { error: "この写真を変える権限がありません" };
  }
  return { error: "アップロードできませんでした。もう一度お試しください" };
}
