import { redirect } from "next/navigation";

// 自分のブースは混雑度とブースの説明に分けた。/manage/my-booth は混雑度を開く
export default function MyBoothPage() {
  redirect("/manage/my-booth/congestion");
}
