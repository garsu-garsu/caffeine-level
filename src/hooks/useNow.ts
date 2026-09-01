/** "지금"(서버 오프셋 1회 보정 + 1분 간격 공용 타이머) — 기획.md §12.4·§12.5. */
import { getServerTime } from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";

export function useNow(): number {
  const [offsetMs, setOffsetMs] = useState(0);
  const [, tick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (getServerTime.isSupported()) {
          const serverMs = await getServerTime();
          if (!cancelled && typeof serverMs === "number" && Number.isFinite(serverMs)) {
            setOffsetMs(serverMs - Date.now());
          }
        }
      } catch {
        /* 미지원/실패 → offsetMs 0 유지(즉시 폴백, 로딩 화면 없음) */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  return Date.now() + offsetMs;
}
