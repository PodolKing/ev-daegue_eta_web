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
    <div className="flex h-full flex-col bg-[var(--surface)] px-3 py-4">
      <h2 className="text-[15px] font-semibold text-[var(--text)]">내 차량</h2>
      <p className="mt-1 text-[12px] text-[var(--text-muted)]">
        {cars.length === 0
          ? "등록된 차량이 없습니다. (임시 포트로 필터 테스트)"
          : `${cars.length}대 · 유효 포트 ${activePort ?? "—"}`}
      </p>

      <div className="mt-4">
        <p className="mb-2 text-[12px] font-medium text-[var(--text-secondary)]">
          임시 포트 선택
        </p>
        <div className="flex flex-col gap-2">
          {PORT_OPTIONS.map(({ port, label }) => {
            const selected = activePort === port;
            return (
              <button
                key={port}
                type="button"
                onClick={() => applyTempPort(port)}
                className={[
                  "rounded-[10px] border px-3 py-2.5 text-left text-[13px] transition-colors touch-manipulation",
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--surface-muted)]",
                ].join(" ")}
              >
                {label}
                <span className="ml-2 text-[11px] text-[var(--text-muted)]">
                  ({port})
                </span>
              </button>
            );
          })}
        </div>
        {activePort === "NACS" ? (
          <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
            국내 공공 NACS 충전기는 아직 매우 적고, 시내 중심에는 거의 없을 수
            있습니다. (어댑터 없이 NACS 포트만 표시)
          </p>
        ) : null}
        {cars.length > 0 ? (
          <button
            type="button"
            onClick={clearTempCar}
            className="mt-2 w-full rounded-[10px] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-muted)] touch-manipulation hover:bg-[var(--surface-muted)]"
          >
            임시 차량 지우기
          </button>
        ) : null}
      </div>

      <label className="mt-4 flex items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] px-3 py-2.5 text-[13px] text-[var(--text)]">
        <span>내 차량 포트만 보기</span>
        <input
          type="checkbox"
          checked={filterByCarPort}
          onChange={(e) => setFilterByCarPort(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
      </label>
    </div>
  );
}
