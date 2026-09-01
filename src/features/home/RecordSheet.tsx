import { useState } from "react";
import { BottomSheet, Button, ListRow, TextButton, TextField } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";

import { PRESETS, type Drink, type PresetInfo } from "../../lib/caffeine";
import { palette } from "../../theme";

/** 기록 시트(§2) — 탭 한 번 즉시 기록, 광고·확인 절차 없음(코어 루프 보호). */
export function RecordSheet({
  open,
  onClose,
  todayDrinks,
  nowMs,
  onPick,
  onCustomAdd,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  todayDrinks: Drink[];
  nowMs: number;
  onPick: (presetKey: keyof typeof PRESETS, atMs: number) => void;
  onCustomAdd: (mg: number, atMs: number) => void;
  onRemove: (id: string) => void;
}) {
  const [customMg, setCustomMg] = useState("");
  const [hourOffset, setHourOffset] = useState(0); // 0=지금, 1=1시간 전 ...
  const [showStepper, setShowStepper] = useState(false);
  const atMs = nowMs - hourOffset * 3_600_000;

  const reset = () => {
    setCustomMg("");
    setHourOffset(0);
    setShowStepper(false);
  };

  return (
    <BottomSheet
      open={open}
      header={<BottomSheet.Header>마셨어요? 탭 한 번으로 기록</BottomSheet.Header>}
      headerDescription={<BottomSheet.HeaderDescription>탭하면 바로 기록돼요</BottomSheet.HeaderDescription>}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      {/* 시트 좌우 패딩 20px — 헤더(TDS 기본 여백)와 그리드가 같은 좌측 기준선을 쓰게 한다(§2 13차). */}
      <div style={{ padding: "0 20px 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        {(Object.entries(PRESETS) as [keyof typeof PRESETS, PresetInfo][]).map(
          ([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onPick(key, atMs);
                reset();
              }}
              style={{
                minHeight: 84,
                border: "none",
                borderRadius: 16,
                background: adaptive.grey100,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
                gap: 2,
                padding: "10px 14px",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 24 }}>☕</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: palette.ink }}>{preset.label}</span>
              <span style={{ fontSize: 14, color: palette.sub }}>{preset.mg}mg</span>
              {preset.note != null && <span style={{ fontSize: 12, color: adaptive.grey500 }}>{preset.note}</span>}
            </button>
          ),
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 20 }}>
        <div style={{ flex: 1 }}>
          <TextField.Clearable
            variant="box"
            label="직접 입력 (mg)"
            value={customMg}
            onChange={(e) => setCustomMg(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          />
        </div>
        <Button
          size="medium"
          onClick={() => {
            const mg = Number(customMg);
            if (mg > 0) {
              onCustomAdd(mg, atMs);
              reset();
            }
          }}
        >
          추가
        </Button>
      </div>

      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <TextButton size="small" variant="underline" onClick={() => setShowStepper((v) => !v)}>
          {hourOffset === 0 ? "지금 마셨어요" : `${hourOffset}시간 전`} · 시각 바꾸기
        </TextButton>
        {showStepper && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <TextButton size="small" onClick={() => setHourOffset((h) => Math.min(h + 1, 12))}>
              ◀ 더 전으로
            </TextButton>
            <span style={{ fontSize: 15, color: palette.ink }}>
              {hourOffset === 0 ? "지금" : `${hourOffset}시간 전`}
            </span>
            <TextButton size="small" onClick={() => setHourOffset((h) => Math.max(h - 1, 0))}>
              더 나중으로 ▶
            </TextButton>
          </div>
        )}
      </div>

      {todayDrinks.length > 0 && (
        <div>
          {todayDrinks.map((d) => (
            <ListRow
              key={d.id}
              left={<ListRow.AssetIcon>☕</ListRow.AssetIcon>}
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={PRESETS[d.preset as keyof typeof PRESETS]?.label ?? "직접 입력"}
                  bottom={new Date(d.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                />
              }
              right={
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 14, color: palette.sub }}>{d.mg}mg</span>
                  <button
                    type="button"
                    aria-label="기록 삭제"
                    onClick={() => onRemove(d.id)}
                    style={{ border: "none", background: "transparent", fontSize: 18, padding: 8, cursor: "pointer" }}
                  >
                    🗑
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
      </div>
    </BottomSheet>
  );
}
