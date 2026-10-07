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
    if (compass !== undefined) setHeading(compass);
    else if (e.alpha !== null) setHeading((360 - e.alpha) % 360);
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
      if (typeof O?.requestPermission === "function") {
        if ((await O.requestPermission()) === "granted")
          window.addEventListener("deviceorientation", onOrientation);
      } else if (O) {
        window.addEventListener("deviceorientation", onOrientation);
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
      window.removeEventListener("deviceorientation", onOrientation);
    },
    [onOrientation],
  );

  const location: CurrentLocation =
    position.status === "active" ? { ...position, heading } : position;
  return { location, start };
}
