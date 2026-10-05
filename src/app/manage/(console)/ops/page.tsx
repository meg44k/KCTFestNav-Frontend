import { redirect } from "next/navigation";

// 当日運営は 3 つのページに分けた。/manage/ops は混雑度を開く
export default function OpsPage() {
  redirect("/manage/ops/congestion");
}
