"use client";

import { useState } from "react";

export function MapTypeToggle() {
  const [mapType, setMapType] = useState("2D");

  const changeMapType = () => {
    if (mapType === "2D") {
      setMapType("3D");
    } else {
      setMapType("2D");
    }
  };
  return (
    <button
      type="button"
      onClick={changeMapType}
      className="absolute flex justify-center items-center bottom-10 right-4 rounded-full w-10 h-10 border border-white-1"
    >
      <span className="text-md -translate-y-[1px]">{mapType}</span>
    </button>
  );
}
