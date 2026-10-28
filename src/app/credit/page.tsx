import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/PageTitle";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { GRAY, OFF_WHITE } from "@/lib/home/palette";
import { TILE_CREDIT } from "@/lib/map/tiles";

export const metadata: Metadata = {
  title: "クレジット | 高専祭2026",
};

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-bold tracking-widest" style={{ color: GRAY }}>
        {heading}
      </h2>
      {children}
    </section>
  );
}

export default function Credit() {
  return (
    <div style={{ color: OFF_WHITE }}>
      <SideMenu />
      <PageTitle>クレジット</PageTitle>
      <div className="mx-auto flex max-w-md flex-col gap-10 px-6 pb-16">
        <Section heading="サイトの企画・デザイン・開発">
          <p className="text-xl font-bold">
            <span className="mr-2 text-sm font-normal" style={{ color: GRAY }}>
              専攻科1年
            </span>
            山田 優吾
          </p>
          <p className="text-sm leading-relaxed" style={{ color: GRAY }}>
            バイトとかお仕事、絶賛募集中です！Web
            サイトづくりなど、なんでも気軽に声かけてください〜
          </p>
          <a
            href="mailto:yugomegane@gmail.com"
            className="flex w-fit items-center gap-2 text-sm underline underline-offset-4"
          >
            <Mail size={16} aria-hidden />
            yugomegane@gmail.com
          </a>
        </Section>

        {/* 地図のデータは、それぞれの利用条件により出典を出す */}
        <Section heading="地図のデータ">
          <ul className="flex flex-col gap-2 text-sm leading-relaxed">
            <li>
              建物の形：国土交通省「3D都市モデル（Project
              PLATEAU）北九州市（2020年度）」（
              <a
                href="https://creativecommons.org/licenses/by/4.0/deed.ja"
                className="underline underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
              ）を加工して作成
            </li>
            <li>航空写真：{TILE_CREDIT.replace("出典：", "")}</li>
          </ul>
        </Section>

        <p className="text-xs" style={{ color: GRAY }}>
          © 2026 KCT Festival Committee
        </p>
      </div>
    </div>
  );
}
