import { DAILY_LIMIT_MG } from "../lib/caffeine";
import { palette } from "../theme";

/**
 * 커피잔 시각화 — 화면설계.md §6-1. 채움 = 잔량mg / 400mg(clamp 0~1), 400은 화면에
 * 절대 그리지 않는다(눈금·숫자·% 없음). 색은 단색 브라운 고정, 넘쳐도 가득 찬 상태로 정지.
 */
export function CoffeeCup({ remainingMg }: { remainingMg: number }) {
  const ratio = Math.min(Math.max(remainingMg / DAILY_LIMIT_MG, 0), 1);
  // 컵 실루엣(사다리꼴): 위 72 아래 52, 높이 88. 채움 높이는 clipPath 안 rect의 y/height만 바꾼다.
  const cupTop = 4;
  const cupBottom = 92;
  const fillY = cupBottom - (cupBottom - cupTop) * ratio;

  return (
    <svg
      width={72}
      height={96}
      viewBox="0 0 72 96"
      role="img"
      aria-label={`몸에 남은 카페인 약 ${Math.round(remainingMg)}mg`}
    >
      <defs>
        <clipPath id="cupClip">
          <path d="M 10 4 L 62 4 L 54 92 L 18 92 Z" />
        </clipPath>
      </defs>
      <rect
        x={0}
        y={fillY}
        width={72}
        height={cupBottom - fillY}
        fill={palette.brown}
        clipPath="url(#cupClip)"
        style={{ transition: "y 300ms, height 300ms" }}
      />
      <path d="M 10 4 L 62 4 L 54 92 L 18 92 Z" fill="none" stroke="#B8B2A8" strokeWidth={2} />
    </svg>
  );
}
