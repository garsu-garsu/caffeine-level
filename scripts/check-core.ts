/**
 * `npm run check:core` — 계산 모델이 깨지면 여기서 터진다.
 * localStorage·DOM·SDK 없이 `lib/caffeine.ts`·`lib/dateKey.ts` 의 순수 함수만 검증한다.
 * 기준값 출처: 기획.md §12.8(자가검증 11개) + 심사-2차.md N-2(자가검증 #12, 선형 중첩을
 * "2배"로 오해하는 구현을 막는다).
 */
import assert from "node:assert/strict";

import {
  PRESETS,
  concentrationMgL,
  curvePoints,
  halfLifeHours,
  normalizeWeightKg,
  remainingMg,
  tmaxHours,
  todayTotalMg,
  zeroCrossingMs,
  type Drink,
  type Profile,
} from "../src/lib/caffeine.ts";
import { bedtimeMsOf, lastOccurrenceMs } from "../src/lib/bedtime.ts";
import { toKstDateKey } from "../src/lib/dateKey.ts";
import { formatRemainingMg } from "../src/lib/format.ts";

function assertClose(got: number, want: number, tol: number, label: string): void {
  assert.ok(
    Math.abs(got - want) <= tol,
    `${label}: ${got} !== ${want} (오차 허용 ±${tol})`,
  );
}

const BASE_PROFILE: Profile = { weightKg: 70, smoker: false, oc: false };
const HOUR_MS = 3_600_000;

function drink(mg: number, atMs: number, preset = "americano_tall"): Drink {
  return { id: String(atMs), at: atMs, mg, preset };
}

/* 1·2·3·6·7 — 기준 케이스: 70kg 성인, 아메리카노 톨 150mg, 반감기 5.0h, ka 6/h */
const t0 = 0;
const oneDrink = [drink(150, t0)];
const halfLifeH = halfLifeHours(BASE_PROFILE); // 5.0
const tmaxH = tmaxHours(halfLifeH);
const tmaxMin = tmaxH * 60;

// #1 최고점 시각
assert.ok(tmaxMin >= 30 && tmaxMin <= 45, `tmax(${tmaxMin}분)이 문헌 범위(30~45분) 밖`);
assertClose(tmaxMin, 38.6, 0.1, "#1 tmax");

// #2 최고 농도
const cmax = concentrationMgL(oneDrink, BASE_PROFILE, tmaxH * HOUR_MS);
assert.ok(cmax >= 2.5 && cmax <= 4.5, `Cmax(${cmax})가 문헌 범위(2.5~4.5) 밖`);
assertClose(cmax, 3.27, 0.01, "#2 Cmax");

// #3 말기 반감 — 5시간마다 정확히 절반
const c6 = concentrationMgL(oneDrink, BASE_PROFILE, 6 * HOUR_MS);
const c11 = concentrationMgL(oneDrink, BASE_PROFILE, 11 * HOUR_MS);
assertClose(c11 / c6, 0.5, 0.001, "#3 C(11h)/C(6h)");

// #4 선형 중첩
const sameTimeTwo = [drink(150, t0), drink(150, t0)];
const c1 = concentrationMgL(oneDrink, BASE_PROFILE, tmaxH * HOUR_MS);
const c2Same = concentrationMgL(sameTimeTwo, BASE_PROFILE, tmaxH * HOUR_MS);
assertClose(c2Same, c1 * 2, 1e-9, "#4 같은 시각 2잔 === 1잔 × 2");

const drinkA = drink(150, 0);
const drinkB = drink(100, 3 * HOUR_MS);
const evalAt = 5 * HOUR_MS;
const combined = concentrationMgL([drinkA, drinkB], BASE_PROFILE, evalAt);
const separateSum =
  concentrationMgL([drinkA], BASE_PROFILE, evalAt) + concentrationMgL([drinkB], BASE_PROFILE, evalAt);
assertClose(combined, separateSum, 1e-9, "#4 다른 시각 섭취 = 각 잔의 합");

// #5 반감기 분기 — 배타 규칙. 곱셈으로 되돌리면 여기서 깨진다.
assert.equal(halfLifeHours({ smoker: true, oc: false }), 3.0, "#5 흡연 → 3.0h");
assert.equal(halfLifeHours({ smoker: false, oc: true }), 7.5, "#5 경구피임약 → 7.5h");
assert.equal(halfLifeHours({ smoker: true, oc: true }), 3.0, "#5 흡연+경구피임약 → 3.0h(흡연 우선, 곱 아님)");
assert.equal(halfLifeHours({ smoker: false, oc: false }), 5.0, "#5 둘 다 아님 → 5.0h");

// #6 세 반감기 모두 tmax 정상
const tmaxExpectMin: [number, number][] = [
  [3.0, 33.9],
  [5.0, 38.6],
  [7.5, 42.4],
];
for (const [hl, wantMin] of tmaxExpectMin) {
  const min = tmaxHours(hl) * 60;
  assert.ok(min >= 30 && min <= 45, `#6 반감기 ${hl}h의 tmax(${min}분)가 문헌 범위 밖`);
  assertClose(min, wantMin, 0.1, `#6 반감기 ${hl}h tmax`);
}

// #7 잔량 병기 — mg/L 옆 잔량 mg이 같은 값에서 유도되는지
const remainAtCmax = remainingMg(cmax, BASE_PROFILE.weightKg);
assertClose(remainAtCmax, 137.2, 0.1, "#7 잔량(tmax 시점)");
assertClose(remainAtCmax, cmax * 0.6 * BASE_PROFILE.weightKg, 1e-9, "#7 잔량 = C(t) × 0.6 × 체중");

// #8 오늘 섭취 합계 — 리셋은 상태가 아니라 필터다(§12.4)
// KST 자정 = UTC 15:00. 자정 직전(어제)·직후(오늘) 기록을 섞는다.
const kstMidnightUtcMs = Date.parse("2026-08-30T15:00:00Z"); // = 2026-08-31 00:00 KST
const drinksAroundMidnight: Drink[] = [
  drink(200, kstMidnightUtcMs - 60_000, "americano_tall"), // 어제 23:59 KST — 오늘 합계와 다른 값이어야 필터 반전을 잡는다
  drink(75, kstMidnightUtcMs, "espresso"), // 오늘 00:00 KST
  drink(75, kstMidnightUtcMs + 60_000, "espresso"), // 오늘 00:01 KST
];
const todayTotal = todayTotalMg(drinksAroundMidnight, kstMidnightUtcMs + 60_000, toKstDateKey);
assert.equal(todayTotal, 150, "#8 오늘 섭취 합계는 KST 날짜 키가 같은 기록만 더한다");

// #9 곡선 좌표 — step 10분(N-5, 기본 뷰와 동일 간격)
const points = curvePoints(oneDrink, BASE_PROFILE, -3 * HOUR_MS, 6 * HOUR_MS, 10);
assert.equal(points.length, (9 * 60) / 10 + 1, "#9 곡선 좌표 개수 = (범위분/step)+1");
assert.ok(
  points.every((p) => p.mgL >= 0),
  "#9 모든 mgL >= 0",
);
const finePoints = curvePoints(oneDrink, BASE_PROFILE, -1 * HOUR_MS, 10 * HOUR_MS, 1);
let turns = 0;
for (let i = 1; i < finePoints.length - 1; i += 1) {
  const prevUp = finePoints[i].mgL > finePoints[i - 1].mgL;
  const nextUp = finePoints[i + 1].mgL > finePoints[i].mgL;
  if (prevUp && !nextUp) turns += 1;
}
assert.equal(turns, 1, "#9 단조 구간이 tmax에서 한 번만 뒤집힘");

// #10 프리셋 — 개수 + 12개 전수 대조(§12.1/14차 확정값). 1·2차 연속 사고 자리라 개수·값·note 셋 다 건다.
assert.equal(Object.keys(PRESETS).length, 12, "#10 프리셋은 12개(14차: 대용량 아메리카노 추가)");
const PRESET_EXPECTED_MG: Record<keyof typeof PRESETS, number> = {
  espresso: 75,
  americano_tall: 150,
  americano_grande: 225,
  americano_xl: 300,
  instant_mix: 50,
  cold_brew: 200,
  energy_250: 60,
  energy_355: 100,
  tonic: 30,
  green_tea: 22,
  cola_250: 32,
  canned_coffee: 88,
};
for (const [key, mg] of Object.entries(PRESET_EXPECTED_MG)) {
  assert.equal(PRESETS[key as keyof typeof PRESETS].mg, mg, `#10 프리셋 ${key} = ${mg}mg`);
}
assert.equal(PRESETS.americano_tall.mg, PRESETS.espresso.mg * 2, "#10 아메리카노 톨 = 에스프레소 × 2");
assert.equal(PRESETS.americano_grande.mg, PRESETS.espresso.mg * 3, "#10 그란데 = 에스프레소 × 3");
assert.equal(PRESETS.americano_xl.mg, PRESETS.espresso.mg * 4, "#10 대용량 = 에스프레소 × 4");
// M-10/14차: 편차가 큰 프리셋의 note가 상수에서 조용히 빠지는 게 이 자리의 실제 재발 유형이다(§8-25).
assert.ok(PRESETS.cold_brew.note, "#10 콜드브루는 편차 큼 문구를 병기해야 한다(§8-25)");
assert.ok(PRESETS.americano_xl.note, "#10 대용량 아메리카노는 편차 큼 문구를 병기해야 한다(§8-25)");
assert.equal(PRESETS.tonic.label, "자양강장제", "#10 tonic 화면 라벨은 브랜드명이 아닌 '자양강장제'");

// #11 체중 경계값 — A-10. 화면이 아니라 계산 함수 진입부에서 막는다.
const weird: unknown[] = [0, -5, "", "abc", NaN, Infinity, null];
for (const w of weird) {
  const n = normalizeWeightKg(w);
  assert.ok(Number.isFinite(n) && n > 0, `#11 체중 입력 ${String(w)} → ${n}은 유한·양수여야 한다`);
}
const weightDefault = normalizeWeightKg(70);
assert.equal(normalizeWeightKg(0), weightDefault, "#11 체중 0 → 70kg과 동일");
assert.equal(normalizeWeightKg(""), weightDefault, "#11 체중 '' → 70kg과 동일");
assert.equal(normalizeWeightKg("abc"), weightDefault, "#11 체중 'abc' → 70kg과 동일");
assert.equal(normalizeWeightKg(25), 30, "#11 체중 25 → 30kg으로 클램프");
assert.equal(normalizeWeightKg(500), 200, "#11 체중 500 → 200kg으로 클램프");

/* #12 — 심사-2차.md N-2, ait-cto 확정치. 시뮬레이션 취침값을 "2배"로 계산하는 구현이 들어오면 깨진다.
 * 회귀 방지선은 부등호(sim > real × 2) 쪽 — 고정값은 기준 케이스 확인용일 뿐이다. */
const now = tmaxH * HOUR_MS; // 마신 뒤 tmax(38.6분) 시점 — §0 목업 조건
// 기존 잔만으로 취침(23:00) 예상이 0.9mg/L이 되는 시각 = 마신 뒤 약 10.111h(§12.8 N-2 검산).
const bedtimeMs = 10.111148511386_27 * HOUR_MS;
const simDrinks = [...oneDrink, drink(150, now, "americano_tall")]; // curvePoints(drinks.concat([가상 1건]), ...)와 동일한 재호출 패턴

// sim/real 값은 curvePoints() 결과에서 읽는다 — 시뮬 전용 계산 경로가 생기면 여기서도 잡힌다.
const realBedtime = curvePoints(oneDrink, BASE_PROFILE, bedtimeMs, bedtimeMs, 1)[0].mgL;
const simBedtime = curvePoints(simDrinks, BASE_PROFILE, bedtimeMs, bedtimeMs, 1)[0].mgL;

assertClose(realBedtime, 0.9, 0.001, "#12 실제 곡선 취침값");
assertClose(simBedtime, 1.8839, 0.001, "#12 시뮬레이션 취침값");
assertClose(remainingMg(simBedtime, BASE_PROFILE.weightKg), 79.1, 0.05, "#12 시뮬레이션 취침 잔량");
assertClose(simBedtime / realBedtime, 2.0932, 0.001, "#12 sim/real 비율");
assert.ok(
  simBedtime > realBedtime * 2,
  `#12 시뮬레이션 취침값(${simBedtime})은 실제 취침값(${realBedtime}) × 2 초과여야 한다 — 섭취 시각이 달라 정확히 2배는 구조적으로 불가능하다("2배" 지름길이면 여기서 깨진다)`,
);

/* #13 — §12.8 일반화(취침 시각 사용자 조정, 11차). 하루 어긋나면 화면값이 조용히 24배 틀린다.
 * 규칙은 시각과 무관하게 하나다 — UI가 21:00~02:00으로 범위를 좁혀도 이 assert는 늘리지 않는다. */
assert.equal(
  bedtimeMsOf(Date.parse("2026-09-01T13:59:00Z"), "23:00"), // 22:59 KST
  Date.parse("2026-09-01T14:00:00Z"), // 오늘(같은 날) 23:00 KST
  "#13 22:59/23:00 → 오늘",
);
assert.equal(
  bedtimeMsOf(Date.parse("2026-09-01T14:00:00Z"), "23:00"), // 23:00 KST 정각
  Date.parse("2026-09-02T14:00:00Z"), // 내일 23:00 KST
  "#13 23:00/23:00 → 내일",
);
assert.equal(
  bedtimeMsOf(Date.parse("2026-09-01T15:30:00Z"), "23:00"), // 다음날 00:30 KST(자정 막 넘김)
  Date.parse("2026-09-02T14:00:00Z"), // 그날(같은 KST 날짜) 23:00 — +1일을 또 더하면 안 된다
  "#13 00:30/23:00 → 그날",
);
assert.equal(
  bedtimeMsOf(Date.parse("2026-09-01T06:00:00Z"), "01:30"), // 15:00 KST, 취침 01:30(자정 넘는 값)
  Date.parse("2026-09-01T16:30:00Z"), // 내일 01:30 KST — 특례 분기 없이 규칙 하나로 나와야 한다
  "#13 15:00/01:30 → 내일 01:30",
);

// 성질: bedtime을 5분 간격 288개(00:00~23:55) 전부 넣어도 now < 결과 <= now + 24h 안에 있다.
const PROPERTY_NOW = Date.parse("2026-09-01T00:00:00Z");
for (let i = 0; i < 288; i += 1) {
  const totalMin = i * 5;
  const bt = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
  const result = bedtimeMsOf(PROPERTY_NOW, bt);
  assert.ok(
    result > PROPERTY_NOW && result <= PROPERTY_NOW + 24 * HOUR_MS,
    `#13 성질: bedtime=${bt} → now < 결과 <= now+24h 위반(${result})`,
  );
}

/* #14 — §12.8 신설(기록 시각 입력, 15차). 마신 시각은 미래일 수 없다 — bedtimeMsOf와 방향이
 * 정반대다. 부호만 안 뒤집는 게 실제 사고 유형이라 두 함수가 같은 입력에서 같은 값을 내면 안 된다. */
const NOW_1400 = Date.parse("2026-09-01T05:00:00Z"); // 14:00 KST
assert.equal(lastOccurrenceMs(NOW_1400, "09:20"), Date.parse("2026-09-01T00:20:00Z"), "#14 14:00/09:20 → 오늘");
assert.equal(lastOccurrenceMs(NOW_1400, "23:30"), Date.parse("2026-08-31T14:30:00Z"), "#14 14:00/23:30 → 어제");
assert.equal(lastOccurrenceMs(NOW_1400, "14:00"), NOW_1400, "#14 14:00/14:00 → 오늘");
assert.equal(lastOccurrenceMs(NOW_1400, "14:01"), Date.parse("2026-08-31T05:01:00Z"), "#14 14:00/14:01 → 어제");
assert.equal(lastOccurrenceMs(NOW_1400, "abc"), NOW_1400, "#14 깨진 입력 → now");
assert.notEqual(
  bedtimeMsOf(NOW_1400, "09:20"),
  lastOccurrenceMs(NOW_1400, "09:20"),
  "#14 bedtimeMsOf와 lastOccurrenceMs는 같은 입력에서 같은 값을 내면 안 된다(방향 반대 확인)",
);

// 성질: 임의 now × HH:MM 288개 전부 now - 24h < 결과 <= now.
for (let i = 0; i < 288; i += 1) {
  const totalMin = i * 5;
  const hhmm = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
  const result = lastOccurrenceMs(PROPERTY_NOW, hhmm);
  assert.ok(
    result > PROPERTY_NOW - 24 * HOUR_MS && result <= PROPERTY_NOW,
    `#14 성질: hhmm=${hhmm} → now-24h < 결과 <= now 위반(${result})`,
  );
}

/* #15 — §12.8 신설(카운트다운, 18~19차). 경계 확인: 결과 시점은 임계 미만, 60초 전은 임계 이상. */
for (const [hl, smoker, oc] of [
  [3.0, true, false],
  [5.0, false, false],
  [7.5, false, true],
] as [number, boolean, boolean][]) {
  const profile: Profile = { weightKg: 70, smoker, oc };
  const zeroAt = zeroCrossingMs(oneDrink, profile);
  assert.ok(zeroAt != null, `#15 반감기 ${hl}h: 7일 안에 임계 밑으로 내려가야 한다`);
  const at = zeroAt as number;
  assertClose(halfLifeHours(profile), hl, 1e-9, `#15 반감기 ${hl}h 분기 확인`);
  assert.ok(concentrationMgL(oneDrink, BASE_PROFILE, at) >= 0, "#15 결과는 유한값");
  assert.ok(
    concentrationMgL(oneDrink, profile, at) < 0.005,
    `#15 반감기 ${hl}h: 결과 시점 농도는 임계(0.005) 미만이어야 한다`,
  );
  assert.ok(
    concentrationMgL(oneDrink, profile, at - 60_000) >= 0.005,
    `#15 반감기 ${hl}h: 결과 60초 전은 아직 임계 이상이어야 한다`,
  );
  assertClose(remainingMg(concentrationMgL(oneDrink, profile, at), 70), 0.21, 0.01, `#15 반감기 ${hl}h 잔량 ≈0.21mg`);
}

// 여러 잔(0h·3h·6h 톨 3잔) — 마지막 잔의 tmax 이후로는 단조 감소해야 한다.
const multiDrinks = [drink(150, 0 * HOUR_MS), drink(150, 3 * HOUR_MS), drink(150, 6 * HOUR_MS)];
const multiZero = zeroCrossingMs(multiDrinks, BASE_PROFILE);
assert.ok(multiZero != null, "#15 여러 잔도 7일 안에 임계 밑으로 내려가야 한다");
const multiStart = 6 * HOUR_MS + tmaxHours(5.0) * HOUR_MS;
let prev = concentrationMgL(multiDrinks, BASE_PROFILE, multiStart);
for (let h = 1; h <= 72; h += 1) {
  const cur = concentrationMgL(multiDrinks, BASE_PROFILE, multiStart + h * HOUR_MS);
  assert.ok(cur <= prev, `#15 여러 잔: 마지막 tmax 이후 단조 감소 위반(h=${h})`);
  prev = cur;
}

/* #16 — §12.8 신설. formatRemainingMg가 카운트다운 도중 "0"으로 뭉개지면 안 된다. */
assert.equal(formatRemainingMg(0.21), "0.2", "#16 formatRemainingMg(0.21)");
assert.equal(formatRemainingMg(137.2), "137", "#16 formatRemainingMg(137.2)");
assert.notEqual(formatRemainingMg(0.21), "0", "#16 카운트다운 도는 동안 잔량이 '0'으로 뭉개지면 안 된다");

console.log("check:core 전부 통과 (assert 1~16)");
