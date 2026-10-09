"use client";

import { useState, useTransition } from "react";
import { changeLoginId } from "@/app/actions/manage-accounts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** ログイン ID だけを変える。パスワードはそのまま */
export function ChangeLoginIdButton({
  userId,
  loginId,
}: {
  userId: string;
  loginId: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(loginId);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setValue(loginId);
        setError(undefined);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        編集
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>{loginId} のログイン ID を変える</DialogTitle>
        <DialogDescription>
          パスワードは変わりません。本人に新しいログイン ID を伝えてください。
        </DialogDescription>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await changeLoginId(userId, value);
              if (res.error) setError(res.error);
              else setOpen(false);
            });
          }}
        >
          <Label htmlFor={`login-${userId}`}>新しいログイン ID</Label>
          <Input
            id={`login-${userId}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            className="font-mono"
          />
          {error && (
            <p role="alert" className="text-[#e54141]">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={
              pending || value.trim() === "" || value.trim() === loginId
            }
            className="h-12 font-bold"
          >
            {pending ? "変更中…" : "変更する"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
