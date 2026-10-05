"use client";

import { type FormEvent, useActionState, useState, useTransition } from "react";
import { type AddState, addAccount } from "@/app/actions/manage-accounts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IssuedTable } from "./IssuedTable";

/** 学生会・管理者のアカウントを個別に作る(担当はブースからまとめて発行する) */
export function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-12 px-6 bg-[#00B894] text-black hover:bg-[#00B894]/90 font-bold" />
        }
      >
        アカウントを追加
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>学生会・管理者のアカウントを追加</DialogTitle>
        {/* 開くたびに作り直して、前回の結果を残さない */}
        {open && <AddForm />}
      </DialogContent>
    </Dialog>
  );
}

function AddForm() {
  const [state, action] = useActionState<AddState, FormData>(
    addAccount,
    undefined,
  );
  const [pending, start] = useTransition();

  if (state?.issued) return <IssuedTable rows={[state.issued]} />;

  // form の action に渡すと送信後に入力が消えるため、onSubmit から呼ぶ
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    start(() => action(formData));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="loginId">ログイン ID（必須）</Label>
        <Input id="loginId" name="loginId" className="h-10" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">名前</Label>
        <Input
          id="name"
          name="name"
          className="h-10"
          placeholder="学生会 会計 など"
        />
      </div>
      <fieldset className="flex gap-6">
        <legend className="mb-1 text-sm">ロール</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="role" value="Gakuseikai" defaultChecked />
          学生会
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="role" value="Admin" />
          管理者
        </label>
      </fieldset>
      {state?.error && (
        <p role="alert" className="text-[#e54141]">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-12 font-bold">
        {pending ? "作成中…" : "作成"}
      </Button>
    </form>
  );
}
