import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FestivalTitle } from "@/components/home/FestivalTitle";
import { IntroRedirect } from "@/components/home/IntroRedirect";
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
      <FestivalTitle />
      <IntroRedirect to="/main" afterMs={1000} />
    </Link>
  );
}
