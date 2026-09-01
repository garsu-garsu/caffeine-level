import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "caffeine-level",

  brand: {
    // 인앱 primary — 화면설계.md §0 색상 용도표. 아이콘·썸네일 딥그린(#16241E/#2E8B57)과는
    // 용도가 다른 값이니 절대 같은 상수로 묶지 않는다(5차 개정 — 구현 스크린샷에서 혼선 확인됨).
    primaryColor: "#4A2C17",
  },

  // 위치·카메라 어느 것도 안 쓴다. 서버 전송 0건(기획.md §12.2) — 입력값은 전부 기기 저장.
  permissions: [],

  webBundleDir: "dist",

  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
});
