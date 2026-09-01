import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:5199";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

// 취침(23:00) 경과 여부에 따라 홈이 다르게 그려지므로(§1 상태표), 시계를 고정해 두 시나리오를
// 전부 찍는다. KST 기준 오늘 날짜에 시:분만 얹는다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
function kstTodayAt(hour, minute) {
  const nowKst = new Date(Date.now() + KST_OFFSET_MS);
  const y = nowKst.getUTCFullYear();
  const m = nowKst.getUTCMonth();
  const d = nowKst.getUTCDate();
  return Date.UTC(y, m, d, hour, minute) - KST_OFFSET_MS;
}

const SCENARIOS = [
  // 오전 11시 — 취침 23:00이 24h 뷰(±12h) 안·기본 뷰(+6h) 밖이라 화살표 인디케이터 경로도 검증된다.
  { label: "day", fixedMs: kstTodayAt(11, 0) },
  { label: "night", fixedMs: kstTodayAt(23, 20) }, // 오후 11시 20분 — 취침 시각 경과 상태(5차 개정)
];

// 목업 세트(기획.md §0, 톨 150mg·tmax 38.6분→3.3mg/L·137mg)에 근접하도록 "40분 전"으로 심는다.
const BACKDATE_MIN = 40;

/** 방금 기록한 잔의 `at`을 minutesAgo만큼 뒤로 민다 — "지금 막 마심"(C≈0)이 아니라
 * 목업 세트가 재현되게 한다. localStorage를 직접 고쳐 재로드한다(재사용 가능). */
async function backdateDrinks(page, minutesAgo) {
  await page.evaluate((mins) => {
    const raw = localStorage.getItem("cl.v1.drinks");
    if (!raw) return;
    const shiftMs = mins * 60_000;
    const shifted = JSON.parse(raw).map((d) => ({ ...d, at: d.at - shiftMs }));
    localStorage.setItem("cl.v1.drinks", JSON.stringify(shifted));
  }, minutesAgo);
  await page.reload({ waitUntil: "networkidle" });
}

const browser = await chromium.launch();
const errors = [];
let n = 0;

for (const { label, fixedMs } of SCENARIOS) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => errors.push(`[${label}] ${err}`));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("getSafeAreaInsets")) {
      errors.push(`[${label}] console.error: ${msg.text()}`);
    }
  });

  // @apps-in-toss/devtools 플로팅 버튼(AIT)은 개발 편의용이라 스토어 스크린샷에 찍히면 안 된다.
  // 매 goto/reload마다 다시 그려지므로 addInitScript로 넣어야 계속 숨는다.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = ".ait-panel-root { display: none !important; }";
      document.head.appendChild(style);
    });
  });

  // 시계를 완전히 멈추면 트랜지션 타이머가 "시간이 안 흐른다"고 보고 멈춰버리므로,
  // 실제 경과시간만큼은 흐르게 하고 기준점만 옮긴다.
  await page.addInitScript((fixed) => {
    const realStart = performance.now();
    const OrigDate = Date;
    class FixedDate extends OrigDate {
      constructor(...args) {
        if (args.length === 0) super(fixed + (performance.now() - realStart));
        else super(...args);
      }
      static now() {
        return fixed + (performance.now() - realStart);
      }
    }
    // @ts-expect-error 브라우저 컨텍스트 오버라이드
    window.Date = FixedDate;
  }, fixedMs);

  async function shot(name) {
    n += 1;
    const file = `${OUT}/${String(n).padStart(2, "0")}-${label}-${name}.png`;
    await page.waitForTimeout(450);
    await page.screenshot({ path: file });
    console.log("📸", file);
  }

  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot("home-empty");

  await page.getByRole("button", { name: /마셨어요, 기록하기/ }).click();
  await page.waitForTimeout(300);
  await shot("record-sheet");
  await page.getByRole("button", { name: /아메리카노 톨/ }).first().click();
  await page.waitForTimeout(300);
  // 기록 직후엔 t≈0이라 대형 숫자가 0.0으로 찍힌다(caffeine.ts:86 물리적으로 맞는 동작) —
  // 목업 세트를 재현하려면 기록 시각을 뒤로 민다. reload가 기록 토스트도 같이 지운다(N-9).
  await backdateDrinks(page, BACKDATE_MIN);
  await shot("home-after-log");

  const later = page.getByRole("button", { name: "나중에" });
  if (await later.count()) {
    await later.click();
    await page.waitForTimeout(200);
  }

  await page.getByRole("button", { name: "미리보기" }).click();
  await page.waitForTimeout(200);
  await shot("home-sim-on");
  await page.getByText("아메리카노 톨 150mg", { exact: false }).first().click();
  await page.waitForTimeout(200);
  await shot("home-sim-chip");

  await page.getByRole("button", { name: "24시간 보기" }).click();
  await page.waitForTimeout(200);
  await shot("home-24h");

  await page.getByText("내 몸에 맞추기", { exact: false }).first().click();
  await page.waitForTimeout(300);
  await shot("personalize");

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "알림 설정" }).click();
  await page.waitForTimeout(300);
  await shot("notify");

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  await page.getByText("안내", { exact: true }).first().click();
  await page.waitForTimeout(300);
  await shot("guide");

  await page.goto(`${BASE}?entry=notification`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await shot("entry-notification");

  await ctx.close();
}

await browser.close();

console.log(`\n✅ 완료: ${n}장 → ${OUT}/ (day/night 두 시나리오)`);
if (errors.length > 0) {
  console.error(`\n❌ 콘솔 에러 ${errors.length}건:`);
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log("콘솔 pageerror 0건");
