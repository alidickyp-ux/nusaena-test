"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface LiveClockProps {
  className?: string;
  showIcon?: boolean;
  withSeconds?: boolean;
}

export default function LiveClock({
  className = "",
  showIcon = true,
  withSeconds = true,
}: LiveClockProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          ...(withSeconds && { second: "2-digit" }),
          hour12: false,
        })
      );
    };

    updateTime(); // langsung set saat mount, biar tidak kosong

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [withSeconds]);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showIcon && <Clock className="w-3 h-3 text-white/40" />}
      <p className="text-[10px] text-white/50 font-mono font-semibold tabular-nums">
        {time || "--:--:--"}
      </p>
    </div>
  );
}