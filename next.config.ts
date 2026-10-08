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

export default nextConfig;
