// 앱 아이콘(600×600)·썸네일(1932×828) — 커스텀 SVG 테이크아웃 컵(화면설계.md §7 16~17차).
// gen-icon-thumbnail.mjs(이모지 전용, 컵을 못 그림)를 대체한다. 같은 playwright 파이프라인, 새 의존성 0.
//
// 사용:
//   node scripts/gen-icon.mjs --out submission \
//        --name "아아 수혈" --subtitle "한 잔 더 마시면" \
//        --c1 "#FFC72C" --c2 "#FFDE7A" --fg "#2B1B0E"
//
// 출력: <out>/icon-600.png, <out>/thumbnail-1932x828.png

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]?.startsWith("--") ? true : arr[i + 1]]);
    return acc;
  }, []),
);
const name = args.name ?? "아아 수혈";
const subtitle = args.subtitle ?? "한 잔 더 마시면";
const c1 = args.c1 ?? "#FFC72C"; // 골든 옐로
const c2 = args.c2 ?? "#FFDE7A"; // 라이트 옐로
const fg = args.fg ?? "#2B1B0E"; // 다크 에스프레소
const outDir = resolve(process.cwd(), args.out ?? "submission");
mkdirSync(outDir, { recursive: true });

const FONT = `-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif`;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// 테이크아웃 컵 — viewBox 0 0 600 600(§7 컵 아트 스펙 좌표 그대로). 얼음·글자·의료 기호 없음.
// transform이 있으면 컵 전체(clipPath 포함 — clipPathUnits 기본값 userSpaceOnUse라 <g>의
// 변환을 그대로 물려받는다)를 그 자리에서 확대/이동한다. 썸네일은 transform 없이(원본 그대로) 쓴다.
function cupSvg(size, transform) {
  const open = transform ? `<g transform="${transform}">` : "";
  const close = transform ? "</g>" : "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="cupClip"><path d="M160,220 L440,220 L400,480 L200,480 Z" /></clipPath>
  </defs>
  ${open}
  <path d="M160,220 L440,220 L400,480 L200,480 Z" fill="#FFF8ED" />
  <rect x="160" y="300" width="280" height="180" fill="#3E2117" clip-path="url(#cupClip)" />
  <path d="M160,220 L440,220 L400,480 L200,480 Z" fill="none" stroke="#2B1B0E" stroke-width="8" />
  <rect x="140" y="195" width="320" height="30" rx="6" fill="#FFF8ED" stroke="#2B1B0E" stroke-width="8" />
  <line x1="320" y1="200" x2="365" y2="90" stroke="#2B1B0E" stroke-width="14" stroke-linecap="round" />
  ${close}
</svg>`;
}

// 아이콘 전용 확대 — 원본 컵 바운딩박스(x:140~460, y:90~480)의 폭 320을 프레임(600)의 60%(360)로
// 키운다(scale=1.125). 빨대 끝(y=90)이 위로 삐져나오니 상단 여백(90px)을 하단(71px)보다 넉넉히 둔다.
const ICON_CUP_SCALE = 1.125;
const ICON_CUP_TRANSFORM = `matrix(${ICON_CUP_SCALE},0,0,${ICON_CUP_SCALE},-37.5,-11.25)`;

const iconHTML = `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0}
  .box{width:600px;height:600px;display:flex;align-items:center;justify-content:center;
       background:linear-gradient(135deg,${c1} 0%,${c2} 100%);overflow:hidden;position:relative}
  .glow{position:absolute;width:520px;height:520px;border-radius:50%;
        background:radial-gradient(circle,rgba(255,255,255,.28),transparent 60%)}
  .cup{position:relative;filter:drop-shadow(0 12px 30px rgba(0,0,0,.18))}
</style>
<div class="box"><div class="glow"></div><div class="cup">${cupSvg(600, ICON_CUP_TRANSFORM)}</div></div>`;

const thumbHTML = `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0}
  .box{width:1932px;height:828px;display:flex;align-items:center;justify-content:space-between;
       background:linear-gradient(120deg,${c1} 0%,${c2} 100%);font-family:${FONT};padding:0 130px;box-sizing:border-box;
       color:${fg};position:relative;overflow:hidden}
  .blob{position:absolute;right:-120px;top:-120px;width:760px;height:760px;border-radius:50%;
        background:radial-gradient(circle,rgba(255,255,255,.20),transparent 62%)}
  .left{max-width:1120px;z-index:1}
  .title{font-size:128px;font-weight:900;line-height:1.05;letter-spacing:-2px;margin:0;
         text-shadow:0 4px 14px rgba(255,255,255,.18)}
  .sub{font-size:52px;font-weight:600;margin:34px 0 0;opacity:.92;line-height:1.3}
  .badge{display:inline-block;margin-top:46px;padding:16px 34px;border-radius:999px;
         background:rgba(43,27,14,.12);font-size:38px;font-weight:700}
  .art{z-index:1;filter:drop-shadow(0 16px 40px rgba(0,0,0,.2))}
</style>
<div class="box"><div class="blob"></div>
  <div class="left">
    <h1 class="title">${esc(name)}</h1>
    ${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ""}
    <span class="badge">토스에서 만나요</span>
  </div>
  <div class="art">${cupSvg(560)}</div>
</div>`;

async function shoot(html, w, h, file) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.waitForTimeout(150);
  const path = resolve(outDir, file);
  await page.screenshot({ path, clip: { x: 0, y: 0, width: w, height: h } });
  await browser.close();
  console.log("🖼  ", path);
}

await shoot(iconHTML, 600, 600, "icon-600.png");
await shoot(thumbHTML, 1932, 828, "thumbnail-1932x828.png");
console.log("✅ 아이콘·썸네일 생성 완료 →", outDir);
