import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IntroRedirect } from "@/components/home/IntroRedirect";
import { LogoReveal } from "@/components/home/LogoReveal";
import { StarField } from "@/components/home/StarField";
import { REVEAL_END_MS } from "@/lib/home/logo-reveal";
import { BG } from "@/lib/home/palette";
import { INTRO_COOKIE, introSeen } from "@/lib/intro";

// アニメーションが終わってから、ロゴを少し見せて入口へ
const HOLD_MS = 500;

export default async function Home() {
  // 一度見た人にはタイトルを出さず、すぐ入口へ(画面をちらつかせない)
  if (introSeen((await cookies()).get(INTRO_COOKIE)?.value)) redirect("/main");
  return (
    // 押せばアニメーションを飛ばしてすぐ入口へ。JavaScript が動かなくても移れる
    <Link
      href="/main"
      replace
      aria-label="入口ページへ"
      className="relative isolate block h-dvh overflow-hidden"
      style={{ background: BG }}
    >
      <StarField />
      <LogoReveal />
      <IntroRedirect
        to="/main"
        afterMs={REVEAL_END_MS + HOLD_MS}
        reducedMotionMs={1000}
      />
    </Link>
  );
}
