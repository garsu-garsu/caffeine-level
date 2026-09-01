/**
 * KST(UTC+9) 기준 날짜 키. 오늘 섭취 합계(caffeine.ts `todayTotalMg`)를 가르는 데만 쓴다.
 * §12.4: code-recipes.md §9 dateKey.ts를 통째로 가져오지 않는다 — 연속기록용 유틸은
 * §8이 게이미피케이션을 금지해 불필요하다. 이 함수 하나만 가져온다.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function toKstDateKey(unixMs: number): string {
  const kst = new Date(unixMs + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
