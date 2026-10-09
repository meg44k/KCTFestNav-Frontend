# クラス展示のいいね(人気投票) 設計

- 作成日: 2026-10-09
- 対象リポジトリ: KCTFestNav-Backend(表・API・回数の上限・管理用の集計)、KCTFestNav-Frontend(ハート・自分のいいね・管理画面)
- 期限: 高専祭(2026-10-31〜11-01)の 1 週間前、10/24 まで

## 1. 目的

来場者がクラス展示に「いいね」を押せるようにし、その数を人気投票・表彰に使う。
来場者はログインしないので、1 台の端末から同じブースへは 1 回だけ数え、
大量に押された怪しい票は学生会が後から見つけて取り消せるようにする。

成功の基準:
- 来場者がクラス展示のカード・詳細・地図のカードで ♡ を押すと ♥ になり、もう一度押すと取り消せる。ページを開き直しても自分が押したものは ♥ のまま
- 来場者には数を見せない
- 管理者と学生会が、管理画面でブースごとの数と順位、10 分ごとの推移を見られる
- 急に増えたブースに ⚠ が出て、学生会がその時間帯のいいねを取り消せる

## 2. 決定事項(本人と合意済み 2026-10-09)

- 目的は人気投票・表彰
- 対象はクラス展示だけ(主催者が `1-1` のようなクラス表記で、学年 1〜5。フロントの `parseGrade` と同じ決まり)。クラブバザー・ステージは対象外
- どのブースにも 1 回ずつ押せる。取り消せる
- 不正対策は「端末ごとに 1 回」。サーバーが署名した番号(投票者 ID)を cookie に入れる
- 来場者には数を見せない(自分が押したかだけ)
- 数・順位・推移を見られるのは管理者(Admin)と学生会(Gakuseikai)だけ。企画担当(Student)は自分のブースの数も見られない
- いつでも押せる(受付の開始・終了は作らない)。文化祭の前の試しの票は、管理者が「全部消す」で消す
- **IP は使わない**(来場者のほとんどが高専の Wi-Fi で同じ IP になるため、判断にも回数の上限にも使えない)
- 怪しい票は自動で消さず、⚠ を出して学生会が判断し、時間帯を指定して取り消す

## 3. しくみ

```
ブラウザ ──(Server Action)──▶ Next.js のサーバー ──(合言葉 + 投票者の番号)──▶ Go の API ──▶ MySQL / Redis
          cookie: kct-voter                       X-Internal-Key / X-Voter
```

- 投票まわりの API は **Next.js のサーバーからしか呼べない**。両方だけが知る合言葉 `INTERNAL_API_KEY` をヘッダー `X-Internal-Key` に付ける(Cloud Run の URL は誰でも開けるため、直接たたいて番号を作り放題にされるのを防ぐ)
- 投票者の番号はバックエンドが作り、`VOTER_SECRET`(バックエンドだけが知る)で署名する。形は `<UUID>.<署名>`。バックエンドは署名が正しい番号だけを受け付ける
- Next.js のサーバーは番号を cookie `kct-voter` に入れる(`httpOnly`・`secure`・`sameSite=lax`・`path=/`・期限 90 日)。JavaScript からは読めない
- 番号を作る数は、サーバー全体で **1 分に 3,000 個まで**(2026-10-09 本人と合意。来場者を巻き添えにしないよう緩め、不正は BotID で入口で止める)(Redis で数える)。超えたら 429 を返し、来場者には「混み合っています。少し待ってからもう一度押してください」
- 同じ番号でのいいねの切り替えは **1 分に 60 回まで**(Redis)。超えたら 429

## 4. バックエンド

### 4.1 表

```sql
CREATE TABLE likes(
  booth_id INT NOT NULL,
  voter_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (booth_id, voter_id),
  INDEX (booth_id, created_at),
  FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE CASCADE
);

-- 取り消しの記録(誰が・どのブースの・いつからいつまでを・何件)
CREATE TABLE like_removals(
  id INT AUTO_INCREMENT PRIMARY KEY,
  booth_id INT,                 -- NULL は「全部消す」
  from_at DATETIME,
  to_at DATETIME,
  removed INT NOT NULL,
  removed_by VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL
);
```

時刻は今までどおり UTC で保存し、画面に出すときに JST にする。

### 4.2 API

来場者用(`X-Internal-Key` が要る。無い・違うときは 401):

| メソッド | パス | 中身 |
|---|---|---|
| `POST` | `/internal/voters` | 新しい番号を作って返す `{ "voter": "<UUID>.<署名>" }`。上限を超えたら 429 |
| `GET` | `/internal/likes/mine` | `X-Voter` の番号が押したブースの ID の一覧 `{ "booth_ids": [3, 8] }`。番号が無い・不正なら空 |
| `PUT` | `/internal/likes/:boothId` | いいねする(既に押していても 204)。クラス展示でないブースは 400、無いブースは 404 |
| `DELETE` | `/internal/likes/:boothId` | 取り消す(押していなくても 204) |

`PUT` と `DELETE` は `X-Voter` が要る(無い・署名が違うときは 401)。

管理用(JWT。Admin と Gakuseikai):

| メソッド | パス | 中身 |
|---|---|---|
| `GET` | `/manage/likes` | ブースごとの数(多い順)と、10 分ごとの推移、⚠ の有無 |
| `DELETE` | `/manage/likes/:boothId?from=…&to=…` | そのブースの、その時間帯(UTC の RFC 3339)のいいねを消す。消した件数を返し、記録に残す |
| `DELETE` | `/manage/likes` | 全部消す(**Admin だけ**)。記録に残す |

### 4.3 ⚠ の決まり

- ブースごとに、いいねを 10 分ごとに数える
- ある 10 分の数が **30 件以上** で、かつそのブースの 10 分ごとの数の中央値(0 の時間帯は除く)の **5 倍以上** のとき、その 10 分に ⚠
- 純粋な関数にしてテストする

### 4.4 設定

- 新しい環境変数: `INTERNAL_API_KEY`(Vercel と Cloud Run の両方)、`VOTER_SECRET`(Cloud Run だけ)
- どちらも Terraform が作って Secret Manager に入れる(`random_password`)。Vercel には `INTERNAL_API_KEY` を手で入れる(Production だけ。`NEXT_PUBLIC_` を付けない)

## 5. フロント

### 5.1 来場者

- クラス展示のカード(`BoothCard`)・詳細ダイアログ・地図の下のカードに ♡ ボタン。クラブバザーには出さない
- 押した瞬間に ♥(赤)に変え、Server Action を呼ぶ。失敗したら ♡ に戻し、短いメッセージを出す
- Server Action `toggleLike(boothId, on)`:
  - cookie `kct-voter` が無ければ `POST /internal/voters` で番号をもらって cookie に入れる
  - `PUT` または `DELETE /internal/likes/:boothId` を合言葉と番号を付けて呼ぶ
- 一覧のページは 60 秒ごとに作り直していて全員で同じ HTML なので、自分が押したものはページを開いたあと Server Action `myLikes()` で問い合わせて ♥ にする(番号が無ければ問い合わせない)
- ボタンは `aria-pressed` と「いいね」「いいねを取り消す」のラベルを持つ

### 5.2 管理画面

- 学生会の運営(`/manage/ops`)に「いいね」を足す。管理者と学生会だけ
- 表: 順位・ブース名・企画・いいね・⚠。混雑度の監視と同じく 30 秒ごとに自動で更新
- ブースを開くと 10 分ごとの棒グラフ(⚠ の時間帯は色を変える)と、時間帯を選んで「この時間帯のいいねを取り消す」(確認を出す)
- 管理者だけ「全部消す」(確認を出す。文化祭の前の試しの票を消す用)

## 6. テスト

- バックエンド:
  - 番号の署名と検証(正しい・書き換えた・形が違う)
  - 合言葉が無い・違うと 401
  - クラス展示以外は 400、同じ番号で 2 回押しても 1 件、取り消し
  - 番号を作る上限(1 分に 300 個)と切り替えの上限(1 分に 60 回)
  - ⚠ の決まり(中央値の 5 倍・30 件以上・0 の時間帯を除く)
  - 管理用の権限(Student・Member は 403、全部消すは Admin だけ)、時間帯の取り消しと記録
- フロント:
  - Server Action(cookie が無いときに番号をもらう・あるときは使う・失敗を返す)
  - ハートの見た目の切り替え(押した瞬間・失敗で戻る)
  - 管理画面の表と時間帯の選び方
- 実機: Playwright(390px)で押す・開き直しても ♥・取り消す、管理画面で数・推移・取り消し

## 7. 進め方

1. バックエンド: 表・番号・API・上限・⚠・管理用 API・Terraform(秘密の値 2 つ)→ PR
2. フロント: Server Action・ハート・自分のいいね・管理画面 → PR
3. 本番: マイグレーションを流す・Terraform で秘密の値・Vercel に `INTERNAL_API_KEY` → develop を main へ
