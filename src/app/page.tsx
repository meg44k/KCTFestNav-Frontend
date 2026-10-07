import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IntroRedirect } from "@/components/home/IntroRedirect";
import { eventYear } from "@/lib/constants";
import { INTRO_COOKIE, introSeen } from "@/lib/intro";

export default async function Home() {
  // 一度見た人にはタイトルを出さず、すぐ入口へ(画面をちらつかせない)
  if (introSeen((await cookies()).get(INTRO_COOKIE)?.value)) redirect("/main");
  return (
    // JavaScript が動かなくても、押せば移れる
    <Link
      href="/main"
      replace
      className="flex h-dvh flex-col items-center justify-center text-center"
    >
      <div>{eventYear} 北九州高専</div>
      <div className="text-5xl">高専祭</div>
      <IntroRedirect to="/main" afterMs={2000} />
    </Link>
  );
}
