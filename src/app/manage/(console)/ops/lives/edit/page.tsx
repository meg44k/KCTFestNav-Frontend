import Link from "next/link";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { failureMessage, manageRequest, requireRole } from "@/lib/api/manage";
import type { StageSectionResponse } from "@/lib/api/stage";
import { blockTimeRange, stageDays } from "@/lib/stage-schedule";
import {
  BlockDialog,
  DeleteStageButton,
  MoveButtons,
  PerformerDialog,
  SectionDialog,
} from "./StageEditor";

const ms = (iso: string) => new Date(iso).getTime();

/** 管理者だけが使う番組表(セクション・ブロック・出演者)の編集 */
export default async function StageEditPage() {
  const auth = await requireRole(["Admin"]);
  if (!auth.ok) {
    return <ConsoleMessage title="番組表の編集">{auth.message}</ConsoleMessage>;
  }
  const stage = await manageRequest<{ sections: StageSectionResponse[] }>(
    "/stage",
  );
  if (!stage.ok) {
    return (
      <ConsoleMessage title="番組表の編集">
        {failureMessage(stage.reason)}
      </ConsoleMessage>
    );
  }
  const sections = [...stage.data.sections].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id,
  );

  return (
    <>
      <Link href="/manage/ops/lives" className="text-gray-600 text-sm">
        ← ライブに戻る
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-extrabold text-3xl">番組表の編集</h1>
        <SectionDialog />
      </div>
      <p className="text-gray-600 text-sm">
        セクション（Live1
        など）の中にブロック（時間帯）を作り、ブロックに出演者を出演順に登録します。
      </p>
      {sections.length === 0 && (
        <p className="text-gray-500">セクションが登録されていません。</p>
      )}
      {sections.map((section) => {
        const blocks = [...section.blocks].sort(
          (a, b) => ms(a.start_time) - ms(b.start_time) || a.id - b.id,
        );
        return (
          <section
            key={section.id}
            className="flex flex-col gap-3 rounded-lg border border-black/10 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-xl">{section.name}</h2>
              {section.location && (
                <span className="text-gray-500 text-sm">
                  {section.location}
                </span>
              )}
              <span className="text-gray-400 text-xs">
                並び順 {section.sort_order}
              </span>
              <span className="ml-auto flex gap-2">
                <SectionDialog section={section} />
                <DeleteStageButton
                  kind="section"
                  id={section.id}
                  name={section.name}
                />
              </span>
            </div>
            {blocks.map((block, i) => {
              const when = `${stageDays([{ ...section, blocks: [block] }])[0].short} ${blockTimeRange(block)}`;
              return (
                <div
                  key={block.id}
                  className="flex flex-col gap-2 rounded-md bg-black/[0.03] p-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm">ブロック{i + 1}</span>
                    <span className="text-sm">{when}</span>
                    <span className="ml-auto flex gap-2">
                      <BlockDialog sectionId={section.id} block={block} />
                      <DeleteStageButton
                        kind="block"
                        id={block.id}
                        name={`${section.name} ブロック${i + 1}（${when}）`}
                      />
                    </span>
                  </div>
                  <ol className="flex flex-col gap-1">
                    {block.performers.map((p, j) => (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center gap-2 rounded-md bg-white px-2 py-1"
                      >
                        <span className="w-6 text-gray-400 text-sm">
                          {j + 1}
                        </span>
                        <span className="min-w-0 flex-1 basis-40">
                          {p.name}
                        </span>
                        <span className="ml-auto flex items-center gap-2">
                          <MoveButtons
                            id={p.id}
                            first={j === 0}
                            last={j === block.performers.length - 1}
                          />
                          <PerformerDialog blockId={block.id} performer={p} />
                          <DeleteStageButton
                            kind="performer"
                            id={p.id}
                            name={p.name}
                          />
                        </span>
                      </li>
                    ))}
                  </ol>
                  <div>
                    <PerformerDialog blockId={block.id} />
                  </div>
                </div>
              );
            })}
            <div>
              <BlockDialog sectionId={section.id} />
            </div>
          </section>
        );
      })}
    </>
  );
}
