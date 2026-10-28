import Image from "next/image";
import { BG, GRAY, OFF_WHITE } from "@/lib/home/palette";

/**
 * メンテナンス中・読み込めなかったときに、ページの代わりに出す画面。
 * ロゴの下に見出しと説明を出し、children(ボタンなど)をその下に置く
 */
export function SorryScreen({
  title,
  children,
  note,
}: {
  title: string;
  /** 見出しの下の説明 */
  note: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center"
      // 高さは親(帯の下の枠)の残りいっぱい。画面いっぱいにすると帯の分だけはみ出す
      style={{ background: BG, color: OFF_WHITE }}
    >
      <Image
        src="/catchcopy-offwhite.png"
        alt="ST@R G4ZER"
        width={992}
        height={528}
        className="h-auto w-48 opacity-80"
      />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-sm text-sm leading-relaxed" style={{ color: GRAY }}>
        {note}
      </p>
      {children}
    </main>
  );
}
