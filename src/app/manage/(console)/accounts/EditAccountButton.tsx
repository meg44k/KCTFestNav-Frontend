"use client";

import { useState, useTransition } from "react";
import { updateAccount } from "@/app/actions/manage-accounts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ManageUser } from "@/lib/manage/roles";

/**
 * アカウントを編集する。ログイン ID・担当者(名前)・担当ブース(担当のアカウントだけ)。
 * 役職とパスワードはここでは変えない(パスワードは再発行で)
 */
export function EditAccountButton({
  user,
  booths,
  boothOwners,
}: {
  user: ManageUser;
  /** 選べるブース(ID 順) */
  booths: { id: number; name: string }[];
  /** ブース ID → そのブースを担当しているほかのアカウントのログイン ID */
  boothOwners: Record<number, string[]>;
}) {
  const isStaff = user.role === "Student";
  const initial = {
    loginId: user.login_id,
    name: user.name,
    boothId: user.assigned_booth_id,
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  // 選んだブースに、このアカウント以外の担当がいれば知らせる(止めはしない)
  const others = (boothOwners[form.boothId] ?? []).filter(
    (id) => id !== user.login_id,
  );
  const changed =
    form.loginId.trim() !== initial.loginId ||
    form.name.trim() !== initial.name ||
    form.boothId !== initial.boothId;
  const ready =
    form.loginId.trim() !== "" &&
    form.name.trim() !== "" &&
    (!isStaff || form.boothId > 0);

  const field = "flex flex-col gap-1.5";
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setForm(initial);
        setError(undefined);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        編集
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>アカウントを編集</DialogTitle>
        <DialogDescription>
          パスワードは変わりません。ログイン ID を変えたら本人に伝えてください。
        </DialogDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await updateAccount(user.id, form);
              if (res.error) setError(res.error);
              else setOpen(false);
            });
          }}
        >
          <div className={field}>
            <Label htmlFor={`login-${user.id}`}>ログイン ID</Label>
            <Input
              id={`login-${user.id}`}
              value={form.loginId}
              onChange={(e) => setForm({ ...form, loginId: e.target.value })}
              autoComplete="off"
              className="font-mono"
            />
          </div>
          <div className={field}>
            <Label htmlFor={`name-${user.id}`}>
              {isStaff ? "担当者" : "名前"}
            </Label>
            <Input
              id={`name-${user.id}`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="off"
            />
          </div>
          {isStaff && (
            <div className={field}>
              <Label htmlFor={`booth-${user.id}`}>担当ブース</Label>
              <select
                id={`booth-${user.id}`}
                value={form.boothId}
                onChange={(e) =>
                  setForm({ ...form, boothId: Number(e.target.value) })
                }
                className="h-10 rounded-md border border-black/20 bg-white px-3"
              >
                <option value={0} disabled>
                  ブースを選ぶ
                </option>
                {booths.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {others.length > 0 && (
                <p className="text-amber-700 text-sm">
                  このブースにはもう担当({others.join("、")}
                  )がいます。保存すると担当が{others.length + 1}人になります。
                </p>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="text-[#e54141]">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <DialogClose
              render={
                <Button type="button" variant="outline" className="h-12" />
              }
            >
              やめる
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || !changed || !ready}
              className="h-12 font-bold"
            >
              {pending ? "保存中…" : "保存する"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
