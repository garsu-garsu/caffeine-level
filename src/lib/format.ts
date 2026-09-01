/** mg/L 표기 규칙(화면설계.md §0 "표기 자리수 판정") — 0.5 미만이면 소수 2자리, 그 외 1자리.
 * 0.5 미만에서 1자리로 반올림하면 상대오차가 커져 실제 배수가 왜곡돼 보인다(N-2류 사고 재발 방지).
 * mg 값은 이 규칙의 대상이 아니다(항상 정수). */
export function formatMgL(v: number): string {
  return v < 0.5 ? v.toFixed(2) : v.toFixed(1);
}
