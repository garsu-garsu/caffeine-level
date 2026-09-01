import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef, useState } from "react";

import { EVENT, track } from "../lib/analytics";
import { AD_GROUP_ID_BANNER } from "../lib/env";

/**
 * 배너 광고(화면당 1개, 홈에만 — 기획.md §3). joeunnal BannerAd.tsx 이식.
 * 30초 리프레시 3블록(round state · REFRESH_MS · visibility 타이머)은 지웠다 —
 * "광고 영역을 주기적으로 Refresh 처리"는 비정상 트래픽 조항 위반이고, SDK가 알아서 갱신한다.
 */
export function BannerAd({ height = 96, screen }: { height?: number; screen?: string } = {}) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (AD_GROUP_ID_BANNER === "") return;
    try {
      if (!TossAds.initialize.isSupported()) return;
      TossAds.initialize({
        callbacks: {
          onInitialized: () => setReady(true),
          onInitializationFailed: (error) => console.error(error),
        },
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const target = targetRef.current;
    if (!ready || target == null) return;
    let detach: (() => void) | undefined;
    try {
      if (!TossAds.attachBanner.isSupported()) return;
      const attached = TossAds.attachBanner(AD_GROUP_ID_BANNER, target, {
        theme: "light", // 앱은 라이트 고정(§0) — "auto"면 배너만 기기 다크 설정을 따라간다(§8-15)
        variant: "card",
        callbacks: {
          onAdRendered: () => track(EVENT.adBannerImpression, { screen: screen ?? "" }, "impression"),
          onNoFill: () => console.warn("[banner] 채울 광고가 없어요"),
          onAdFailedToRender: (p) => console.error(p.error),
        },
      });
      detach = () => attached?.destroy();
    } catch (err) {
      console.error(err);
    }
    return () => {
      try {
        detach?.();
      } catch {
        /* noop */
      }
    };
  }, [ready, screen]);

  // 광고 ID가 비어도 자리를 확보한다(늦게 끼어드는 배너는 오인 요소가 된다).
  return (
    <div
      ref={targetRef}
      style={{ width: "100%", height, background: AD_GROUP_ID_BANNER === "" ? "transparent" : undefined }}
    />
  );
}
