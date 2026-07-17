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

// モックデータ（25個）
const booths = [
  {
    name: "たこ焼き",
    description: "1-1",
    imageUrl: "/img1.png",
    imageAlt: "たこ焼き",
    congestionStatus: "empty",
  },
  {
    name: "焼きそば",
    description: "1-2",
    imageUrl: "/img1.png",
    imageAlt: "焼きそば",
    congestionStatus: "clouded",
  },
  {
    name: "クレープ",
    description: "1-3",
    imageUrl: "/img1.png",
    imageAlt: "クレープ",
    congestionStatus: "veryClouded",
  },
  {
    name: "フランクフルト",
    description: "1-4",
    imageUrl: "/img1.png",
    imageAlt: "フランクフルト",
    congestionStatus: "empty",
  },
  {
    name: "わたあめ",
    description: "1-5",
    imageUrl: "/img1.png",
    imageAlt: "わたあめ",
    congestionStatus: "clouded",
  },
  {
    name: "チュロス",
    description: "2-1",
    imageUrl: "/img1.png",
    imageAlt: "チュロス",
    congestionStatus: "empty",
  },
  {
    name: "ポップコーン",
    description: "2-2",
    imageUrl: "/img1.png",
    imageAlt: "ポップコーン",
    congestionStatus: "veryClouded",
  },
  {
    name: "かき氷",
    description: "2-3",
    imageUrl: "/img1.png",
    imageAlt: "かき氷",
    congestionStatus: "clouded",
  },
  {
    name: "タピオカ",
    description: "2-4",
    imageUrl: "/img1.png",
    imageAlt: "タピオカ",
    congestionStatus: "empty",
  },
  {
    name: "からあげ",
    description: "2-5",
    imageUrl: "/img1.png",
    imageAlt: "からあげ",
    congestionStatus: "veryClouded",
  },
  {
    name: "お化け屋敷",
    description: "3-1",
    imageUrl: "/img1.png",
    imageAlt: "お化け屋敷",
    congestionStatus: "veryClouded",
  },
  {
    name: "脱出ゲーム",
    description: "3-2",
    imageUrl: "/img1.png",
    imageAlt: "脱出ゲーム",
    congestionStatus: "clouded",
  },
  {
    name: "射的",
    description: "3-3",
    imageUrl: "/img1.png",
    imageAlt: "射的",
    congestionStatus: "empty",
  },
  {
    name: "縁日",
    description: "3-4",
    imageUrl: "/img1.png",
    imageAlt: "縁日",
    congestionStatus: "clouded",
  },
  {
    name: "プラネタリウム",
    description: "3-5",
    imageUrl: "/img1.png",
    imageAlt: "プラネタリウム",
    congestionStatus: "empty",
  },
  {
    name: "カフェ",
    description: "4-1",
    imageUrl: "/img1.png",
    imageAlt: "カフェ",
    congestionStatus: "clouded",
  },
  {
    name: "ワッフル",
    description: "4-2",
    imageUrl: "/img1.png",
    imageAlt: "ワッフル",
    congestionStatus: "empty",
  },
  {
    name: "スムージー",
    description: "4-3",
    imageUrl: "/img1.png",
    imageAlt: "スムージー",
    congestionStatus: "veryClouded",
  },
  {
    name: "ベビーカステラ",
    description: "4-4",
    imageUrl: "/img1.png",
    imageAlt: "ベビーカステラ",
    congestionStatus: "empty",
  },
  {
    name: "焼き鳥",
    description: "4-5",
    imageUrl: "/img1.png",
    imageAlt: "焼き鳥",
    congestionStatus: "clouded",
  },
  {
    name: "迷路",
    description: "5-1",
    imageUrl: "/img1.png",
    imageAlt: "迷路",
    congestionStatus: "veryClouded",
  },
  {
    name: "VR体験",
    description: "5-2",
    imageUrl: "/img1.png",
    imageAlt: "VR体験",
    congestionStatus: "veryClouded",
  },
  {
    name: "バルーンアート",
    description: "5-3",
    imageUrl: "/img1.png",
    imageAlt: "バルーンアート",
    congestionStatus: "empty",
  },
  {
    name: "似顔絵",
    description: "5-4",
    imageUrl: "/img1.png",
    imageAlt: "似顔絵",
    congestionStatus: "clouded",
  },
  {
    name: "ミニゲーム",
    description: "5-5",
    imageUrl: "/img1.png",
    imageAlt: "ミニゲーム",
    congestionStatus: "empty",
  },
];

export default function ClassBooth() {
  const chunkSize = 5;
  const chunks = [];
  for (let i = 0; i < booths.length; i += chunkSize) {
    chunks.push(booths.slice(i, i + chunkSize));
  }

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

      <div className="flex justify-center gap-4 text-2xl font-bold mb-2 mt-6">
        {[1, 2, 3, 4, 5].map((year, i) => (
          <span
            key={year}
            className={
              currentCarouselPage === i ? "text-white" : "text-gray-500"
            }
          >
            {year}年
          </span>
        ))}
      </div>
      <Carousel
        setApi={setCarouselApi}
        orientation="horizontal"
        className="w-full"
      >
        <CarouselContent className="h-full">
          {chunks.map((chunk) => (
            <CarouselItem key={chunk[0].name}>
              <div className="flex flex-col gap-3 items-center">
                {chunk.map((booth) => (
                  <BoothCard
                    key={booth.name}
                    name={booth.name}
                    description={booth.description}
                    imageUrl={booth.imageUrl}
                    imageAlt={booth.imageAlt}
                    congestionStatus={booth.congestionStatus}

                  />
                ))}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNext className="right-2 bg-black/80" />
        <CarouselPrevious className="left-2 bg-black/80" />
      </Carousel>
    </div>
  );
}
