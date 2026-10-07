This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 本番

- Vercel(東京 `hnd1`)。本番のブランチは main。main 以外はビルドしない(`vercel.json` の `ignoreCommand`。プレビューが本番の API につながり、管理画面の操作が本番のデータに入るのを防ぐ)
- Vercel の画面で: リポジトリを取り込む → Settings → Git の Production Branch を `main` → 環境変数 `NEXT_PUBLIC_API_BASE_URL` に Cloud Run の URL(バックエンドの `terraform output -raw api_url`、`https://kctfestnav-api-....run.app`)を入れる(Production)。`api.kctfes.app` は Google がまだプレビューとしている機能なので通り道に使わない→ Domains に `kctfes.app` と `www.kctfes.app`(www は kctfes.app へ転送)
- DNS のレコードはバックエンドの `infra/`(Terraform)が作る。作り方は KCTFestNav-Backend の `infra/README.md`
- 負荷テスト(k6): `k6 run -e BASE_URL=https://kctfes.app scripts/loadtest.js`(同時 300 人・10 分。エラー 0・95% が 1 秒以内)
