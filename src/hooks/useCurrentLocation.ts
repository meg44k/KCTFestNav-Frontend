"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CurrentLocation =
  | { status: "idle" }
  | { status: "locating" }
  | {
      status: "active";
      latitude: number;
      longitude: number;
      accuracy: number;
      heading?: number;
    }
  | { status: "denied" }
  | { status: "unavailable" };

type CompassOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};
type OrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied" | "prompt">;
};

/**
 * 現在地と向き。start() を押されたときだけ許可を求める(iOS は向きの許可もタップの中で求める必要がある)
 */
export function useCurrentLocation() {
  const [position, setPosition] = useState<CurrentLocation>({ status: "idle" });
  const [heading, setHeading] = useState<number>();
  const watchId = useRef<number | null>(null);

  const onOrientation = useCallback((e: DeviceOrientationEvent) => {
    const compass = (e as CompassOrientationEvent).webkitCompassHeading;
    const raw =
      compass !== undefined
        ? compass
        : e.alpha !== null
          ? (360 - e.alpha) % 360
          : undefined;
    // センサーは 1 秒に何十回も来るので 5° 刻みにする(同じ値なら描き直さない)
    if (raw !== undefined) setHeading((Math.round(raw / 5) * 5) % 360);
  }, []);

  const start = useCallback(async () => {
    if (!("geolocation" in navigator))
      return setPosition({ status: "unavailable" });
    setPosition({ status: "locating" });
    const O =
      typeof DeviceOrientationEvent !== "undefined"
        ? (DeviceOrientationEvent as OrientationWithPermission)
        : undefined;
    try {
      const granted =
        typeof O?.requestPermission === "function"
          ? (await O.requestPermission()) === "granted"
          : !!O;
      if (granted) {
        // Android の deviceorientation は端末の向き基準なので、北基準の absolute を優先する(useCompass と同じ)
        if ("ondeviceorientationabsolute" in window) {
          window.addEventListener(
            "deviceorientationabsolute",
            onOrientation as EventListener,
          );
        } else {
          (window as Window).addEventListener(
            "deviceorientation",
            onOrientation,
          );
        }
      }
    } catch {
      // 向きが取れなくても位置だけは出す
    }
    if (watchId.current !== null)
      navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (p) =>
        setPosition({
          status: "active",
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      (err) =>
        setPosition({
          status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
        }),
      { enableHighAccuracy: true },
    );
  }, [onOrientation]);

  useEffect(
    () => () => {
      if (watchId.current !== null)
        navigator.geolocation.clearWatch(watchId.current);
      window.removeEventListener(
        "deviceorientationabsolute",
        onOrientation as EventListener,
      );
      window.removeEventListener("deviceorientation", onOrientation);
    },
    [onOrientation],
  );

  const location: CurrentLocation =
    position.status === "active" ? { ...position, heading } : position;
  return { location, start };
}
