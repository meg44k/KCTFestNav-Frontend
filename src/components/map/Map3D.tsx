"use client";

import { useEffect, useRef } from "react";
import { createScene } from "./scene3d";
import type { MapProps } from "./types";

/** three.js の 3D 地図。/map と同じチャンクにだけ入るよう、呼ぶ側で next/dynamic にする */
export default function Map3D(props: MapProps) {
  const { campus, pins, selectedPinId, focus, location } = props;
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createScene> | null>(null);
  // 押したときは最新の props の関数を呼ぶ(シーンは作り直さない)
  const handlers = useRef(props);
  useEffect(() => {
    handlers.current = props;
  });

  useEffect(() => {
    if (!host.current) return;
    const s = createScene(host.current, campus, (hit) => {
      const h = handlers.current;
      if (!hit) h.onPickNothing();
      else if ("pin" in hit) h.onPickPin(hit.pin);
      else h.onPickBuilding(hit.building);
    });
    scene.current = s;
    return () => {
      s.dispose();
      scene.current = null;
    };
  }, [campus]);

  useEffect(() => {
    scene.current?.setBuildings(focus);
    // カメラはブースを選んだとき(階がある)だけ寄せる。棟を押したときや選択を外したときは色だけ変える
    if (focus && focus.floor > 0) scene.current?.focusOn(focus);
  }, [focus]);
  useEffect(() => {
    scene.current?.setPins(pins, selectedPinId);
  }, [pins, selectedPinId]);
  useEffect(() => {
    scene.current?.setLocation(location);
  }, [location]);

  return <div ref={host} className="absolute inset-0 touch-none" />;
}
