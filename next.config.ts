import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // タイトル画面から入口ページへ移るときのアニメーションに使う
    viewTransition: true,
    // 写真のアップロード(1 枚 2MB まで + multipart の分)。既定は 1MB
    serverActions: { bodySizeLimit: "3mb" },
  },
  // 開発では写真をバックエンド(http)に置くが、開発のフロントは https なので、ここを通して配る
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:1323";
    return [
      { source: "/dev-images/:path*", destination: `${api}/images/:path*` },
    ];
  },
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS
    ? process.env.ALLOWED_DEV_ORIGINS?.split(",")
    : [""],
};

// BotID(いいねのボット対策)のスクリプトを自分のドメイン経由で読む
export default withBotId(nextConfig);
