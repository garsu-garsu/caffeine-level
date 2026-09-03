/**
 * 혈중 카페인 농도 계산 — 1구획 + 1차 흡수 모델 (기획.md §2·§12.1 확정).
 *
 *   C(t) = (용량 / (0.6 × 체중kg)) × ka/(ka−ke) × (e^(−ke·t) − e^(−ka·t))   [mg/L]
 *   ke = ln2 / 개인반감기,  ka = 6/h,  Vd = 0.6 L/kg,  F = 1.0
 *
 * 순수 함수만 담는다. React·DOM·localStorage 의존 없음(테스트가 직접 호출한다).
 */

const KA_PER_HOUR = 6;
const VD_L_PER_KG = 0.6;
const WEIGHT_DEFAULT_KG = 70;
const WEIGHT_MIN_KG = 30;
const WEIGHT_MAX_KG = 200;

export interface Drink {
  id: string;
  /** unix ms(서버보정, §12.4) — 마신 시각 */
  at: number;
  mg: number;
  preset: string;
}

export interface Profile {
  weightKg: number;
  smoker: boolean;
  /** 경구피임약(에스트로겐 함유) 복용 여부 */
  oc: boolean;
}

export interface PresetInfo {
  mg: number;
  label: string;
  /** 편차가 커 단일값 단정 표기가 안 되는 프리셋만(§8-25). 있으면 화면에 반드시 병기. */
  note?: string;
}

/** §12.1 확정 — 커피전문점 샷 수 기반 + 식약처/브랜드 공개값. 12개(14차: 대용량 1종 추가). */
export const PRESETS = {
  espresso: { mg: 75, label: "에스프레소 1샷" },
  americano_tall: { mg: 150, label: "아메리카노 톨" },
  americano_grande: { mg: 225, label: "아메리카노 그란데" },
  americano_xl: { mg: 300, label: "대용량 아메리카노", note: "브랜드·용량별 편차 큼(200~470mg)" },
  instant_mix: { mg: 50, label: "인스턴트 믹스" },
  cold_brew: { mg: 200, label: "콜드브루", note: "제품별 편차 큼(116~404mg)" },
  energy_250: { mg: 60, label: "에너지드링크 250ml" },
  energy_355: { mg: 100, label: "에너지드링크 355ml" },
  // 화면 라벨은 "자양강장제"로 고정 — 의약외품 브랜드명(박카스)을 화면에 쓰지 않는다.
  tonic: { mg: 30, label: "자양강장제" },
  green_tea: { mg: 22, label: "녹차" },
  cola_250: { mg: 32, label: "콜라 250ml" },
  canned_coffee: { mg: 88, label: "캔커피" },
} as const satisfies Record<string, PresetInfo>;

/** 성인 1일 카페인 섭취 권고량(식약처, 절대값·체중 무관) — §12.9. 커피잔 채움 기준. */
export const DAILY_LIMIT_MG = 400;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * 체중 정규화 — 계산 함수 진입부에 둔다(§12.8 하단 판단, A-10).
 * 유한하고 양수인 값만 30~200kg로 클램프, 그 외(0·음수·빈 문자열·NaN·Infinity·null 등)는 기본 70kg.
 * 호출 경로가 여럿(저장된 옛 값·직접 입력·프로필 미설정)이라 화면이 아니라 여기서 막는다.
 */
export function normalizeWeightKg(input: unknown): number {
  const n = typeof input === "number" ? input : Number(input);
  return Number.isFinite(n) && n > 0 ? clamp(n, WEIGHT_MIN_KG, WEIGHT_MAX_KG) : WEIGHT_DEFAULT_KG;
}

/**
 * 개인반감기 — 배타 분기다(§2, §12.1). 곱셈으로 구현하면 안 된다.
 * 흡연이 경구피임약을 지배한다. 나올 수 있는 값은 {3.0, 5.0, 7.5} 세 개뿐이다.
 */
export function halfLifeHours(profile: Pick<Profile, "smoker" | "oc">): number {
  if (profile.smoker) return 3.0;
  if (profile.oc) return 7.5;
  return 5.0;
}

function keFromHalfLife(halfLifeH: number): number {
  return Math.LN2 / halfLifeH;
}

/** 흡수·소실 곡선의 최고점 시각(반감기만의 함수, 용량·체중 무관) — §12.8 #1·#6. */
export function tmaxHours(halfLifeH: number): number {
  const ke = keFromHalfLife(halfLifeH);
  const ka = KA_PER_HOUR;
  return Math.log(ka / ke) / (ka - ke);
}

/** 섭취 1건이 tHours 시간 뒤에 만드는 혈중농도 기여분 [mg/L]. 아직 안 마셨으면(t<=0) 0. */
function singleDoseMgL(mg: number, weightKg: number, halfLifeH: number, tHours: number): number {
  if (tHours <= 0) return 0;
  const ke = keFromHalfLife(halfLifeH);
  const ka = KA_PER_HOUR;
  const vd = VD_L_PER_KG * weightKg;
  return (mg / vd) * (ka / (ka - ke)) * (Math.exp(-ke * tHours) - Math.exp(-ka * tHours));
}

/** 여러 잔의 혈중농도 — 선형 중첩(§2). 각 섭취의 기여를 더할 뿐, "2배" 같은 지름길 없음. */
export function concentrationMgL(drinks: Drink[], profile: Profile, atMs: number): number {
  const weightKg = normalizeWeightKg(profile.weightKg);
  const halfLifeH = halfLifeHours(profile);
  return drinks.reduce(
    (sum, d) => sum + singleDoseMgL(d.mg, weightKg, halfLifeH, (atMs - d.at) / 3_600_000),
    0,
  );
}

/** mg/L 농도를 몸속 잔량(mg)으로 환산 — 화면에 mg/L와 항상 병기(§0). */
export function remainingMg(concMgL: number, weightKg: unknown): number {
  return concMgL * VD_L_PER_KG * normalizeWeightKg(weightKg);
}

export interface CurvePoint {
  /** unix ms */
  t: number;
  mgL: number;
}

/**
 * 곡선 좌표. 범위를 인자로 받는다(§12.5) — 기본 뷰(−3h~+6h)와 24시간 토글이 같은 함수를 쓴다.
 * 시뮬레이션도 신규 로직 0줄: curvePoints(drinks.concat([가상 1건]), ...)로 같은 함수를 재호출한다.
 */
export function curvePoints(
  drinks: Drink[],
  profile: Profile,
  fromMs: number,
  toMs: number,
  stepMin: number,
): CurvePoint[] {
  const stepMs = stepMin * 60_000;
  const points: CurvePoint[] = [];
  for (let t = fromMs; t <= toMs; t += stepMs) {
    points.push({ t, mgL: concentrationMgL(drinks, profile, t) });
  }
  return points;
}

export const ZERO_THRESHOLD_MGL = 0.005; // formatMgL의 소수 2자리 표기에서 0.00으로 반올림되는 경계
const ZERO_SEARCH_MAX_MS = 7 * 24 * 3_600_000;
const ZERO_SEARCH_ITERATIONS = 20; // log2(604800초) ≈ 19.2

/**
 * 카페인이 다 빠지는 시각(§0·§1 18~19차) — concentrationMgL이 임계 미만으로 내려가는 첫 시점.
 * curvePoints(등간격 샘플러)는 초 단위 경계를 못 좁혀 재사용하지 않고 이분 탐색한다.
 * 탐색 시작점은 "마지막 섭취.at + tmax" — tmax는 반감기만의 함수라 잔이 몇 개든 시작점이 하나고,
 * 그 시점이면 이미 마신 모든 잔이 각자의 피크를 지나 하강 중이므로 그 뒤로는 단조 감소가 보장된다.
 * 7일 안에 임계 밑으로 안 내려가거나 기록이 없으면 null.
 */
export function zeroCrossingMs(drinks: Drink[], profile: Profile): number | null {
  if (drinks.length === 0) return null;
  const halfLifeH = halfLifeHours(profile);
  const lastAt = Math.max(...drinks.map((d) => d.at));
  let lo = lastAt + tmaxHours(halfLifeH) * 3_600_000;
  if (concentrationMgL(drinks, profile, lo) < ZERO_THRESHOLD_MGL) return lo;
  let hi = lo + ZERO_SEARCH_MAX_MS;
  if (concentrationMgL(drinks, profile, hi) >= ZERO_THRESHOLD_MGL) return null;
  for (let i = 0; i < ZERO_SEARCH_ITERATIONS; i += 1) {
    const mid = (lo + hi) / 2;
    if (concentrationMgL(drinks, profile, mid) < ZERO_THRESHOLD_MGL) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** 오늘 섭취 합계 — 리셋은 상태가 아니라 필터다(§12.4). KST 날짜 키가 같은 기록만 더한다. */
export function todayTotalMg(drinks: Drink[], nowMs: number, toKstDateKey: (unixMs: number) => string): number {
  const todayKey = toKstDateKey(nowMs);
  return drinks.filter((d) => toKstDateKey(d.at) === todayKey).reduce((sum, d) => sum + d.mg, 0);
}
