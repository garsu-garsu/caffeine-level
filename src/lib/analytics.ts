// 분석 이벤트 로깅. eventLog는 init 없이 동작하고 미지원 환경(브라우저)에선 조용히 무시된다.
//
// 개인화 값이 기기 밖으로 나가지 않는다(기획.md §12.3):
// 1. Profile(체중·흡연·경구피임약)을 track()에 절대 넘기지 않는다.
// 2. personalize_saved는 채운 항목의 "이름만"(fields: "weight,smoker") 보낸다. 값은 안 보낸다.
// 3. drink_logged의 amount_mg는 프리셋 상수라 개인정보가 아니다. 직접 입력(custom)일 때는 mg를 생략한다.
import { eventLog } from "@apps-in-toss/web-framework";

type Primitive = string | number | boolean;
type Params = Record<string, Primitive | null | undefined>;
type LogType = "event" | "screen" | "click" | "impression";

function clean(p: Params): Record<string, Primitive> {
  const o: Record<string, Primitive> = {};
  for (const [k, v] of Object.entries(p)) if (v != null) o[k] = v;
  return o;
}

export function track(name: string, params: Params = {}, type: LogType = "event"): void {
  try {
    void eventLog({ log_name: name, log_type: type, params: clean(params) }).catch(() => {});
  } catch {
    /* noop */
  }
}

export function trackScreen(name: string, params: Params = {}): void {
  track(`screen_${name}`, params, "screen");
}

// 기획.md §11 KPI 이벤트.
export const EVENT = {
  appOpen: "app_open", // { entry: icon | notification | share }
  drinkLogged: "drink_logged", // { preset, amount_mg?, hour }
  drinkLoggedFirst: "drink_logged_first",
  notifyConsentRequested: "notify_consent_requested", // { trigger: after_first_log | settings, slot }
  notifyConsentAgreed: "notify_consent_agreed", // { slot }
  personalizeOpened: "personalize_opened",
  personalizeSaved: "personalize_saved", // { fields }
  bedtimeAdjusted: "bedtime_adjusted", // { to }
  simOpened: "sim_opened", // { entry: toggle | notification }
  simPreviewed: "sim_previewed", // { preset }
  simToLog: "sim_to_log", // { preset }
  curveRangeToggled: "curve_range_toggled", // { range: 24h | 9h }
  adBannerImpression: "ad_banner_impression", // { screen }
  adInterstitialShown: "ad_interstitial_shown",
  guideOpened: "guide_opened",
} as const;
