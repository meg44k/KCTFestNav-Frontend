// Server Component は Cookie を消せないため、401 を受けたらここへ redirect する
import { redirect } from "next/navigation";
import { clearToken } from "@/lib/manage/cookie";

export async function GET() {
  await clearToken();
  redirect("/manage/login");
}
