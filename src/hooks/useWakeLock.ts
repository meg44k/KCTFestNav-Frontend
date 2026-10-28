import { useEffect } from "react";

/**
 * active の間、画面が暗くならないようにする(Wake Lock)。
 * 対応していないブラウザでは何もしない。アプリを離れると外れるため、戻ったら取り直す
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    let stopped = false;
    const request = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) next.release();
        else lock = next;
      } catch {
        // 省電力モードなどで断られたときは、暗くなるだけなので放っておく
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release();
    };
  }, [active]);
}
