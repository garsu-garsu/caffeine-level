import { useEffect, useState } from "react";
import { adaptive } from "@toss/tds-colors";

function format(remainingMs: number): string {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSec / 86_400);
  const hh = String(Math.floor((totalSec % 86_400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${days}일 ${hh}:${mm}:${ss}`;
}

/**
 * "다 빠질 때까지" 카운트다운(§0 18~19차) — 초 단위 타이머가 여기 한 곳에만 있다.
 * targetMs는 부모가 useMemo로 한 번만 구해 넘긴다. 매초 Date.now() 기준으로 다시 빼서
 * 표시만 갱신하므로(누적 카운터 아님) 탭이 안 보이던 동안의 드리프트가 자동 보정된다.
 * document.hidden이면 타이머를 멈추고 visibilitychange에서 재개한다.
 */
export function Countdown({ targetMs }: { targetMs: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      stop();
      setNow(Date.now());
      timer = setInterval(() => setNow(Date.now()), 1000);
    };
    const stop = () => {
      if (timer != null) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <p style={{ margin: "2px 0 0", fontSize: 13, color: adaptive.grey500 }}>
      다 빠질 때까지 {format(targetMs - now)}
    </p>
  );
}
