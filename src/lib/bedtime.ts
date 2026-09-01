const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BEDTIME = "23:00";
const BEDTIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" 정규화 — 형식이 안 맞으면 기본값. 옛 저장값·손상된 값 경로를 막는다(normalizeWeightKg와 같은 이유). */
export function normalizeBedtime(input: unknown): string {
  return typeof input === "string" && BEDTIME_RE.test(input) ? input : DEFAULT_BEDTIME;
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
