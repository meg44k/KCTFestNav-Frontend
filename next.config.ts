import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // タイトル画面から入口ページへ移るときのアニメーションに使う
  experimental: { viewTransition: true },
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS
    ? process.env.ALLOWED_DEV_ORIGINS?.split(",")
    : [""],
};

// BotID(いいねのボット対策)のスクリプトを自分のドメイン経由で読む
export default withBotId(nextConfig);
