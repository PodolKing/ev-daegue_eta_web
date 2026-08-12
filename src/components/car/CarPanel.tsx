"use client";

import { useState } from "react";
import type { Car, ChargingPort } from "@/types/car";
import {
  effectiveChargingPort,
  useCarStore,
} from "@/stores/carStore";

const PORT_OPTIONS: { port: ChargingPort; label: string }[] = [
  { port: "CCS1", label: "CCS" },
  { port: "CHADEMO", label: "CHAdeMO" },
  { port: "NACS", label: "NACS" },
];

/** 기종 콤보 껍데기 — 실제 car_models API 연동 전 더미 옵션 */
const MODEL_SHELL_OPTIONS = [
  { id: "", label: "기종 선택 (car_models)" },
  { id: "shell-1", label: "현대 · 아이오닉 5" },
  { id: "shell-2", label: "기아 · EV6" },
  { id: "shell-3", label: "테슬라 · Model 3" },
  { id: "custom", label: "목록에 없음 (직접 입력)" },
] as const;

const fieldClass =
  "mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] outline-none focus:border-[var(--accent)] sm:text-[14px]";

/** API/DB 대신 패널에서 넣는 임시 차량 */
function buildTempCar(port: ChargingPort): Car {
  const now = new Date().toISOString();
  return {
    id: `temp-${port}`,
    userId: "temp",
    carModelId: null,
    nickname: `테스트 (${port})`,
    chargingPort: port,
    isPrimary: true,
    customModelName: `임시 ${port}`,
    createdAt: now,
    updatedAt: now,
    carModel: null,
  };
}

/**
 * 내 차량 패널.
 * - 상단: 등록 폼 껍데기 (기종 콤보 + 포트 덮어쓰기 토글)
 * - 하단: 기존 임시 포트 필터 테스트 UI (유지)
 */
export function CarPanel() {
  const cars = useCarStore((s) => s.cars);
  const primaryCar = useCarStore((s) => s.primaryCar);
  const filterByCarPort = useCarStore((s) => s.filterByCarPort);
  const setCars = useCarStore((s) => s.setCars);
  const setFilterByCarPort = useCarStore((s) => s.setFilterByCarPort);

  const activePort = effectiveChargingPort(primaryCar);

  const [modelId, setModelId] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [overridePort, setOverridePort] = useState(false);
  const [chargingPort, setChargingPort] = useState<ChargingPort | "">("");
  const [isPrimary, setIsPrimary] = useState(true);

  const applyTempPort = (port: ChargingPort) => {
    const car = buildTempCar(port);
    setCars([car]);
    setFilterByCarPort(true);
  };

  const clearTempCar = () => {
    setCars([]);
  };

  const isCustom = modelId === "custom";

  return (
    <div className="ev-scroll-panel flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--surface)] px-3 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-[var(--text)]">내 차량</h2>
        <p className="truncate text-[11px] text-[var(--text-muted)]">
          {cars.length === 0
            ? "등록·임시 포트"
            : `${cars.length}대 · ${activePort ?? "—"}`}
        </p>
      </div>

      <label className="mt-2 flex items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--text)]">
        <span>내 차량 포트만 보기(필수 선택)</span>
        <input
          type="checkbox"
          checked={filterByCarPort}
          disabled={activePort == null}
          onChange={(e) => setFilterByCarPort(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)] disabled:opacity-40"
        />
      </label>

      {/* —— 차량 등록 폼 껍데기 —— */}
      <form
        className="mt-3 flex flex-col gap-3 border-t border-[var(--border)] pt-3"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <p className="text-[12px] font-semibold text-[var(--text)]">
          차량 등록
        </p>
        <p className="text-[11px] leading-snug text-[var(--text-muted)]">
          기종은 car_models에서 불러오고, 포트 덮어쓰기를 끄면 기종 기본 포트가
          들어갑니다. (UI만)
        </p>

        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          기종
          <span className="mt-0.5 block font-normal text-[11px] text-[var(--text-muted)]">
            DB · cars.car_model_id ← car_models
          </span>
          <select
            name="carModelId"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className={fieldClass}
          >
            {MODEL_SHELL_OPTIONS.map((opt) => (
              <option key={opt.id || "empty"} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {isCustom ? (
          <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
            직접 입력 기종명
            <span className="mt-0.5 block font-normal text-[11px] text-[var(--text-muted)]">
              DB · cars.custom_model_name
            </span>
            <input
              type="text"
              name="customModelName"
              value={customModelName}
              onChange={(e) => setCustomModelName(e.target.value)}
              maxLength={50}
              placeholder="예: 커스텀 EV"
              className={fieldClass}
            />
          </label>
        ) : null}

        <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
          차량 번호
          <span className="mt-0.5 block font-normal text-[11px] text-[var(--text-muted)]">
            DB · cars.car_number (선택)
          </span>
          <input
            type="text"
            name="carNumber"
            value={carNumber}
            onChange={(e) => setCarNumber(e.target.value)}
            maxLength={20}
            placeholder="12가3456"
            className={fieldClass}
          />
        </label>

        <div className="rounded-[10px] border border-[var(--border)] px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--text)]">
                충전 포트
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {overridePort
                  ? "직접 지정 중 · cars.charging_port"
                  : "기본값 · 기종 포트(car_models.charging_port)"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOverridePort((v) => !v)}
              className={[
                "shrink-0 rounded-[8px] border px-2.5 py-1.5 text-[12px] font-medium touch-manipulation transition-colors",
                overridePort
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--surface-muted)]",
              ].join(" ")}
            >
              {overridePort ? "덮어쓰기 켜짐" : "포트 덮어쓰기"}
            </button>
          </div>

          {overridePort ? (
            <label className="mt-2 block text-[12px] font-medium text-[var(--text-secondary)]">
              충전 포트 선택
              <select
                name="chargingPort"
                value={chargingPort}
                onChange={(e) =>
                  setChargingPort(e.target.value as ChargingPort | "")
                }
                className={fieldClass}
              >
                <option value="">포트 선택</option>
                {PORT_OPTIONS.map(({ port, label }) => (
                  <option key={port} value={port}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-2 rounded-[8px] bg-[var(--surface-muted)] px-2.5 py-2 text-[11px] text-[var(--text-muted)]">
              버튼을 누르지 않으면 기종 기본 포트가 들어갑니다.
            </p>
          )}
        </div>

        <label className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--text)]">
          <span>대표 차량으로 설정</span>
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-[var(--radius-pill)] bg-[var(--text)] px-4 py-3 text-[14px] font-semibold text-white shadow-[var(--shadow-sm)] opacity-60"
        >
          차량 저장
        </button>
        <p className="text-center text-[11px] text-[var(--text-muted)]">
          UI 껍데기 — cars API 연동 전
        </p>
      </form>

      {/* —— 기존 임시 포트 테스트 —— */}
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <p className="mb-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
          내차 등록없이 포트만 확인하기
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PORT_OPTIONS.map(({ port, label }) => {
            const selected = activePort === port;
            return (
              <button
                key={port}
                type="button"
                onClick={() => applyTempPort(port)}
                className={[
                  "rounded-[8px] border px-2.5 py-1.5 text-[12px] font-medium transition-colors touch-manipulation",
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--surface-muted)]",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
          {cars.length > 0 ? (
            <button
              type="button"
              onClick={clearTempCar}
              className="rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-[12px] text-[var(--text-muted)] touch-manipulation hover:bg-[var(--surface-muted)]"
            >
              지우기
            </button>
          ) : null}
        </div>

        {activePort == null ? (
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            포트를 고르면 필터를 켤 수 있습니다.
          </p>
        ) : null}
        {activePort === "NACS" ? (
          <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
            공공 NACS는 아직 매우 적습니다. (어댑터 없이 NACS만 표시)
          </p>
        ) : null}
      </div>
    </div>
  );
}
