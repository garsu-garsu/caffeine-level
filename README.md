# 아아 수혈

혈중 카페인 농도 측정 — 마신 커피가 몸에서 빠져나가는 속도를 계산해, 지금 남아 있는 양과 취침 때 남을 양을 보여주는 앱인토스 미니앱.

## 원조 앱과 다른 점

- **마시기 전에 미리 계산한다** — "한 잔 더 마시면 취침 때 얼마나?" 를 기록하지 않고 미리보기로 확인
- **흡수 곡선까지 계산한다** — 마시는 즉시 최고치가 아니라 약 39분에 걸쳐 올라가는 곡선
- **사람마다 빠지는 속도가 다르다** — 흡연·경구피임약 여부로 반감기를 나눠 계산
- **잔이 비어가는 그림**으로 지금 상태를 한눈에

## 계산 모델

1구획 + 1차 흡수 모델.

```
C(t) = (용량 / (0.6 × 체중kg)) × ka/(ka−ke) × (e^(−ke·t) − e^(−ka·t))   [mg/L]
ke = ln2 / 개인반감기,  ka = 6/h,  Vd = 0.6 L/kg
개인반감기: 흡연 3.0h / 경구피임약 7.5h / 둘 다 3.0h / 해당 없음 5.0h
```

계수는 문헌값(StatPearls, Frontiers Pharmacol 2021, Parsons & Neims 1978, Abernethy & Todd 1985)과 식약처 자료를 근거로 확정했다. `npm run check:core` 가 13개 assert 로 모델을 검증한다.

**평균값을 이용한 추정이며 의학적 정보가 아니다.**

## 개인정보

로그인이 없고 서버 전송이 없다. 체중·흡연 여부·경구피임약 복용 여부·섭취 기록은 **기기 안에만 저장**되며, 섭취 기록은 30일 롤링으로 자동 삭제된다.

→ [개인정보처리방침](https://garsu-garsu.github.io/caffeine-level/privacy.html)

## 개발

```bash
npm install
npm run dev          # vite dev
npm run typecheck    # tsc -b --force  (npx tsc --noEmit 은 no-op 이니 쓰지 말 것)
npm run lint
npm run check:core   # 계산 모델 자가검증
npm run build        # vite build && ait build
```

광고 그룹 ID 는 `.env` 로 주입한다(`.env.example` 참고). 키가 비어도 브라우저에서 흐름이 끊기지 않으며, 실제 광고는 토스 앱에서만 렌더된다.

## 라이선스

이 저장소의 코드는 개인 프로젝트로 공개돼 있으며 별도 라이선스를 부여하지 않는다.
