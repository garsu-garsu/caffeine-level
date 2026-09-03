/** mg/L 표기 규칙(화면설계.md §0 "표기 자리수 판정") — 0.5 미만이면 소수 2자리, 그 외 1자리.
 * 0.5 미만에서 1자리로 반올림하면 상대오차가 커져 실제 배수가 왜곡돼 보인다(N-2류 사고 재발 방지).
 * mg 값의 자리수 규칙은 formatRemainingMg 쪽으로 분리했다(18~19차). */
export function formatMgL(v: number): string {
  return v < 0.5 ? v.toFixed(2) : v.toFixed(1);
}

/** 잔량(mg) 표기 규칙(18~19차) — 1mg 미만이면 소수 1자리, 그 외 정수.
 * 카운트다운(§0)이 도는 동안 잔량이 정수 반올림으로 "약 0mg"이 돼버리면 "다 안 빠졌는데 0"이라는
 * 모순으로 읽힌다 — 그 구간에서만 소수 1자리로 실제 남은 양을 보여준다. */
export function formatRemainingMg(mg: number): string {
  return mg < 1 ? mg.toFixed(1) : Math.round(mg).toString();
}
