/** 来場者向けページの見出し。画面に固定した 戻る・メニュー と同じ行に置き、ページ間でそろえる */
export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    // 左上の戻るボタンと右上のメニューに重ならないよう左右をあけ、狭い画面では文字を少し小さく
    <h1 className="mt-2 mb-5 flex min-h-10 items-center justify-center px-16 text-center font-extrabold text-[clamp(1.6rem,8vw,2.25rem)] leading-tight">
      {children}
    </h1>
  );
}
