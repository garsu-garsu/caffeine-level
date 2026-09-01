import { useState } from "react";
import { Button, Switch, TextField } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";

import { halfLifeHours, type Profile } from "../../lib/caffeine";
import { EVENT, track } from "../../lib/analytics";
import { ScreenScroll } from "../../components/ScreenLayout";
import { palette } from "../../theme";

/** 내 몸에 맞추기(§3) — 체중/흡연/경구피임약 3개. 성별·나이 입력 없음. */
export function PersonalizeScreen({
  profile,
  onApply,
  onBack,
}: {
  profile: Profile;
  onApply: (profile: Profile) => void;
  onBack: () => void;
}) {
  const [weightText, setWeightText] = useState(String(profile.weightKg));
  const [smoker, setSmoker] = useState(profile.smoker);
  const [oc, setOc] = useState(profile.oc);

  const weightNum = Number(weightText);
  const weightValid = Number.isFinite(weightNum) && weightNum >= 30 && weightNum <= 200;
  const halfLife = halfLifeHours({ smoker, oc });

  const apply = () => {
    const fields: string[] = [];
    if (weightValid && weightNum !== 70) fields.push("weight");
    if (smoker) fields.push("smoker");
    if (oc) fields.push("oc");
    track(EVENT.personalizeSaved, { fields: fields.join(",") });
    onApply({ weightKg: weightValid ? weightNum : profile.weightKg, smoker, oc });
    onBack();
  };

  return (
    <ScreenScroll title="내 몸에 맞추기">
      <div
        style={{
          background: adaptive.blue50,
          borderRadius: 12,
          padding: 12,
          marginBottom: 20,
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: adaptive.blue700, fontWeight: 600 }}>
          🔒 입력한 값은 이 기기에만 저장돼요. 어디에도 보내지 않아요.
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: palette.sub }}>
          카페인이 몸에서 빠져나가는 속도 계산에만 쓰여요.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <TextField
          variant="box"
          label="체중"
          suffix="kg"
          value={weightText}
          onChange={(e) => setWeightText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
          hasError={weightText !== "" && !weightValid}
          help={weightText !== "" && !weightValid ? "30~200kg 사이로 입력해 주세요" : undefined}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, color: palette.ink }}>흡연</span>
          <Switch checked={smoker} onChange={(e) => setSmoker(e.target.checked)} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, color: palette.ink }}>경구피임약(에스트로겐 함유)을 복용 중이에요</span>
          <Switch checked={oc} onChange={(e) => setOc(e.target.checked)} />
        </div>

        <div>
          <p style={{ margin: 0, fontSize: 17, color: palette.ink }}>계산에 사용하는 반감기 약 {halfLife}시간</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: palette.sub }}>
            문헌 평균값을 생활습관으로 보정한 값이에요.
          </p>
        </div>

        <Button color="primary" display="full" onClick={apply}>
          적용하고 홈으로
        </Button>
      </div>
    </ScreenScroll>
  );
}
