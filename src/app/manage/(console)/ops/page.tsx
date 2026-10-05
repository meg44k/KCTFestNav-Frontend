import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import type { BoothResponse } from "@/lib/api/booths";
import type { LiveResponse } from "@/lib/api/lives";
import { failureMessage, manageRequest, requireRole } from "@/lib/api/manage";
import { AnnouncementForm } from "./AnnouncementForm";
import { AutoRefresh } from "./AutoRefresh";
import { CongestionMonitor } from "./CongestionMonitor";
import { LiveList } from "./LiveList";
import { OpsTabs, type Tab } from "./OpsTabs";

const TABS: Tab[] = ["congestion", "lives", "announcement"];

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const auth = await requireRole(["Admin", "Gakuseikai"]);
  if (!auth.ok) {
    return <ConsoleMessage title="当日運営">{auth.message}</ConsoleMessage>;
  }

  const [booths, lives, announcement] = await Promise.all([
    manageRequest<{ booths: BoothResponse[] }>("/booths"),
    manageRequest<{ lives: LiveResponse[] }>("/lives"),
    manageRequest<{ content: string }>("/announcements"),
  ]);
  if (!booths.ok || !lives.ok || !announcement.ok) {
    const failed = [booths, lives, announcement].find((r) => !r.ok);
    return (
      <ConsoleMessage title="当日運営">
        {failureMessage(failed && !failed.ok ? failed.reason : "unavailable")}
      </ConsoleMessage>
    );
  }

  const { tab } = await searchParams;
  const initialTab = TABS.find((t) => t === tab) ?? "congestion";
  const ongoing = lives.data.lives.find((l) => l.status === 1);
  const isAdmin = auth.user.role === "Admin";
  const serverNow = Date.now();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-extrabold text-3xl">当日運営</h1>
        <AutoRefresh />
      </div>
      <p className="rounded-lg border border-black/10 p-3">
        {ongoing ? (
          <>
            いまのライブ: <b className="text-[#e54141]">{ongoing.name}</b>
          </>
        ) : (
          <span className="text-gray-500">公演中のライブはありません</span>
        )}
      </p>
      <OpsTabs
        initialTab={initialTab}
        congestion={
          <CongestionMonitor
            booths={booths.data.booths}
            serverNow={serverNow}
          />
        }
        lives={<LiveList lives={lives.data.lives} isAdmin={isAdmin} />}
        announcement={<AnnouncementForm current={announcement.data.content} />}
      />
    </div>
  );
}
