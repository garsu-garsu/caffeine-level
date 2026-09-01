import { useEffect, useState } from "react";
import { Button, ProgressBar, Switch, TextButton, useToast } from "@toss/tds-mobile";

import {
  PRESETS,
  concentrationMgL,
  curvePoints,
  remainingMg,
  todayTotalMg,
  type Drink,
  type Profile,
} from "../../lib/caffeine";
import { bedtimeMsOf } from "../../lib/bedtime";
import { toKstDateKey } from "../../lib/dateKey";
import { EVENT, track } from "../../lib/analytics";
import { formatMgL } from "../../lib/format";
import { SLOTS, requestNotifyConsent } from "../../lib/notify";
import type { NotifyState } from "../../lib/storage";
import { BannerAd } from "../../components/BannerAd";
import { Card, ScreenScroll } from "../../components/ScreenLayout";
import { IvBag } from "../../components/IvBag";
import { CurveChart } from "../../components/CurveChart";
import { palette } from "../../theme";
import { RecordSheet } from "./RecordSheet";

const TOP5_CHIPS: (keyof typeof PRESETS)[] = [
  "americano_tall",
  "americano_grande",
  "espresso",
  "cold_brew",
  "energy_250",
];

const PM1500_CODE = SLOTS.find((s) => s.label === "오후 3시")!.code;

function makeId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function HomeScreen({
  drinks,
  profile,
  notify,
  now,
  notificationEntry,
  onAddDrink,
  onRemoveDrink,
  onNotifyChange,
  onNavigate,
}: {
  drinks: Drink[];
  profile: Profile;
  notify: NotifyState;
  now: number;
  notificationEntry: boolean;
  onAddDrink: (drink: Drink) => void;
  onRemoveDrink: (id: string) => void;
  onNotifyChange: (next: NotifyState) => void;
  onNavigate: (screen: "personalize" | "notify" | "guide") => void;
}) {
  const { openToast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [simOn, setSimOn] = useState(notificationEntry);
  const [simPreset, setSimPreset] = useState<keyof typeof PRESETS | null>(null);
  const [curveRange, setCurveRange] = useState<"9h" | "24h">("9h");

  useEffect(() => {
    if (notificationEntry) track(EVENT.simOpened, { entry: "notification" });
  }, [notificationEntry]);

  const currentConc = concentrationMgL(drinks, profile, now);
  const currentRemain = remainingMg(currentConc, profile.weightKg);
  const bedtimeMs = bedtimeMsOf(now);
  const bedtimeIsTomorrow = toKstDateKey(bedtimeMs) !== toKstDateKey(now);
  // curvePoints로 통일(check-core.ts #12가 실제·시뮬 양쪽을 이 경로로 검증한다 — N-8).
  const bedtimeConc = curvePoints(drinks, profile, bedtimeMs, bedtimeMs, 1)[0].mgL;
  const bedtimeRemain = remainingMg(bedtimeConc, profile.weightKg);

  const simDrinks: Drink[] | null =
    simOn && simPreset != null ? [...drinks, { id: "sim", at: now, mg: PRESETS[simPreset].mg, preset: simPreset }] : null;
  const simBedtimeConc = simDrinks != null ? curvePoints(simDrinks, profile, bedtimeMs, bedtimeMs, 1)[0].mgL : null;
  const simBedtimeRemain = simBedtimeConc != null ? remainingMg(simBedtimeConc, profile.weightKg) : null;

  // step 10분 — tmax(38.6분) 근처 샘플이 30분 간격이면 1개뿐이라 곡선이 꺾인 각으로 보인다(N-5).
  const range9h = { from: now - 3 * 3_600_000, to: now + 6 * 3_600_000, step: 10 };
  const range24h = { from: now - 12 * 3_600_000, to: now + 12 * 3_600_000, step: 15 };
  const { from, to, step } = curveRange === "9h" ? range9h : range24h;
  const mainPoints = curvePoints(drinks, profile, from, to, step);
  const simPoints = simDrinks != null ? curvePoints(simDrinks, profile, from, to, step) : null;

  const todayMg = todayTotalMg(drinks, now, toKstDateKey);
  const progress = Math.min(todayMg / 400, 1);

  const notifyCardVisible = drinks.length > 0 && !notify.askedAfterFirstLog;

  const logDrink = (mg: number, atMs: number, preset: string) => {
    const wasFirst = drinks.length === 0;
    const drink: Drink = { id: makeId(), at: atMs, mg, preset };
    onAddDrink(drink);
    if (preset === "custom") {
      track(EVENT.drinkLogged, { preset, hour: new Date(atMs).getHours() });
    } else {
      track(EVENT.drinkLogged, { preset, amount_mg: mg, hour: new Date(atMs).getHours() });
    }
    if (wasFirst) track(EVENT.drinkLoggedFirst);
    if (simOn && simPreset === preset) track(EVENT.simToLog, { preset });
    setSheetOpen(false);
    openToast("기록했어요", { button: { text: "취소", onClick: () => onRemoveDrink(drink.id) } });
  };

  const toggleSim = (next: boolean) => {
    setSimOn(next);
    if (!next) setSimPreset(null);
    else track(EVENT.simOpened, { entry: "toggle" });
  };

  const pickChip = (key: keyof typeof PRESETS) => {
    setSimPreset((prev) => (prev === key ? null : key));
    if (simPreset !== key) track(EVENT.simPreviewed, { preset: key });
  };

  const respondNotifyCard = async (agree: boolean) => {
    if (agree) {
      track(EVENT.notifyConsentRequested, { trigger: "after_first_log", slot: PM1500_CODE });
      const result = await requestNotifyConsent(PM1500_CODE);
      if (result !== "agreementRejected" && result != null) {
        track(EVENT.notifyConsentAgreed, { slot: PM1500_CODE });
        onNotifyChange({
          agreed: notify.agreed.includes(PM1500_CODE) ? notify.agreed : [...notify.agreed, PM1500_CODE],
          askedAfterFirstLog: true,
        });
        return;
      }
    }
    onNotifyChange({ ...notify, askedAfterFirstLog: true });
  };

  return (
    <>
      <ScreenScroll>
        <p style={{ margin: "0 0 4px", fontSize: 15, color: palette.sub }}>지금 몸속 카페인(추정)</p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 60, fontWeight: 800, color: palette.brown, lineHeight: 1 }}>
              {formatMgL(currentConc)} <span style={{ fontSize: 24 }}>mg/L</span>
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 15, color: palette.sub }}>잔량 약 {Math.round(currentRemain)}mg</p>
          </div>
          <IvBag remainingMg={currentRemain} />
        </div>

        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: palette.ink }}>
              {curveRange === "9h" ? "최근 3시간~앞으로 6시간" : "곡선(24시간)"}
            </span>
            <TextButton
              size="small"
              onClick={() => {
                const nextRange = curveRange === "9h" ? "24h" : "9h";
                setCurveRange(nextRange);
                track(EVENT.curveRangeToggled, { range: nextRange });
              }}
            >
              {curveRange === "9h" ? "24시간 보기" : "확대해서 보기"}
            </TextButton>
          </div>
          <CurveChart
            points={mainPoints}
            simPoints={simPoints}
            nowMs={now}
            bedtimeMs={bedtimeMs}
            drinkAtTimes={drinks.map((d) => d.at)}
            fromMs={from}
            toMs={to}
            range={curveRange}
            currentMgL={currentConc}
            bedtimeMgL={bedtimeConc}
            bedtimeRemainMg={bedtimeRemain}
            empty={drinks.length === 0}
            bedtimeIsTomorrow={bedtimeIsTomorrow}
          />
        </Card>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: palette.ink }}>한 잔 더 마시면 취침 때 얼마나?</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TextButton size="small" onClick={() => toggleSim(!simOn)}>
              미리보기
            </TextButton>
            <Switch checked={simOn} onChange={(e) => toggleSim(e.target.checked)} />
          </div>
        </div>
        <p style={{ margin: "2px 0 8px", fontSize: 13, color: palette.sub }}>기록되지 않아요, 미리보기예요</p>

        {simOn && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }}>
            {TOP5_CHIPS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => pickChip(key)}
                style={{
                  flexShrink: 0,
                  borderRadius: 999,
                  border: simPreset === key ? `1.5px solid ${palette.brown}` : "1px solid #DAD3C6",
                  background: simPreset === key ? "#F1E6D8" : "#FFFFFF",
                  padding: "8px 14px",
                  fontSize: 13,
                  color: palette.ink,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {PRESETS[key].label} {PRESETS[key].mg}mg
              </button>
            ))}
          </div>
        )}

        <div style={{ margin: "16px 0" }}>
          <p style={{ margin: 0, fontSize: 15, color: palette.ink }}>
            🌙 {bedtimeIsTomorrow ? "내일 " : ""}취침(23:00) 예상 {formatMgL(bedtimeConc)} mg/L (약 {Math.round(bedtimeRemain)}mg)
          </p>
          {simOn && simBedtimeConc != null && simBedtimeRemain != null && (
            <p style={{ margin: "4px 0 0", fontSize: 15, color: palette.ink }}>
              한 잔 더 마시면 → {formatMgL(simBedtimeConc)} mg/L (약 {Math.round(simBedtimeRemain)}mg)
            </p>
          )}
        </div>

        <div style={{ margin: "16px 0" }}>
          <p style={{ margin: "0 0 8px", fontSize: 14, color: palette.ink }}>
            오늘 섭취 {Math.round(todayMg)}mg / 400mg (식약처 성인 권고)
          </p>
          <ProgressBar progress={progress} size="bold" color={palette.brown} animate />
        </div>

        {notifyCardVisible && (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 12px", fontSize: 15, color: palette.ink }}>
              커피 마실 때 기록하는 걸 잊지 않게, 오후 3시에 알려드릴까요?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="weak" onClick={() => void respondNotifyCard(false)}>
                나중에
              </Button>
              <Button color="primary" onClick={() => void respondNotifyCard(true)}>
                네, 알려주세요
              </Button>
            </div>
          </Card>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0" }}>
          <button
            type="button"
            aria-label="알림 설정"
            onClick={() => onNavigate("notify")}
            style={{ border: "none", background: "transparent", fontSize: 22, padding: 8, cursor: "pointer" }}
          >
            🔔
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <TextButton size="small" variant="underline" onClick={() => onNavigate("personalize")}>
              내 몸에 맞추기
            </TextButton>
            <span style={{ color: palette.sub }}>·</span>
            <TextButton size="small" variant="underline" onClick={() => onNavigate("guide")}>
              안내
            </TextButton>
          </div>
        </div>

        <Button color="primary" variant="fill" display="full" size="xlarge" onClick={() => setSheetOpen(true)}>
          마셨어요, 기록하기
        </Button>

        <div style={{ margin: "24px 0 0", borderTop: "1px solid #EDE6D9" }} />
        <div style={{ marginTop: 12 }}>
          <BannerAd screen="home" />
        </div>
      </ScreenScroll>

      <RecordSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        todayDrinks={drinks.filter((d) => toKstDateKey(d.at) === toKstDateKey(now))}
        nowMs={now}
        onPick={(key, atMs) => logDrink(PRESETS[key].mg, atMs, key)}
        onCustomAdd={(mg, atMs) => logDrink(mg, atMs, "custom")}
        onRemove={onRemoveDrink}
      />
    </>
  );
}
