"use client";

import { useEffect, useState } from "react";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { BoothCard } from "@/components/ui/boothcard";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { GradeGroup } from "@/lib/booth-grade";

export default function ClassBooth({
  gradeGroups,
  loadFailed,
}: {
  gradeGroups: GradeGroup[];
  /** ブースの取得に失敗したかどうか。true のときは一覧の代わりに案内を出す */
  loadFailed: boolean;
}) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentCarouselPage, setCurrentCarouselPage] = useState(0);

  // carouselからページ番号を受け取る
  useEffect(() => {
    if (!carouselApi) return;
    carouselApi.on("select", () => {
      setCurrentCarouselPage(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  return (
    <div>
      <SideMenu />
      <h1 className="flex justify-center font-extrabold text-4xl">
        クラス展示
      </h1>

      {loadFailed ? (
        <p className="flex justify-center mt-10 text-gray-400">
          ブース情報を読み込めませんでした。時間をおいて再度お試しください。
        </p>
      ) : gradeGroups.length === 0 ? (
        <p className="flex justify-center mt-10 text-gray-400">
          公開されているクラス展示はまだありません。
        </p>
      ) : (
        <>
          {/* 学年の見出し。ブースがある学年だけを、カルーセルのページと対応させて並べる */}
          <div className="flex justify-center gap-4 text-2xl font-bold mb-2 mt-6">
            {gradeGroups.map((group, i) => (
              <span
                key={group.grade}
                className={
                  currentCarouselPage === i ? "text-white" : "text-gray-500"
                }
              >
                {group.grade}年
              </span>
            ))}
          </div>
          <Carousel
            setApi={setCarouselApi}
            orientation="horizontal"
            className="w-full"
          >
            <CarouselContent className="h-full">
              {gradeGroups.map((group) => (
                <CarouselItem key={group.grade}>
                  <div className="flex flex-col gap-3 items-center">
                    {group.booths.map((booth) => (
                      <BoothCard
                        key={booth.id}
                        name={booth.name}
                        description={booth.description}
                        location={booth.location}
                        imageUrl={booth.imageUrl}
                        imageAlt={booth.name}
                        congestionStatus={booth.congestionStatus}
                        latitude={booth.latitude}
                        longitude={booth.longitude}
                      />
                    ))}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext className="right-2 bg-black/80" />
            <CarouselPrevious className="left-2 bg-black/80" />
          </Carousel>
        </>
      )}
    </div>
  );
}
