"use client";

import {
  type FormEvent,
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";
import { type LiveFormState, saveLive } from "@/app/actions/ops";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LiveResponse } from "@/lib/api/lives";
import { toLocalInput } from "@/lib/manage/ops";

/** current があれば編集、無ければ追加(Admin のみ) */
export function LiveFormDialog({ current }: { current?: LiveResponse }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          current ? (
            <Button variant="outline" size="sm" />
          ) : (
            <Button className="h-12 px-6 bg-white text-black hover:bg-white/90 font-bold" />
          )
        }
      >
        {current ? "編集" : "ライブを追加"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle>{current ? "ライブを編集" : "ライブを追加"}</DialogTitle>
        {/* 開くたびに作り直して、前回の入力やエラーを残さない */}
        {open && <LiveForm current={current} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function LiveForm({
  current,
  onDone,
}: {
  current?: LiveResponse;
  onDone: () => void;
}) {
  const [state, action] = useActionState<LiveFormState, FormData>(
    saveLive.bind(null, current),
    undefined,
  );
  const [pending, start] = useTransition();
  useEffect(() => {
    if (state?.done) onDone();
  }, [state, onDone]);

  // form の action に渡すと React が送信後に入力を空にするため、onSubmit から呼ぶ
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    start(() => action(formData));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field
        label="ライブ名（必須）"
        name="name"
        defaultValue={current?.name}
        required
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor="detail">説明</Label>
        <Textarea
          id="detail"
          name="detail"
          defaultValue={current?.detail}
          rows={3}
        />
      </div>
      <Field
        label="サムネイル URL"
        name="thumbnailUrl"
        defaultValue={current?.thumbnail_url}
        placeholder="https://..."
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="開始（必須）"
          name="startTime"
          type="datetime-local"
          defaultValue={current ? toLocalInput(current.start_time) : ""}
          required
        />
        <Field
          label="終了（必須）"
          name="endTime"
          type="datetime-local"
          defaultValue={current ? toLocalInput(current.end_time) : ""}
          required
        />
      </div>
      <Field
        label="回数"
        name="sessionNumber"
        type="number"
        min={1}
        defaultValue={current?.session_number ?? 1}
        required
      />
      {state?.error && (
        <p role="alert" className="text-[#e54141]">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-12 font-bold">
        {pending ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="h-10" {...props} />
    </div>
  );
}
