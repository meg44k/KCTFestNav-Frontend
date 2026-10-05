"use client";

import { useState, useTransition } from "react";
import {
  type IssueResult,
  issueMissingAccounts,
} from "@/app/actions/manage-accounts";
import { Button } from "@/components/ui/button";
import { IssuedTable } from "./IssuedTable";

export function IssueAccounts({ missing }: { missing: number }) {
  const [result, setResult] = useState<IssueResult>();
  const [pending, start] = useTransition();
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <span>
          担当アカウントが未発行のブース <b className="text-2xl">{missing}</b>{" "}
          件
        </span>
        <Button
          disabled={pending || missing === 0}
          className="h-14 px-6 bg-white text-black hover:bg-white/90 font-bold"
          onClick={() =>
            start(async () => setResult(await issueMissingAccounts()))
          }
        >
          {pending ? "発行中…" : "まとめて発行"}
        </Button>
      </div>
      {result?.error && (
        <p role="alert" className="text-[#e54141]">
          {result.error}
        </p>
      )}
      {result && !result.error && (
        <IssuedTable rows={result.issued} failed={result.failed} />
      )}
    </section>
  );
}
