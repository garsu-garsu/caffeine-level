const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 다음 취침(23:00 KST) 시각 — 오늘 23:00이 이미 지났으면 내일 23:00(§1 상태표 (b)안, §12.8 #13).
 * 00:30처럼 자정을 막 넘긴 경우도 "오늘"(같은 KST 날짜) 23:00이 아직 안 지났으므로 그대로 맞다.
 */
export function bedtimeMsOf(nowMs: number): number {
  const kst = new Date(nowMs + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const bedtime = Date.UTC(y, m, d, 23, 0, 0) - KST_OFFSET_MS;
  return bedtime <= nowMs ? bedtime + DAY_MS : bedtime;
}
