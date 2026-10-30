"use client";

import { useEffect } from "react";
import { createPinchTracker } from "@/lib/map/pinch-forward";

/**
 * 地図の画面にいる間、ボタンや凡例の上に指が乗ったままピンチしても、ページではなく地図を拡大する。
 * - ページ全体の拡大は止める(globals.css の html.map-open)。スクロールはそのまま
 * - 2 本目の指が触れたら、地図の外に触れている指を地図([data-map-surface])に回す
 * - 回したピンチのあとに指を離しても、ボタンを押したことにしない
 */
export function usePinchAnywhere() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("map-open");
    const tracker = createPinchTracker();
    let blockClickUntil = 0;
    const surface = () => document.querySelector("[data-map-surface]");

    const onDown = (e: PointerEvent) => {
      // 自分で地図に送り直したものは見ない
      if (e.pointerType !== "touch" || !e.isTrusted) return;
      const map = surface();
      if (!map) return;
      const forwards = tracker.down(
        e.pointerId,
        e.clientX,
        e.clientY,
        map.contains(e.target as Node),
      );
      for (const f of forwards) {
        // いま触れた指を回すときは、ボタンには届けない
        if (f.id === e.pointerId) e.stopPropagation();
        map.dispatchEvent(
          new PointerEvent("pointerdown", {
            pointerId: f.id,
            pointerType: "touch",
            clientX: f.x,
            clientY: f.y,
            button: 0,
            buttons: 1,
            bubbles: true,
            cancelable: true,
            composed: true,
          }),
        );
        // この先の動きと離したことも地図に届ける
        try {
          map.setPointerCapture(f.id);
        } catch {
          // もう離れていたら何もしない
        }
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" && e.isTrusted)
        tracker.move(e.pointerId, e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !e.isTrusted) return;
      tracker.up(e.pointerId);
      if (tracker.pinched()) blockClickUntil = performance.now() + 500;
    };
    const onClick = (e: MouseEvent) => {
      if (performance.now() < blockClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    // iPhone の Safari は touch-action だけではページの拡大が止まらないことがあるので、こちらでも止める
    const onGesture = (e: Event) => e.preventDefault();

    const opts = { capture: true };
    document.addEventListener("pointerdown", onDown, opts);
    document.addEventListener("pointermove", onMove, opts);
    document.addEventListener("pointerup", onUp, opts);
    document.addEventListener("pointercancel", onUp, opts);
    document.addEventListener("click", onClick, opts);
    document.addEventListener("gesturestart", onGesture, { passive: false });
    return () => {
      html.classList.remove("map-open");
      document.removeEventListener("pointerdown", onDown, opts);
      document.removeEventListener("pointermove", onMove, opts);
      document.removeEventListener("pointerup", onUp, opts);
      document.removeEventListener("pointercancel", onUp, opts);
      document.removeEventListener("click", onClick, opts);
      document.removeEventListener("gesturestart", onGesture);
    };
  }, []);
}
