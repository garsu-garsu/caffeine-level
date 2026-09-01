import { DAILY_LIMIT_MG } from "../lib/caffeine";
import { palette } from "../theme";

/**
 * 링거(수액백) 시각화 — 화면설계.md §6-1(8차 개정, 컵→링거 교체). 채움 = 잔량mg / 400mg
 * (clamp 0~1), 400은 화면에 절대 그리지 않는다(눈금·숫자·% 없음). 색은 단색 브라운 고정,
 * 넘쳐도 가득 찬 상태로 정지. 백(수액백)+걸이+튜브 3파츠 — 채움은 백 본체에만.
 * 의료 기호(주삿바늘·적십자·혈액방울·병원 마크) 금지, 튜브 끝은 방울 없이 프레임 밖으로 잘린다.
 */
export function IvBag({ remainingMg }: { remainingMg: number }) {
  const ratio = Math.min(Math.max(remainingMg / DAILY_LIMIT_MG, 0), 1);
  // 백 본체(둥근 사각형): y 20~80. 채움 높이는 clipPath 안 rect의 y/height만 바꾼다.
  const bagTop = 20;
  const bagBottom = 80;
  const fillY = bagBottom - (bagBottom - bagTop) * ratio;

  return (
    <svg
      width={72}
      height={96}
      viewBox="0 0 72 96"
      role="img"
      aria-label={`몸에 남은 카페인 약 ${Math.round(remainingMg)}mg`}
    >
      <defs>
        <clipPath id="bagClip">
          <rect x={14} y={bagTop} width={44} height={bagBottom - bagTop} rx={8} />
        </clipPath>
      </defs>

      {/* 걸이 — 세로선 + 고리 */}
      <circle cx={36} cy={3} r={3} fill="none" stroke="#B8B2A8" strokeWidth={1.5} />
      <line x1={36} y1={6} x2={36} y2={20} stroke="#B8B2A8" strokeWidth={1.5} />

      {/* 채움(백 본체에만) */}
      <rect
        x={14}
        y={fillY}
        width={44}
        height={bagBottom - fillY}
        fill={palette.brown}
        clipPath="url(#bagClip)"
        style={{ transition: "y 300ms, height 300ms" }}
      />
      {/* 백 외곽선 */}
      <rect x={14} y={bagTop} width={44} height={bagBottom - bagTop} rx={8} fill="none" stroke="#B8B2A8" strokeWidth={2} />

      {/* 튜브 — 프레임 밖으로 잘린 것처럼, 방울 없음 */}
      <line x1={36} y1={80} x2={36} y2={96} stroke="#B8B2A8" strokeWidth={1.5} />
    </svg>
  );
}
