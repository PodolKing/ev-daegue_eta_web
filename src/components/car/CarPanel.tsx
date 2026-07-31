"use client";

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

/** 내 차량 패널 — 등록 API 전, 포트만 store에 넣는 임시 UI */
export function CarPanel() {
  const cars = useCarStore((s) => s.cars);
  const primaryCar = useCarStore((s) => s.primaryCar);
  const filterByCarPort = useCarStore((s) => s.filterByCarPort);
  const setCars = useCarStore((s) => s.setCars);
  const setFilterByCarPort = useCarStore((s) => s.setFilterByCarPort);

  const activePort = effectiveChargingPort(primaryCar);

  const applyTempPort = (port: ChargingPort) => {
    const car = buildTempCar(port);
    setCars([car]);
    setFilterByCarPort(true);
  };

  const clearTempCar = () => {
    setCars([]);
  };

  return (
    <div className="ev-scroll-panel flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--surface)] px-3 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-[var(--text)]">내 차량</h2>
        <p className="truncate text-[11px] text-[var(--text-muted)]">
          {cars.length === 0
            ? "임시 포트로 필터 테스트"
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

      <p className="mb-1.5 mt-3 text-[11px] font-medium text-[var(--text-secondary)]">
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
  );
}
