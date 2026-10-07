/** 来場者向けページの見出し。上に余白をとって、ページ間でそろえる */
export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    // 左上の戻るボタンと右上のメニューに重ならないよう左右をあけ、狭い画面では文字を少し小さく
    <h1 className="flex justify-center px-16 pt-10 pb-5 text-center font-extrabold text-[clamp(1.6rem,8vw,2.25rem)]">
      {children}
    </h1>
  );
}
