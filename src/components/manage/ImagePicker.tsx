"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { uploadImage } from "@/app/actions/images";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { resizeToSquare } from "@/lib/image/resize";

/**
 * 写真を選んで上げる。選んだらまん中を正方形に切り抜いて縮め、すぐアップロードしてプレビューに出す。
 * 返った URL を隠し欄(name)に入れるので、フォームの「保存」で今までどおり保存される。
 * target がまだ無い(新規作成)ときは、保存してから追加するよう案内する
 */
export function ImagePicker({
  label,
  name,
  target,
  defaultUrl,
}: {
  label: string;
  /** 隠し欄の name(フォームが読む) */
  name: string;
  /** booth:<ID> / performer:<ID>。新規作成でまだ ID が無ければ undefined */
  target?: string;
  defaultUrl?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const pick = async (file: File | undefined) => {
    if (!file || !target) return;
    setBusy(true);
    setError(undefined);
    try {
      const blob = await resizeToSquare(file);
      const form = new FormData();
      form.set("target", target);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      form.set("file", blob, `photo.${ext}`);
      const res = await uploadImage(form);
      if (res.url) setUrl(res.url);
      else setError(res.error);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "写真を読み込めませんでした。別の写真を選んでください",
      );
    } finally {
      setBusy(false);
      // 同じ写真を選び直しても change が起きるように
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <input type="hidden" name={name} value={url} />
      {target ? (
        <div className="flex items-end gap-3">
          {/* カードと同じ正方形で見せる */}
          <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-200 text-gray-400">
            {url ? (
              <Image
                src={url}
                alt="選んだ写真"
                fill
                sizes="112px"
                unoptimized
                className="object-cover"
              />
            ) : (
              <ImageIcon size={32} aria-hidden />
            )}
            {busy && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs">
                アップロード中…
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={input}
              id={id}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="border-black/20 bg-white text-black hover:bg-black/5"
            >
              {url ? "写真を変える" : "写真を選ぶ"}
            </Button>
            {url && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setUrl("")}
                className="text-[#e54141]"
              >
                外す
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p id={id} className="text-gray-500 text-sm">
          保存してから写真を追加できます。
        </p>
      )}
      {error && (
        <p role="alert" className="text-[#e54141] text-sm">
          {error}
        </p>
      )}
      <p className="text-gray-500 text-xs">
        写真のまん中が正方形で表示されます。「保存」を押すまで変わりません。
      </p>
    </div>
  );
}
