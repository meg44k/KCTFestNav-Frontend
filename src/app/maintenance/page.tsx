import type { Metadata } from "next";
import { SorryScreen } from "@/components/layout/SorryScreen";

export const metadata: Metadata = {
  title: "メンテナンス中 | 高専祭2026",
  robots: { index: false },
};

/**
 * メンテナンス中に来場者のページの代わりに出す画面(proxy が差し替える)。
 * Vercel の環境変数 MAINTENANCE_MODE=1 で出し、MAINTENANCE_MESSAGE があれば説明の下に添える(ex. 14:00 ごろ再開予定)
 */
export default function MaintenancePage() {
  const message = process.env.MAINTENANCE_MESSAGE?.trim();
  return (
    <SorryScreen
      title="ただいまメンテナンス中です"
      note={
        <>
          ご不便をおかけしてすみません。しばらくしてから、もう一度開いてください。
          {message && (
            <>
              <br />
              <br />
              {message}
            </>
          )}
        </>
      }
    />
  );
}
