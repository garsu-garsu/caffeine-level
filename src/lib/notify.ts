/**
 * 알림 슬롯 3개 — 콘솔에 등록한 발송 코드와 1:1(기획.md §5). 코드를 바꾸면 콘솔 발송 코드도
 * 같이 바꿔야 한다. 오전 8시~오후 9시 사이에만 잡는다(밤 9시~아침 8시는 발송 안 됨, 실측 확인).
 */
import { Notification } from "@apps-in-toss/web-framework";

import { isInTossApp } from "./tossEnv";

export type NotifyConsent = "newAgreement" | "alreadyAgreed" | "agreementRejected";

// 콘솔에서 발급받은 실제 templateCode(미니앱 ID 71799). 슬롯별 termsId: 119328/119329/119335.
export const SLOTS = [
  { code: "STD_71799_119328_PARTNER", label: "오후 1시", body: "점심에 마신 커피, 기록하셨어요?" },
  {
    code: "STD_71799_119329_PARTNER",
    label: "오후 3시",
    body: "지금 마시면 취침 때 얼마나 남을지 확인해보세요",
  },
  { code: "STD_71799_119335_PARTNER", label: "오후 8시 30분", body: "자기 전, 오늘 남은 카페인을 확인해보세요" },
] as const;

export type SlotCode = (typeof SLOTS)[number]["code"];

export function canRequestNotifyConsent(): boolean {
  return isInTossApp();
}

/** 알림 동의 화면을 띄운다. 브라우저(토스 앱 밖)이면 null. */
export function requestNotifyConsent(code: SlotCode): Promise<NotifyConsent | null> {
  if (!canRequestNotifyConsent()) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const cleanup = Notification.requestAgreement({
        options: { templateCode: code },
        onEvent: (result) => {
          resolve(result.type);
          cleanup();
        },
        onError: () => {
          resolve(null);
          cleanup();
        },
      });
    } catch {
      resolve(null);
    }
  });
}
