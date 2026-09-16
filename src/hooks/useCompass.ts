import { useCallback, useEffect, useState } from "react";

// iOS Safari だけが持つ、真北基準の方位を返す独自プロパティ
type CompassOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

// iOS 13+ はセンサー利用に明示的な許可が必要
type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied" | "prompt">;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

const calcBearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
};

const calcDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const R = 6371; // 地球の半径[km]
  const dLat = Math.abs(lat1 - lat2);
  const dLng = Math.abs(lng1 - lng2);

  const a =
    Math.sin(toRad(dLat) / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(toRad(dLng) / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1000; // [m]
  return distance;
};

/**
 * 現在地から目的地への方角を計算し、コンパスの回転角度を返すカスタムHook
 * @param targetLat 目的地の緯度
 * @param targetLng 目的地の経度
 */
export function useCompass(targetLat: number, targetLng: number) {
  const [angle, setAngle] = useState(0); // 回転角度
  const [heading, setHeading] = useState(0); // 現在向いている方向
  const [bearing, setBearing] = useState(0); // 目的地への角度;
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState(0);

  // 緯度と経度から角度を計算する

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let currentHeading = 0;
    const compassHeading = (event as CompassOrientationEvent)
      .webkitCompassHeading;
    if (compassHeading !== undefined) {
      currentHeading = compassHeading;
    } else if (event.alpha !== null) {
      currentHeading = (360 - event.alpha) % 360;
    }

    // 生のセンサー値はブレが大きいので、最短角度差で指数移動平均をかけて滑らかにする
    const smoothing = 0.3;
    setHeading((prevHeading) => {
      let delta = currentHeading - prevHeading;
      if (delta > 180) delta -= 360;
      else if (delta < -180) delta += 360;
      return (prevHeading + delta * smoothing + 360) % 360;
    });
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newBearing = calcBearing(
          latitude,
          longitude,
          targetLat,
          targetLng,
        );
        const newDistance = calcDistance(
          latitude,
          longitude,
          targetLat,
          targetLng,
        );
        setDistance(newDistance);
        setBearing(newBearing);
        setError(null);
      },
      (err) => {
        if (err.code === err.POSITION_UNAVAILABLE) return;
        setError(`GPS取得エラー(code:${err.code}): ${err.message}`);
      },
      { enableHighAccuracy: true },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isActive, targetLat, targetLng]);

  useEffect(() => {
    setAngle((prevAngle) => {
      const targetAngle = bearing - heading;

      let diff = targetAngle - (prevAngle % 360);

      if (diff > 180) {
        diff -= 360;
      } else if (diff < -180) {
        diff += 360;
      }

      return prevAngle + diff;
    });
  }, [bearing, heading]);

  const startCompass = async () => {
    const orientationEvent =
      typeof DeviceOrientationEvent !== "undefined"
        ? (DeviceOrientationEvent as DeviceOrientationEventWithPermission)
        : undefined;
    if (typeof orientationEvent?.requestPermission === "function") {
      try {
        const permission = await orientationEvent.requestPermission();
        if (permission !== "granted") {
          setError("コンパスの使用が許可されませんでした");
          return;
        }
      } catch {
        setError("コンパスの許可リクエストに失敗しました");
        return;
      }
    }
    if ("ondeviceorientationabsolute" in window) {
      window.addEventListener(
        "deviceorientationabsolute",
        handleOrientation as EventListener,
      );
    } else {
      // "ondeviceorientationabsolute" in window の絞り込みで
      // else 側の window が never になるため、Window に戻してから登録する
      (window as Window).addEventListener(
        "deviceorientation",
        handleOrientation,
      );
    }
    setIsActive(true);
  };

  const stopCompass = () => {
    window.removeEventListener(
      "deviceorientationabsolute",
      handleOrientation as EventListener,
    );
    window.removeEventListener("deviceorientation", handleOrientation);
    setIsActive(false);
  };

  return {
    angle,
    heading,
    bearing,
    error,
    isActive,
    startCompass,
    stopCompass,
    distance,
  };
}
