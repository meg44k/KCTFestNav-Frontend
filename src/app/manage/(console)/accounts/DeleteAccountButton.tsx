"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/manage-accounts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** アカウントを削除する。担当者なら、ブースの担当がいなくなることも伝える */
export function DeleteAccountButton({
  userId,
  loginId,
  label,
  boothName,
}: {
  userId: string;
  loginId: string;
  /** 確認に出す名前 */
  label: string;
  /** 担当者のときの担当ブース */
  boothName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setError(undefined);
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="border-[#e54141] text-[#e54141] hover:bg-[#e54141]/10"
          />
        }
      >
        削除
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>アカウントを削除しますか？</DialogTitle>
        <DialogDescription render={<div />} className="flex flex-col gap-2">
          <p>
            {label}({loginId})を削除します。
            <b className="text-[#e54141]">元には戻せません。</b>
          </p>
          {boothName && (
            <p>
              「{boothName}
              」の担当がいなくなります。必要なら「まとめて発行」で作り直してください。
            </p>
          )}
        </DialogDescription>
        {error && (
          <p role="alert" className="text-[#e54141]">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <DialogClose render={<Button variant="outline" className="h-12" />}>
            やめる
          </DialogClose>
          <Button
            disabled={pending}
            className="h-12 bg-[#e54141] font-bold text-white hover:bg-[#e54141]/90"
            onClick={() =>
              start(async () => {
                const res = await deleteAccount(userId);
                if (res.error) setError(res.error);
                else setOpen(false);
              })
            }
          >
            {pending ? "削除中…" : "削除する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
