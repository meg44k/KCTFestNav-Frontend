"use client";

import { useState, useTransition } from "react";
import { resetPassword } from "@/app/actions/manage-accounts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { IssuedAccount } from "@/lib/manage/accounts";
import { IssuedTable } from "./IssuedTable";

export function ResetPasswordButton({
  userId,
  loginId,
  label,
}: {
  userId: string;
  loginId: string;
  /** 発行結果の表に出す名前(担当ブース名など) */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [issued, setIssued] = useState<IssuedAccount>();
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setError(undefined);
        setIssued(undefined);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        パスワード再発行
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>{loginId} のパスワードを再発行しますか？</DialogTitle>
        {issued ? (
          <IssuedTable rows={[issued]} />
        ) : (
          <>
            <DialogDescription className="font-bold text-[#e54141]">
              今のパスワードは使えなくなります。
            </DialogDescription>
            {error && (
              <p role="alert" className="text-[#e54141]">
                {error}
              </p>
            )}
            <Button
              disabled={pending}
              className="h-12 font-bold"
              onClick={() =>
                start(async () => {
                  const res = await resetPassword(userId);
                  if (res.error || !res.loginId || !res.password) {
                    setError(res.error);
                  } else {
                    setIssued({
                      boothName: label,
                      loginId: res.loginId,
                      password: res.password,
                    });
                  }
                })
              }
            >
              {pending ? "再発行中…" : "再発行する"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
