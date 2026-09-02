const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BEDTIME = "23:00";
const BEDTIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" 정규화 — 형식이 안 맞으면 fallback. 옛 저장값·손상된 값 경로를 막는다(normalizeWeightKg와 같은 이유).
 * 21:00~02:00 범위는 강제하지 않는다 — <input type="time">의 min/max는 입력을 막아주지 않을 수 있고,
 * 취침 시각은 계산 기준점일 뿐이라 범위 밖 값(예: 05:00)이 와도 수식은 그대로 성립한다. */
export function normalizeBedtime(input: unknown, fallback: string = DEFAULT_BEDTIME): string {
  return typeof input === "string" && BEDTIME_RE.test(input) ? input : fallback;
}

/** ms → KST "HH:MM". 기록 시트의 시각 입력 기본값 표시 등 화면 쪽에서도 재사용한다. */
export function toKstHHMM(ms: number): string {
  const kst = new Date(ms + KST_OFFSET_MS);
  return `${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * 다음 취침(설정 시각 KST) — 오늘 그 시각이 이미 지났으면 내일(§1 상태표 (b)안, §12.8 #13).
 * 규칙은 시각과 무관하게 하나다: "오늘 날짜 + bedtime"을 만들고 now 이하면 하루 더한다.
 * 자정 넘는 취침(예: 01:30)도 특례 없이 이 규칙만으로 맞다 — 지난 01:30은 자동으로 내일 01:30이 된다.
 */
export function bedtimeMsOf(nowMs: number, bedtime: string = DEFAULT_BEDTIME): number {
  const [h, m] = normalizeBedtime(bedtime).split(":").map(Number);
  const kst = new Date(nowMs + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const mo = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const target = Date.UTC(y, mo, d, h, m, 0) - KST_OFFSET_MS;
  return target <= nowMs ? target + DAY_MS : target;
}

/**
 * 직전 발생(설정 시각 KST) — 마신 시각은 미래일 수 없다. 오늘 그 시각이 아직 안 왔으면 어제(§12.8 #14).
 * bedtimeMsOf와 방향이 정반대다 — 부호만 안 뒤집는 게 실제 사고 유형이라 함수명을 다르게 잡았다.
 * 파싱 실패 시 폴백은 "지금"의 HH:MM이다 — "지금 마셨다"가 유일하게 안전한 해석이라서(취침의 기본값
 * "23:00"과 다른 이유).
 */
export function lastOccurrenceMs(nowMs: number, hhmm: string): number {
  const kst = new Date(nowMs + KST_OFFSET_MS);
  const [h, m] = normalizeBedtime(hhmm, toKstHHMM(nowMs)).split(":").map(Number);
  const y = kst.getUTCFullYear();
  const mo = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const target = Date.UTC(y, mo, d, h, m, 0) - KST_OFFSET_MS;
  return target > nowMs ? target - DAY_MS : target;
}
