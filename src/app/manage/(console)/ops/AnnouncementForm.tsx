"use client";

import { type FormEvent, useActionState, useState, useTransition } from "react";
import { type AnnouncementState, saveAnnouncement } from "@/app/actions/ops";
import { BulletinBoard } from "@/components/ui/bulletinBoard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { announcementOrDefault } from "@/lib/live-schedule";

/** 来場者画面に流れるお知らせ */
export function AnnouncementForm({ current }: { current: string }) {
  const [state, action] = useActionState<AnnouncementState, FormData>(
    saveAnnouncement,
    undefined,
  );
  const [pending, start] = useTransition();
  // プレビュー用に入力中の文章を持つ
  const [draft, setDraft] = useState(current);

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
        onChange={(e) => setDraft(e.target.value)}
        placeholder="13時から第一体育館で軽音部のライブがあります"
      />
      <p className="text-gray-500 text-sm">来場者の画面に表示されます。</p>
      <div className="flex flex-col gap-1">
        <span className="text-gray-500 text-sm">プレビュー</span>
        {/* 来場者のトップ画面と同じ帯を、同じ黒地で出す。空なら来場者にも既定の文が出る */}
        <div className="rounded-lg bg-black py-2">
          <BulletinBoard content={announcementOrDefault(draft)} />
        </div>
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
        className="h-12 border-2 border-[#00B894] bg-white text-[#00B894] hover:bg-[#00B894]/10 font-bold"
      >
        {pending ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}
