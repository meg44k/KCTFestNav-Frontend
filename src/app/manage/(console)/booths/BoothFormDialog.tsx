"use client";

import {
  type FormEvent,
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";
import { type ActionState, saveBooth } from "@/app/actions/manage-booths";
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
import type { BoothResponse } from "@/lib/api/booths";

/** current があれば編集、無ければ追加 */
export function BoothFormDialog({ current }: { current?: BoothResponse }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          current ? (
            <Button variant="outline" size="sm" />
          ) : (
            <Button className="h-12 px-6 bg-black text-white hover:bg-black/80 font-bold" />
          )
        }
      >
        {current ? "編集" : "ブースを追加"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle>{current ? "ブースを編集" : "ブースを追加"}</DialogTitle>
        {/* 開くたびに作り直して、前回の入力やエラーを残さない */}
        {open && <BoothForm current={current} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BoothForm({
  current,
  onDone,
}: {
  current?: BoothResponse;
  onDone: () => void;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    saveBooth.bind(null, current),
    undefined,
  );
  const [pending, start] = useTransition();
  useEffect(() => {
    if (state?.done) onDone();
  }, [state, onDone]);

  // form の action に渡すと React が送信後に入力を空にするため、onSubmit から呼ぶ。
  // 保存に失敗しても入力が残る
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    start(() => action(formData));
  };

  const coord = (v?: number) => (v ? String(v) : "");
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field
        label="ブース名（必須）"
        name="name"
        defaultValue={current?.name}
        required
      />
      <Field
        label="主催者"
        name="organizer"
        defaultValue={current?.organizer}
        placeholder="1-1、天文部 など"
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
        label="場所"
        name="location"
        defaultValue={current?.location}
        placeholder="第一体育館 など"
      />
      <Field
        label="画像 URL"
        name="imageUrl"
        defaultValue={current?.image_url}
        placeholder="https://..."
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="緯度"
          name="latitude"
          defaultValue={coord(current?.latitude)}
          inputMode="decimal"
        />
        <Field
          label="経度"
          name="longitude"
          defaultValue={coord(current?.longitude)}
          inputMode="decimal"
        />
      </div>
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
