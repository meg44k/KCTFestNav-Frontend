"use client";

import { type FormEvent, useActionState, useTransition } from "react";
import { type AnnouncementState, saveAnnouncement } from "@/app/actions/ops";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** 来場者画面に流れるお知らせ */
export function AnnouncementForm({ current }: { current: string }) {
  const [state, action] = useActionState<AnnouncementState, FormData>(
    saveAnnouncement,
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
      <Label htmlFor="content">お知らせ</Label>
      <Textarea
        id="content"
        name="content"
        rows={4}
        defaultValue={current}
        placeholder="13時から第一体育館で軽音部のライブがあります"
      />
      <p className="text-gray-400 text-sm">
        来場者の画面に流れます。
        <span className="font-bold text-[#e54141]">
          サーバーを再起動すると消えます。
        </span>
      </p>
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
        className="h-12 bg-white text-black hover:bg-white/90 font-bold"
      >
        {pending ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}
