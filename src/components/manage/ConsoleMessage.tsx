/** 管理画面の中央に出す案内(準備中・権限なし・接続できない) */
export function ConsoleMessage({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 mt-16 px-4 text-center">
      <h1 className="font-extrabold text-3xl">{title}</h1>
      {children && <div className="text-gray-500">{children}</div>}
    </div>
  );
}
