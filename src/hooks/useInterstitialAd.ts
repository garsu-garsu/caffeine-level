import { loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";

import { EVENT, track } from "../lib/analytics";
import { AD_GROUP_ID_INTERSTITIAL } from "../lib/env";

// 세션당 1회 이하(기획.md §3) — 모듈 스코프라 화면이 다시 마운트돼도 유지된다.
let shownThisSession = false;

/** 전면광고: 안내 화면 "확인했어요" 탭에서만, 세션당 최대 1회(기획.md §3). joeunnal 그대로. */
export function useInterstitialAd() {
  const [ready, setReady] = useState(false);
  const supportedRef = useRef(false);
  const unloadRef = useRef<(() => void) | null>(null);

  const load = useCallback(() => {
    if (AD_GROUP_ID_INTERSTITIAL === "") return;
    try {
      if (!loadFullScreenAd.isSupported()) return;
      supportedRef.current = true;
      unloadRef.current = loadFullScreenAd({
        options: { adGroupId: AD_GROUP_ID_INTERSTITIAL },
        onEvent: (e) => {
          if (e.type === "loaded") setReady(true);
        },
        onError: (err) => console.error(err),
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    load();
    return () => unloadRef.current?.();
  }, [load]);

  const maybeShow = useCallback(
    (onContinue: () => void, context: string) => {
      if (AD_GROUP_ID_INTERSTITIAL === "" || !supportedRef.current || !ready || shownThisSession) {
        onContinue();
        return;
      }
      shownThisSession = true;
      let done = false;
      const once = () => {
        if (!done) {
          done = true;
          onContinue();
        }
      };
      try {
        showFullScreenAd({
          options: { adGroupId: AD_GROUP_ID_INTERSTITIAL },
          onEvent: (e) => {
            if (e.type === "dismissed") {
              track(EVENT.adInterstitialShown, { context });
              setReady(false);
              load();
              once();
            } else if (e.type === "failedToShow") {
              setReady(false);
              load();
              once();
            }
          },
          onError: (err) => {
            console.error(err);
            setReady(false);
            load();
            once();
          },
        });
      } catch (err) {
        console.error(err);
        once();
      }
    },
    [ready, load],
  );

  return { maybeShow };
}
