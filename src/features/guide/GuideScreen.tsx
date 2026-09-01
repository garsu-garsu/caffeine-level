import { useEffect } from "react";
import { Button, Post } from "@toss/tds-mobile";

import { useInterstitialAd } from "../../hooks/useInterstitialAd";
import { EVENT, track, trackScreen } from "../../lib/analytics";
import { ScreenScroll } from "../../components/ScreenLayout";
import { palette } from "../../theme";

/** 안내/면책·출처(§5). "확인했어요" 탭에서만 전면광고 세션당 1회. */
export function GuideScreen({ onBack }: { onBack: () => void }) {
  const { maybeShow } = useInterstitialAd();

  useEffect(() => {
    trackScreen("guide");
    track(EVENT.guideOpened);
  }, []);

  return (
    <ScreenScroll title="안내">
      <Post.H3>어떻게 계산하나요</Post.H3>
      <Post.Paragraph>
        마신 카페인이 몸에 흡수되는 과정과 사라지는 속도를 문헌 평균값으로 추정해요. 평균값을 이용한
        추정이에요.
        <br />
        링거 그림은 지금 몸에 남은 카페인 양이에요. 식약처 성인 하루 권고량(400mg)만큼 남았을 때 가득 차요.
      </Post.Paragraph>

      <Post.H3>꼭 읽어주세요</Post.H3>
      <div style={{ background: "#F5F1EA", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: palette.ink }}>
          평균값을 이용한 추정이에요. 개인차가 커요. 의학적 정보가 아니에요.
        </p>
      </div>

      <Post.H3>데이터 출처</Post.H3>
      <Post.Ul>
        <Post.Li>분포용적 0.6L/kg — 성인 평균(StatPearls, Alsabri et al. 2018)</Post.Li>
        <Post.Li>평균 반감기 5시간 — 건강 성인 약 5~6시간(StatPearls)</Post.Li>
        <Post.Li>흡수속도상수 6/h — 경구 카페인 평균 보고치(Alsabri et al. 2018)</Post.Li>
        <Post.Li>흡연 보정 — Parsons & Neims, Clin Pharmacol Ther 1978</Post.Li>
        <Post.Li>경구피임약 보정 — Abernethy & Todd, Eur J Clin Pharmacol 1985</Post.Li>
        <Post.Li>
          음료별 카페인 함량 — 스타벅스 코리아·브랜드 공개값·식약처 카페인 섭취량 평가·한국소비자원 조사
        </Post.Li>
      </Post.Ul>

      <Post.H3>개인정보</Post.H3>
      <Post.Ul>
        <Post.Li>
          기기 내 저장(서버 전송 0건): 체중·흡연 여부·경구피임약 복용 여부·취침 시각·섭취 기록. 30일
          롤링 보관, 앱 삭제 시 즉시 소멸
        </Post.Li>
        <Post.Li>서비스 이용 기록(비식별): 화면 조회·기능 사용 이벤트. 위 건강 항목의 값은 포함하지 않음</Post.Li>
        <Post.Li>광고: 인앱 광고 노출을 위해 광고 SDK가 광고 식별자를 처리함</Post.Li>
      </Post.Ul>

      <Button
        color="primary"
        display="full"
        onClick={() => maybeShow(onBack, "guide_confirm")}
        style={{ marginTop: 24 }}
      >
        확인했어요
      </Button>
    </ScreenScroll>
  );
}
