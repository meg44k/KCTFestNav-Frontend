"use client";

import { type FormEvent, useActionState, useState, useTransition } from "react";
import { type DetailState, saveDetail } from "@/app/actions/my-booth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BoothResponse } from "@/lib/api/booths";

/** 出し物の説明と展示物画像だけを直すフォーム */
export function DetailForm({ booth }: { booth: BoothResponse }) {
  const [state, action] = useActionState<DetailState, FormData>(
    saveDetail,
    undefined,
  );
  const [pending, start] = useTransition();
  // 公開前の確認で待っている入力。null なら確認は閉じている
  const [confirming, setConfirming] = useState<FormData | null>(null);

  // すぐには保存せず、来場者全員に見られることを確認してもらう。
  // form の action に渡すと React が送信後に入力を空にするため、onSubmit から呼ぶ
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setConfirming(new FormData(e.currentTarget));
  };
  const publish = () => {
    if (!confirming) return;
    const formData = confirming;
    setConfirming(null);
    start(() => action(formData));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="detail">出し物の説明</Label>
        <Textarea
          id="detail"
          name="detail"
          rows={4}
          defaultValue={booth.detail}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="imageUrl">展示物画像</Label>
        <Input
          id="imageUrl"
          name="imageUrl"
          className="h-10"
          defaultValue={booth.image_url}
          placeholder="https://..."
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-[#e54141]">
          {state.error}
        </p>
      )}
      {state?.saved && !pending && (
        <p className="text-[#00B894]">公開しました</p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="h-12 border-2 border-[#00B894] bg-white text-[#00B894] hover:bg-[#00B894]/10 font-bold"
      >
        {pending ? "公開中…" : "保存して公開"}
      </Button>
      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogTitle>この内容で公開しますか？</DialogTitle>
          <DialogDescription render={<div />} className="flex flex-col gap-2">
            <p>
              公開すると、出し物の説明と展示物画像は
              <b className="text-[#e54141]">
                すぐに来場者全員のスマホに表示されます。
              </b>
            </p>
            <p>次のようなものが含まれていないか、もう一度確認してください。</p>
            <ul className="list-disc pl-5">
              <li>人を傷つける言葉や、ふさわしくない表現</li>
              <li>本人の許可を得ていない人の写真や、名前などの個人情報</li>
              <li>他の人が作った画像やイラストの無断使用</li>
            </ul>
          </DialogDescription>
          <div className="grid grid-cols-2 gap-2">
            <DialogClose
              render={
                <Button
                  variant="outline"
                  className="h-12 cursor-pointer border-black/20 bg-white text-black hover:bg-black/5"
                />
              }
            >
              戻って直す
            </DialogClose>
            <Button
              onClick={publish}
              className="h-12 cursor-pointer bg-[#00B894] text-black hover:bg-[#00B894]/90 font-bold"
            >
              公開する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
