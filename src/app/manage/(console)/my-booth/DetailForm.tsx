"use client";

import { type FormEvent, useActionState, useTransition } from "react";
import { type DetailState, saveDetail } from "@/app/actions/my-booth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BoothResponse } from "@/lib/api/booths";

/** 説明と画像だけを直すフォーム */
export function DetailForm({ booth }: { booth: BoothResponse }) {
  const [state, action] = useActionState<DetailState, FormData>(
    saveDetail,
    undefined,
  );
  const [pending, start] = useTransition();

  // form の action に渡すと React が送信後に入力を空にするため、onSubmit から呼ぶ
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    start(() => action(formData));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="detail">説明</Label>
        <Textarea
          id="detail"
          name="detail"
          rows={4}
          defaultValue={booth.detail}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="imageUrl">画像 URL</Label>
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
        <p className="text-[#00B894]">保存しました</p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="h-12 bg-black text-white hover:bg-black/80 font-bold"
      >
        {pending ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}
