/** 来場者向けページの見出し。上に余白をとって、ページ間でそろえる */
export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="flex justify-center px-4 pt-10 pb-5 font-extrabold text-4xl">
      {children}
    </h1>
  );
}
