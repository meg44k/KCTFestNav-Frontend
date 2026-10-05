"use client";

import { Button } from "@/components/ui/button";
import { type IssuedAccount, toCsv } from "@/lib/manage/accounts";

function download(rows: IssuedAccount[]) {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const name = `accounts-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
  const url = URL.createObjectURL(
    new Blob([toCsv(rows)], { type: "text/csv" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 発行したパスワードの一覧。印刷時はこの表だけを出す(globals.css の .issued) */
export function IssuedTable({
  rows,
  failed = [],
}: {
  rows: IssuedAccount[];
  failed?: string[];
}) {
  return (
    <section className="issued flex flex-col gap-3 rounded-lg border border-[#FDCB6E] p-4 print:border-0 print:bg-white print:text-black">
      {rows.length > 0 && (
        <p className="font-bold text-[#FDCB6E] print:hidden">
          このパスワードはこの画面でしか見られません。印刷か CSV
          で保存してください。
        </p>
      )}
      {rows.length > 0 && (
        <table className="w-full text-left">
          <thead className="text-sm text-gray-400 print:text-black">
            <tr>
              <th className="py-1 pr-4">ブース</th>
              <th className="pr-4">ログインID</th>
              <th>パスワード</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.loginId}
                className="border-t border-white/10 print:border-black/20"
              >
                <td className="py-2 pr-4">{r.boothName}</td>
                <td className="pr-4 font-mono">{r.loginId}</td>
                <td className="font-mono text-lg">{r.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {failed.length > 0 && (
        <p className="text-[#e54141]">
          発行できなかったブース: {failed.join("、")}
          （もう一度「まとめて発行」を押すと再試行します）
        </p>
      )}
      {rows.length > 0 && (
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            // 黒地のページと白地のダイアログの両方で読めるよう、周りの文字色に合わせる
            className="bg-transparent text-current border-current"
            onClick={() => window.print()}
          >
            印刷
          </Button>
          <Button
            variant="outline"
            className="bg-transparent text-current border-current"
            onClick={() => download(rows)}
          >
            CSV を保存
          </Button>
        </div>
      )}
    </section>
  );
}
