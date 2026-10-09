"use client";

import {
  type FormEvent,
  type ReactNode,
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  deleteStageItem,
  movePerformer,
  type StageFormState,
  type StageItemKind,
  saveBlock,
  savePerformer,
  saveSection,
} from "@/app/actions/stage";
import { ImagePicker } from "@/components/manage/ImagePicker";
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
import type {
  PerformerResponse,
  StageBlockResponse,
  StageSectionResponse,
} from "@/lib/api/stage";
import { toLocalInput } from "@/lib/manage/stage-form";

type SaveAction = (
  prev: StageFormState,
  formData: FormData,
) => Promise<StageFormState>;

/** 追加・編集のダイアログ。開くたびに中身を作り直し、前回の入力やエラーを残さない */
function FormDialog({
  title,
  trigger,
  action,
  children,
}: {
  title: string;
  trigger: ReactNode;
  action: SaveAction;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>{title}</DialogTitle>
        {open && (
          <SaveForm action={action} onDone={() => setOpen(false)}>
            {children}
          </SaveForm>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SaveForm({
  action: save,
  onDone,
  children,
}: {
  action: SaveAction;
  onDone: () => void;
  children: ReactNode;
}) {
  const [state, action] = useActionState(save, undefined);
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
      {children}
      {state?.error && (
        <p role="alert" className="text-[#e54141]">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="h-12 border-2 border-[#00B894] bg-white font-bold text-[#00B894] hover:bg-[#00B894]/10"
      >
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

const addButton = (label: string) => (
  <Button className="h-10 bg-[#00B894] font-bold text-black hover:bg-[#00B894]/90">
    {label}
  </Button>
);

export function SectionDialog({ section }: { section?: StageSectionResponse }) {
  return (
    <FormDialog
      title={section ? "セクションを編集" : "セクションを追加"}
      trigger={
        section ? (
          <Button variant="outline" size="sm">
            編集
          </Button>
        ) : (
          addButton("セクションを追加")
        )
      }
      action={saveSection.bind(null, section?.id)}
    >
      <Field
        label="セクション名（必須）"
        name="name"
        defaultValue={section?.name}
        placeholder="Live1"
        required
      />
      <Field
        label="場所"
        name="location"
        defaultValue={section?.location}
        placeholder="第一体育館"
      />
      <Field
        label="並び順（小さいほど上。空なら 0）"
        name="sortOrder"
        type="number"
        step={1}
        defaultValue={section?.sort_order ?? ""}
      />
    </FormDialog>
  );
}

export function BlockDialog({
  sectionId,
  block,
}: {
  sectionId: number;
  block?: StageBlockResponse;
}) {
  return (
    <FormDialog
      title={block ? "ブロックの時間を編集" : "ブロックを追加"}
      trigger={
        block ? (
          <Button variant="outline" size="sm">
            時間を編集
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="font-bold">
            ＋ ブロックを追加
          </Button>
        )
      }
      action={saveBlock.bind(null, sectionId, block?.id)}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="開始（必須）"
          name="startTime"
          type="datetime-local"
          defaultValue={block ? toLocalInput(block.start_time) : ""}
          required
        />
        <Field
          label="終了（必須）"
          name="endTime"
          type="datetime-local"
          defaultValue={block ? toLocalInput(block.end_time) : ""}
          required
        />
      </div>
    </FormDialog>
  );
}

export function PerformerDialog({
  blockId,
  performer,
}: {
  blockId: number;
  performer?: PerformerResponse;
}) {
  return (
    <FormDialog
      title={performer ? "出演者を編集" : "出演者を追加"}
      trigger={
        performer ? (
          <Button variant="outline" size="sm">
            編集
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="font-bold">
            ＋ 出演者を追加
          </Button>
        )
      }
      action={savePerformer.bind(null, blockId, performer?.id)}
    >
      <Field
        label="出演者名（必須）"
        name="name"
        defaultValue={performer?.name}
        required
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor="detail">紹介文</Label>
        <Textarea
          id="detail"
          name="detail"
          rows={3}
          defaultValue={performer?.detail}
        />
      </div>
      <ImagePicker
        label="写真"
        name="thumbnailUrl"
        target={performer ? `performer:${performer.id}` : undefined}
        defaultUrl={performer?.thumbnail_url}
      />
    </FormDialog>
  );
}

const CASCADE: Partial<Record<StageItemKind, string>> = {
  section: "中のブロックと出演者もすべて消えます。",
  block: "中の出演者もすべて消えます。",
};

export function DeleteStageButton({
  kind,
  id,
  name,
}: {
  kind: StageItemKind;
  id: number;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setError(undefined);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-[#e54141]" />
        }
      >
        削除
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>「{name}」を削除しますか？</DialogTitle>
        {CASCADE[kind] && (
          <p className="font-bold text-[#e54141]">{CASCADE[kind]}</p>
        )}
        {error && (
          <p role="alert" className="text-[#e54141]">
            {error}
          </p>
        )}
        <Button
          disabled={pending}
          className="h-12 bg-[#e54141] font-bold text-white hover:bg-[#e54141]/90"
          onClick={() =>
            start(async () => {
              const res = await deleteStageItem(kind, id);
              if (res.error) setError(res.error);
              else setOpen(false);
            })
          }
        >
          {pending ? "削除中…" : "削除する"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function MoveButtons({
  id,
  first,
  last,
}: {
  id: number;
  first: boolean;
  last: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const move = (dir: "up" | "down") =>
    start(async () => {
      const res = await movePerformer(id, dir);
      setError(res.error);
    });
  return (
    <span className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        aria-label="上へ"
        disabled={pending || first}
        onClick={() => move("up")}
      >
        ↑
      </Button>
      <Button
        variant="outline"
        size="sm"
        aria-label="下へ"
        disabled={pending || last}
        onClick={() => move("down")}
      >
        ↓
      </Button>
      {error && (
        <span role="alert" className="text-[#e54141] text-xs">
          {error}
        </span>
      )}
    </span>
  );
}
