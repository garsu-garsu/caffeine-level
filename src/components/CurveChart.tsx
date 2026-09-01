import type { CurvePoint } from "../lib/caffeine";
import { formatMgL } from "../lib/format";
import { palette } from "../theme";

const W = 360;
const H = 160;
const LEFT = 12;
const RIGHT = 348;
const TOP = 20;
const BOTTOM = 130;

function pathOf(points: CurvePoint[], mapX: (t: number) => number, mapY: (v: number) => number): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${mapX(p.t)},${mapY(p.mgL)}`).join(" ");
}

export interface CurveChartProps {
  points: CurvePoint[];
  simPoints?: CurvePoint[] | null;
  nowMs: number;
  bedtimeMs: number;
  /** 봉우리 강조 점(§6) — 마신 시각들 */
  drinkAtTimes: number[];
  fromMs: number;
  toMs: number;
  range: "9h" | "24h";
  currentMgL: number;
  bedtimeMgL: number;
  bedtimeRemainMg: number;
  empty: boolean;
  /** 오늘 23:00이 이미 지나 다음 취침이 내일 23:00으로 넘어감(§1 상태표 (b)안) — 라벨에 "내일"을 박는다. */
  bedtimeIsTomorrow: boolean;
}

/** 곡선 차트 — 화면설계.md §6. 차트 라이브러리 없이 인라인 SVG(기획.md §12.5). */
export function CurveChart({
  points,
  simPoints,
  nowMs,
  bedtimeMs,
  drinkAtTimes,
  fromMs,
  toMs,
  range,
  currentMgL,
  bedtimeMgL,
  bedtimeRemainMg,
  empty,
  bedtimeIsTomorrow,
}: CurveChartProps) {
  const yMax = Math.max(...points.map((p) => p.mgL), ...(simPoints ?? []).map((p) => p.mgL), 0.001) * 1.2;
  const mapX = (t: number) => LEFT + ((t - fromMs) / (toMs - fromMs)) * (RIGHT - LEFT);
  const mapY = (v: number) => BOTTOM - (v / yMax) * (BOTTOM - TOP);

  const bedtimeInRange = bedtimeMs >= fromMs && bedtimeMs <= toMs;
  const bedtimeWord = bedtimeIsTomorrow ? "내일 취침" : "취침";
  const rangePrefix =
    range === "9h" ? "지금부터 3시간 전, 6시간 후까지의" : "지금부터 12시간 전후의";
  const ariaLabel = `${rangePrefix} 혈중 카페인 농도 곡선. 지금 ${formatMgL(currentMgL)}mg/L, ${bedtimeWord} 시 예상 ${formatMgL(bedtimeMgL)}mg/L(약 ${Math.round(bedtimeRemainMg)}mg)`;

  const xLabels =
    range === "9h"
      ? [
          { h: -3, label: "−3h" },
          { h: 0, label: "지금" },
          { h: 3, label: "+3h" },
          { h: 6, label: "+6h" },
        ]
      : [
          { h: -12, label: "−12h" },
          { h: -6, label: "−6h" },
          { h: 0, label: "지금" },
          { h: 6, label: "+6h" },
          { h: 12, label: "+12h" },
        ];

  const realPath = pathOf(points, mapX, mapY);
  const areaPath = `${realPath} L ${mapX(points[points.length - 1]?.t ?? toMs)},${BOTTOM} L ${mapX(points[0]?.t ?? fromMs)},${BOTTOM} Z`;

  return (
    <div style={{ background: palette.card, borderRadius: 16, padding: 16 }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.brown} stopOpacity={0.22} />
            <stop offset="100%" stopColor={palette.brown} stopOpacity={0} />
          </linearGradient>
        </defs>

        {empty ? (
          <>
            <line
              x1={LEFT}
              y1={BOTTOM}
              x2={RIGHT}
              y2={BOTTOM}
              stroke="#B8B2A8"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={13} fill={palette.sub}>
              아직 기록이 없어요 — 커피를 마시면
            </text>
            <text x={W / 2} y={H / 2 + 18} textAnchor="middle" fontSize={13} fill={palette.sub}>
              여기 곡선이 그려져요
            </text>
          </>
        ) : (
          <>
            <path d={areaPath} fill="url(#curveFill)" />
            <path d={realPath} fill="none" stroke={palette.brown} strokeWidth={2} />
            {simPoints != null && (
              <path
                d={pathOf(simPoints, mapX, mapY)}
                fill="none"
                stroke={palette.brown}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            )}
            {drinkAtTimes
              .filter((t) => t >= fromMs && t <= toMs)
              .map((t) => <circle key={t} cx={mapX(t)} cy={BOTTOM - 2} r={3} fill={palette.brown} />)}
          </>
        )}

        {/* x축 라벨 */}
        {xLabels.map(({ h, label }) => (
          <text key={label} x={mapX(nowMs + h * 3_600_000)} y={H - 4} textAnchor="middle" fontSize={11} fill="#8B8478">
            {label}
          </text>
        ))}

        {/* 현재 시각선 — 빈 상태에서는 안 그린다(가운데 캡션과 겹쳐 "깨진 화면"으로 읽힌다, N-6) */}
        {!empty && (
          <>
            <line x1={mapX(nowMs)} y1={TOP} x2={mapX(nowMs)} y2={BOTTOM} stroke={palette.brown} strokeWidth={1.5} />
            <circle cx={mapX(nowMs)} cy={TOP} r={3} fill={palette.brown} />
          </>
        )}

        {/* 취침 시각선 / 범위 밖 화살표 인디케이터 */}
        {bedtimeInRange ? (
          <>
            <line
              x1={mapX(bedtimeMs)}
              y1={TOP}
              x2={mapX(bedtimeMs)}
              y2={BOTTOM}
              stroke="#8B8478"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {/* textAnchor="middle"라 오른쪽 끝에 걸리면 잘리므로 x를 클램프하고,
                "지금" 마커와 가까우면(N-7) 8px 더 위로 오프셋해 겹침을 피한다 */}
            <text
              x={Math.min(Math.max(mapX(bedtimeMs), LEFT + 35), RIGHT - 35)}
              y={Math.abs(mapX(bedtimeMs) - mapX(nowMs)) < 40 ? TOP - 14 : TOP - 6}
              textAnchor="middle"
              fontSize={11}
              fill="#8B8478"
            >
              🌙 {bedtimeWord} 23:00
            </text>
          </>
        ) : (
          <text x={RIGHT} y={TOP - 6} textAnchor="end" fontSize={11} fill="#8B8478">
            {bedtimeWord} 23:00 →
          </text>
        )}
      </svg>
    </div>
  );
}
