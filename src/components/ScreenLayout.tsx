import type { CSSProperties, ReactNode } from "react";

import { Top } from "@toss/tds-mobile";

import { palette } from "../theme";

/**
 * 화면 공통 스크롤 컨테이너. joeunnal ScreenLayout.tsx 이식 —
 * 이 앱 화면 5개에 하단 탭바가 없어 withTabBar/TAB_BAR_HEIGHT는 가져오지 않는다.
 */
export function ScreenScroll({
  title,
  titleSize = 22,
  subtitle,
  children,
}: {
  title?: string;
  /** Top.TitleParagraph는 22 또는 28만 허용한다(TDS 함정). */
  titleSize?: 22 | 28;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        background: palette.bg,
        padding: "16px 20px",
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        boxSizing: "border-box",
      }}
    >
      {title != null && (
        <Top
          title={
            <Top.TitleParagraph size={titleSize} color={palette.ink}>
              {title}
            </Top.TitleParagraph>
          }
          subtitleBottom={
            subtitle != null ? (
              <Top.SubtitleParagraph size={15} color={palette.sub}>
                {subtitle}
              </Top.SubtitleParagraph>
            ) : undefined
          }
        />
      )}
      {children}
    </div>
  );
}

/** 흰 카드 컨테이너. */
export function Card({
  children,
  style,
  onClick,
}: {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: palette.card,
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 2px 12px rgba(27,29,33,0.06)",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
