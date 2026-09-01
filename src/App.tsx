import { graniteEvent } from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";

import { HomeScreen } from "./features/home/HomeScreen";
import { NotifyScreen } from "./features/notify/NotifyScreen";
import { PersonalizeScreen } from "./features/personalize/PersonalizeScreen";
import { GuideScreen } from "./features/guide/GuideScreen";
import { useNow } from "./hooks/useNow";
import { EVENT, track, trackScreen } from "./lib/analytics";
import type { Drink, Profile } from "./lib/caffeine";
import { addDrink, loadDrinks, loadNotify, loadProfile, removeDrink, saveNotify, saveProfile } from "./lib/storage";
import type { NotifyState } from "./lib/storage";
import { isInTossApp } from "./lib/tossEnv";

type Screen = "home" | "personalize" | "notify" | "guide";

export default function App() {
  const now = useNow();
  const [stack, setStack] = useState<Screen[]>(["home"]);
  const [drinks, setDrinks] = useState<Drink[]>(() => loadDrinks(Date.now()));
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [notify, setNotify] = useState<NotifyState>(() => loadNotify());
  // 첫 렌더 전에 확정해야 HomeScreen의 useState(notificationEntry) 초기값이 이 값을 받는다 —
  // useEffect/useRef로 늦게 채우면 리렌더가 안 일어나 시뮬 토글이 영원히 안 켜진다(R-1).
  const [entry] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get("entry") ?? "icon";
    } catch {
      return "icon";
    }
  });

  useEffect(() => {
    track(EVENT.appOpen, { entry });
  }, [entry]);

  const current = stack[stack.length - 1];
  const canPop = stack.length > 1;
  useEffect(() => {
    if (!canPop) return undefined;
    try {
      return graniteEvent.addEventListener("backEvent", {
        onEvent: () => setStack((v) => v.slice(0, -1)),
      });
    } catch {
      return undefined;
    }
  }, [canPop]);

  useEffect(() => {
    trackScreen(current);
  }, [current]);

  const push = (screen: Screen) => setStack((v) => [...v, screen]);
  const goHome = () => setStack(["home"]);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {current === "home" && (
        <HomeScreen
          drinks={drinks}
          profile={profile}
          notify={notify}
          now={now}
          notificationEntry={entry === "notification"}
          onAddDrink={(drink) => setDrinks((prev) => addDrink(prev, drink))}
          onRemoveDrink={(id) => setDrinks((prev) => removeDrink(prev, id))}
          onNotifyChange={(next) => {
            saveNotify(next);
            setNotify(next);
          }}
          onNavigate={(screen) => {
            if (screen === "personalize") track(EVENT.personalizeOpened);
            push(screen);
          }}
        />
      )}
      {current === "personalize" && (
        <PersonalizeScreen
          profile={profile}
          onApply={(next) => {
            saveProfile(next);
            setProfile(next);
          }}
          onBack={goHome}
        />
      )}
      {current === "notify" && (
        <NotifyScreen
          notify={notify}
          onChange={(next) => {
            saveNotify(next);
            setNotify(next);
          }}
        />
      )}
      {current === "guide" && <GuideScreen onBack={goHome} />}
      {/* 토스 앱 안에서는 navigationBar.withBackButton이 네이티브 뒤로가기를 이미 그린다 —
          브라우저 둘러보기(QA)에서만 폴백으로 그린다. */}
      {current !== "home" && !isInTossApp() && <BackRow onBack={goHome} />}
    </div>
  );
}

/** 브라우저 둘러보기 전용 뒤로가기 폴백. */
function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ position: "fixed", top: "max(8px, env(safe-area-inset-top))", left: 8, zIndex: 1 }}>
      <button
        type="button"
        onClick={onBack}
        aria-label="뒤로"
        style={{ border: "none", background: "transparent", fontSize: 22, padding: 8, cursor: "pointer" }}
      >
        ←
      </button>
    </div>
  );
}
