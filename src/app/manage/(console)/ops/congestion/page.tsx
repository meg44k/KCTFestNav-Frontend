import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import type { BoothResponse } from "@/lib/api/booths";
import { failureMessage, manageRequest } from "@/lib/api/manage";
import { CongestionMonitor } from "../CongestionMonitor";

export default async function CongestionPage() {
  const booths = await manageRequest<{ booths: BoothResponse[] }>("/booths");
  if (!booths.ok) {
    return (
      <ConsoleMessage title="混雑度">
        {failureMessage(booths.reason)}
      </ConsoleMessage>
    );
  }
  return (
    <>
      <h1 className="font-extrabold text-3xl">混雑度</h1>
      <CongestionMonitor booths={booths.data.booths} serverNow={Date.now()} />
    </>
  );
}
