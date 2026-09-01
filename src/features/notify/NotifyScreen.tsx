import { Badge, ListRow, Switch, useToast } from "@toss/tds-mobile";

import { SLOTS, requestNotifyConsent } from "../../lib/notify";
import { EVENT, track } from "../../lib/analytics";
import { ScreenScroll } from "../../components/ScreenLayout";
import type { NotifyState } from "../../lib/storage";
import { palette } from "../../theme";

/** 알림(§4) — 슬롯 3개 개별 on/off. */
export function NotifyScreen({
  notify,
  onChange,
}: {
  notify: NotifyState;
  onChange: (next: NotifyState) => void;
}) {
  const { openToast } = useToast();

  const toggle = async (code: string, next: boolean) => {
    if (next) {
      track(EVENT.notifyConsentRequested, { trigger: "settings", slot: code });
      const result = await requestNotifyConsent(code as (typeof SLOTS)[number]["code"]);
      if (result == null) return; // 토스 앱 밖(브라우저) 등 — 조용히 원복, 이벤트 0건(N-11)
      if (result === "agreementRejected") {
        openToast("동의하지 않으면 알림을 보낼 수 없어요");
        return;
      }
      track(EVENT.notifyConsentAgreed, { slot: code });
      onChange({ ...notify, agreed: notify.agreed.includes(code) ? notify.agreed : [...notify.agreed, code] });
    } else {
      // 철회 API가 없어 로컬 표시만 끈다 — 실제 발송을 막지 못할 수 있다는 걸 미리 알린다.
      openToast("토스 앱 알림 설정에서 해제할 수 있어요");
      onChange({ ...notify, agreed: notify.agreed.filter((c) => c !== code) });
    }
  };

  return (
    <ScreenScroll title="알림">
      <p style={{ fontSize: 14, color: palette.sub, marginTop: 0 }}>밤 9시~아침 8시에는 알림이 가지 않아요</p>

      {SLOTS.map((slot) => (
        <ListRow
          key={slot.code}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top={
                slot.code === "caffeine-level-pm1500-p" ? (
                  <>
                    {slot.label}{" "}
                    <Badge size="xsmall" color="blue" variant="weak">
                      추천
                    </Badge>
                  </>
                ) : (
                  slot.label
                )
              }
              bottom={slot.body}
            />
          }
          right={
            <Switch
              checked={notify.agreed.includes(slot.code)}
              onChange={(e) => void toggle(slot.code, e.target.checked)}
            />
          }
        />
      ))}
    </ScreenScroll>
  );
}
