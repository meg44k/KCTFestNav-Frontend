import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function LiveScheduleCard({
  stageName,
  children,
}: {
  stageName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-80 bg-white rounded-md p-3">
      <h2 className="font-bold text-2xl pb-2 text-black">{stageName}</h2>
      <div className="w-full flex justify-center gap-2 flex-col">
        {children}
      </div>
    </div>
  );
}

function BandBar({
  bandName,
  startTime,
  endTime,
  thumbnail,
  description,
  state,
}: {
  bandName: string;
  startTime: string;
  endTime: string;
  thumbnail: string;
  description: string;
  state: "upcoming" | "ongoing" | "finished";
}) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "relative flex flex-row items-center  h-10 w-full p-3 bg-white border border-gray-500 rounded-full text-black",
          {
            "bg-gray-300 border-gray-500 text-gray-700": state === "finished",
            "bg-red-200 border-red-600": state === "ongoing",
          },
        )}
      >
        <div className="w-25">
          {startTime}~{endTime}
        </div>
        <div className="w-auto">{bandName}</div>
        {state === "ongoing" && (
          <div className="text-center absolute -top-2.5 w-15 h-5 bg-red-500 text-white rounded-md text-sm">
            LIVE!
          </div>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn("flex flex-col gap-0 w-80", {
          "border border-red-500": state === "ongoing",
        })}
      >
        {state === "ongoing" && (
          <div className="text-center absolute -top-2.5 w-15 h-5 bg-red-500 text-white rounded-md text-sm">
            LIVE!
          </div>
        )}
        <div className="text-2xl">{bandName}</div>
        <div className="w-30 h-30">
          <Image src={thumbnail} alt="バンド写真" className="aspect-square" />
        </div>

        <div>
          {startTime}~{endTime}
        </div>
        <div className="border-t border-black text-lg">バンド紹介</div>
        <div>{description}</div>
      </DialogContent>
    </Dialog>
  );
}

export { LiveScheduleCard, BandBar };
