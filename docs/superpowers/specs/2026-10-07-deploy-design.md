# 本番へのデプロイ 設計

- 作成日: 2026-10-07
- 対象リポジトリ: KCTFestNav-Backend(Dockerfile・設定・`infra/` の Terraform・GitHub Actions)、KCTFestNav-Frontend(Vercel の設定・手順)
- 期限: 高専祭(2026-10-31〜11-01)の 1 週間前、10/24 まで
- 写真の扱い(アップロード・置き場所の使い方)は別の設計にする。この設計では R2 のバケットと `img.kctfes.app` を用意するところまで

## 1. 目的

来場者が `https://kctfes.app` でサイトを開け、企画担当・学生会・管理者が本番の管理画面を使えるようにする。
来年の担当が同じ環境を作り直せて、文化祭のあとに消し忘れなく片付けられるようにする。

成功の基準:
- `https://kctfes.app` で入口・一覧・地図・ステージが見られ、管理画面でログインして混雑度を変えられる
- main に push すると、フロントもバックも人の手を介さずに本番に出る
- 来場者 1 日 5,000 人を見込んだ負荷テスト(同時 300 人)で落ちない
- `terraform destroy` で、ドメインと状態ファイル以外がすべて消える

## 2. 決定事項(本人と合意済み 2026-10-07)

- 要件定義の「Vercel + Cloud Run / Render」を元に、次の組み合わせにする

| 役割 | 使うもの | 場所 |
|---|---|---|
| フロント(Next.js 16) | Vercel(Hobby) | 東京 `hnd1` |
| バック(Go/Echo) | Cloud Run | `asia-northeast1` |
| MySQL | Cloud SQL for MySQL 8.4(いちばん小さい台) | `asia-northeast1` |
| Redis | Upstash(TLS) | 東京 |
| 写真 | Cloudflare R2 | — |
| ドメイン | `kctfes.app` をお名前.com で取った(2026-10-08) | — |
| DNS | Cloudflare(登録業者でネームサーバーを Cloudflare に向ける) | — |

- 費用の目安: 動かす 1 か月で 1,500〜2,000 円(ほぼ Cloud SQL)+ ドメイン(お名前.com、初年度 1 円。2 年目からは更新料がかかる)。予算アラートを月 3,000 円で作る
- IaC は Terraform。GCP と Cloudflare(DNS・R2)を書く。Vercel と Upstash は画面で設定し、手順を README に書く
- Terraform はバックエンドのリポジトリの `infra/` に置く。状態ファイルは GCS のバケットに置く
- 環境は本番だけ。確かめるのは手元の docker compose
- Vercel のプレビュー(PR ごとの試し用 URL)は切る。本番のバックエンドにつながり、管理画面の操作が本番のデータに入るため
- 本番に出るのは main に入ったもの。普段は develop にマージし、出したいときに develop を main にマージする
- `terraform apply` は本人のアカウントで、相談しながら行う

## 3. 全体の形

```
来場者のスマホ
   │  https://kctfes.app
   ▼
Vercel(Next.js) ── サーバー側から呼ぶ ──▶ https://api.kctfes.app
                                           Cloud Run(Go/Echo)
                                             ├─ Cloud SQL(MySQL 8.4)  Cloud SQL の Unix ソケットでつなぐ
                                             └─ Upstash Redis(TLS)
写真: https://img.kctfes.app ── Cloudflare R2
```

- ブラウザはバックエンドを直接呼ばない(Next.js のサーバー側が呼び、JWT は Next.js の cookie にある)。そのため CORS や、ほかのドメインへ cookie を渡す設定はいらない
- DNS: `kctfes.app` → Vercel、`api.kctfes.app` → Cloud Run(ドメインのひも付け)、`img.kctfes.app` → R2 のカスタムドメイン

## 4. バックエンドの手直し

- `Dockerfile` を足す(Go でビルドし、小さいイメージ(distroless)で動かす)
- 待ち受けのポートは環境変数 `PORT` を使い、無ければ今までどおり 1323
- DB へのつなぎ方: 環境変数 `DB_SOCKET`(Cloud SQL の Unix ソケットのパス)があればソケットで、無ければ今までどおり `DB_HOST:DB_PORT`
- DB へつなぐ数の上限: `SetMaxOpenConns` を環境変数 `DB_MAX_OPEN_CONNS` で決める(既定 5)。Cloud Run の台数の上限 × これ が Cloud SQL の上限を超えないようにする
- Redis: 環境変数 `REDIS_TLS=true` のとき TLS でつなぐ(Upstash で必要)
- 手元の開発(docker compose・`.env`)は今までどおり動く

## 5. Terraform(`KCTFestNav-Backend/infra/`)

GCP:
- 使う API を有効にする
- Artifact Registry(Docker イメージの置き場)
- Cloud SQL(MySQL 8.4、いちばん小さい台、自動バックアップ、DB `kctfestnav` とアプリ用ユーザー)
- Secret Manager の入れ物: `DB_PASS`・`JWT_SECRET`・`REDIS_PASSWORD`・`INIT_ADMIN_PASSWORD`。**値は Terraform に書かず、手で入れる**
- Cloud Run(最低 0 台・上限 5 台、Cloud SQL をつなぐ、秘密の値と環境変数を渡す、誰でも呼べる)と `api.kctfes.app` のひも付け
- Cloud Run 用のサービスアカウント(Cloud SQL と秘密の値を読むだけ)
- GitHub Actions 用: Workload Identity(鍵のファイルを使わない)と、デプロイだけできるサービスアカウント。KCTFestNav-Backend の main からだけ使える
- 予算アラート(月 3,000 円)

Cloudflare:
- DNS のレコード(`kctfes.app`・`api`・`img`)
- R2 のバケットと `img.kctfes.app` のカスタムドメイン

変数で変えられるようにするもの: プロジェクト ID、場所、Cloud Run の最低台数(当日だけ 1 にする)・上限台数、ドメイン

## 6. デプロイの流れ

- フロント: Vercel の本番のブランチを main にする。環境変数は `NEXT_PUBLIC_API_BASE_URL=https://api.kctfes.app` だけ
- バック: GitHub Actions(main への push)で `go test` → Docker イメージを作る → Artifact Registry → Cloud Run に新しいイメージを出す
- DB のスキーマの変更は今までどおり手で流す(`db/migrations/*.sql`)。手元から Cloud SQL Auth Proxy でつなぐ手順を README に書く

## 7. 最初のデータ

- 本番の DB は `db/schema.sql`(最新の形)で作る。今までの migrations は流さない
- 開発用の仮のデータ(`db/init/03-seed.sql`)は入れない。`db/seed/stage.sql`・`booth-locations.sql` は本物か確かめてから入れる
- 最初の管理者は `INIT_ADMIN_ID` / `INIT_ADMIN_PASSWORD`(Secret Manager)で作る
- ブースとステージは管理画面から入れる(一覧表があれば SQL にしてまとめて入れる)

## 8. 当日

### 8.1 見込むアクセス(去年の数が分からないため、本人と決めた前提)

- 来場者 1 日 5,000 人、全員がサイトを開く
- いちばん混む 1 時間に 2 割(1,000 人)が集まり、1 人 10 ページ見る → 1 時間に約 1 万ページ、平均で毎秒約 3 ページ
- 同時に開いている人は 100〜300 人
- 負荷テストの目標: **同時 300 人が 10 分間、入口・一覧・地図・ステージを回る**で、エラー 0・応答の 95% が 1 秒以内
- フロントは 60 秒ごとに作り直したものを返すので、バックエンドへの呼び出しは来場者の数ではなく「ページの種類 × 1 分に 1 回」で増える。重くなるのは主に Vercel
- Vercel の無料プランの上限(通信量 月 100GB、画像の変換 月 5,000 枚)に気をつける。写真は Vercel を通さず R2 から小さくして出す(写真の設計で決める)

### 8.2 当日の設定

- 10/31・11/1 の 2 日間は Cloud Run の最低台数を 1 にする(最初の 1 台が起きるまでの数秒の待ちを無くす)。変数を変えて `terraform apply`
- フロントのページは 60 秒ごとに作り直すので、来場者が増えてもバックエンドへの呼び出しは大きく増えない
- Upstash の無料枠は月 50 万回。超えたら使った分だけ払う
- 本番に出す前に負荷テストを 1 回(8.1 の目標)

## 9. 文化祭のあと

1. DB の中身を GCS に書き出す(来年の参考)
2. `terraform destroy`。ドメインと状態ファイルのバケットは Terraform の外に置いて残す

## 10. テスト

- バックエンド: `PORT`・`DB_SOCKET`・`DB_MAX_OPEN_CONNS`・`REDIS_TLS` の読み方(設定を作る関数を純粋にして go test)
- Docker: 手元で `docker build` → 手元の MySQL・Redis につないで `/booths` が返る
- Terraform: `terraform fmt -check`・`terraform validate`・`terraform plan` を本人と見る
- 本番: `https://kctfes.app` の各ページ、管理画面のログインと混雑度の変更、`api.kctfes.app` を直接開いて返ること、負荷テスト

## 11. 進め方

1. バック: Dockerfile・`PORT`・`DB_SOCKET`・つなぐ数・Redis の TLS → PR
2. infra: Terraform(GCP・Cloudflare)と GitHub Actions → PR(本人と `terraform apply`)
3. フロント: Vercel の設定・プレビューを切る・手順を README に
4. 本番の確認: 最初のデータ → 負荷テスト → QR コード
