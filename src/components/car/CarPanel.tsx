"use client";

import { useEffect, useState, type FormEvent } from "react";
import { GuestAuthBanner } from "@/components/auth/GuestAuthBanner";
import type { Car, ChargingPort } from "@/types/car";
import { useAuthStore } from "@/stores/authStore";
import { PortGlyph } from "@/components/car/PortGlyph";
import {
  carDisplayLabel,
  carTitle,
  effectiveChargingPort,
  useCarStore,
} from "@/stores/carStore";

const PORT_OPTIONS: { port: ChargingPort; label: string }[] = [
  { port: "CCS1", label: "CCS" },
  { port: "CHADEMO", label: "CHAdeMO" },
  { port: "NACS", label: "NACS" },
];

const CUSTOM_MODEL = "custom";

const fieldClass =
  "mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-[16px] text-[var(--text)] outline-none focus:border-[var(--accent)] sm:text-[14px]";

function portLabel(port: ChargingPort | null | undefined): string {
  if (!port) return "정보 없음";
  return PORT_OPTIONS.find((p) => p.port === port)?.label ?? port;
}

function confirmReplacePrimary(current: Car | null): boolean {
  if (current == null || current.id < 0) return true;
  return window.confirm(
    `현재 대표(${carDisplayLabel(current)})를 이 차량으로 바꿀까요?`,
  );
}

function buildTempCar(port: ChargingPort): Car {
  const now = new Date().toISOString();
  const id = port === "CCS1" ? -1 : port === "CHADEMO" ? -2 : -3;
  return {
    id,
    carModelId: null,
    carNumber: null,
    chargingPort: port,
    isPrimary: true,
    customModelName: `임시 ${port}`,
    createdAt: now,
    updatedAt: now,
    carModel: null,
  };
}

export function CarPanel() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cars = useCarStore((s) => s.cars);
  const carModels = useCarStore((s) => s.carModels);
  const primaryCar = useCarStore((s) => s.primaryCar);
  const filterByCarPort = useCarStore((s) => s.filterByCarPort);
  const saving = useCarStore((s) => s.saving);
  const status = useCarStore((s) => s.status);
  const setCars = useCarStore((s) => s.setCars);
  const setFilterByCarPort = useCarStore((s) => s.setFilterByCarPort);
  const createCar = useCarStore((s) => s.createCar);
  const setPrimary = useCarStore((s) => s.setPrimary);
  const removeCar = useCarStore((s) => s.removeCar);

  const activePort = effectiveChargingPort(primaryCar);
  const isTemp = (primaryCar?.id ?? 0) < 0;
  const realCars = isAuthenticated && !isTemp ? cars : [];

  const [modelId, setModelId] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [overridePort, setOverridePort] = useState(false);
  const [chargingPort, setChargingPort] = useState<ChargingPort | "">("");
  const [isPrimary, setIsPrimary] = useState(true);
  const hasRealPrimary = primaryCar != null && !isTemp;

  useEffect(() => {
    if (!isAuthenticated) return;
    void useCarStore.getState().hydrate();
  }, [isAuthenticated]);

  useEffect(() => {
    setIsPrimary(!hasRealPrimary);
  }, [hasRealPrimary]);

  const applyTempPort = (port: ChargingPort) => {
    setCars([buildTempCar(port)]);
    setFilterByCarPort(true);
  };

  const clearTempCar = () => {
    setCars([]);
  };

  const isCustom = modelId === CUSTOM_MODEL;
  const selectedModel = carModels.find((m) => String(m.id) === modelId);
  const defaultPort = selectedModel?.chargingPort ?? null;
  const showPortSelect = isCustom || overridePort;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    if (isCustom) {
      if (!customModelName.trim()) {
        window.alert("기종명을 입력하세요");
        return;
      }
      if (!chargingPort) {
        window.alert("커스텀 기종은 충전 포트가 필요합니다");
        return;
      }
    } else if (!modelId) {
      window.alert("기종을 선택하세요");
      return;
    }

    if (showPortSelect && !chargingPort) {
      window.alert("충전 포트를 선택하세요");
      return;
    }

    if (isPrimary && !confirmReplacePrimary(hasRealPrimary ? primaryCar : null)) {
      return;
    }

    const ok = await createCar({
      carModelId: isCustom ? null : Number(modelId),
      customModelName: isCustom ? customModelName.trim() : null,
      carNumber: carNumber.trim() || null,
      chargingPort: showPortSelect ? (chargingPort as ChargingPort) : null,
      isPrimary,
    });
    if (!ok) return;
    setModelId("");
    setCarNumber("");
    setCustomModelName("");
    setOverridePort(false);
    setChargingPort("");
  };

  return (
    <div className="ev-scroll-panel flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--surface)] px-3 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-[var(--text)]">내 차량</h2>
        <p className="truncate text-[11px] text-[var(--text-muted)]">
          {realCars.length === 0 && !isTemp
            ? "등록·임시 포트"
            : `${isTemp ? 1 : cars.length}대 · ${activePort ?? "—"}`}
        </p>
      </div>
      <GuestAuthBanner
        className="mt-2"
        message="로그인해야 등록할 수 있습니다"
      />

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

      {isAuthenticated && realCars.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {realCars.map((car) => {
            const port = effectiveChargingPort(car);
            return (
              <li
                key={car.id}
                className="rounded-[10px] border border-[var(--border)] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    {port ? (
                      <PortGlyph
                        port={port}
                        className="mt-0.5 h-8 w-8 shrink-0 object-contain"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[var(--text)]">
                        {carTitle(car)}
                        {car.isPrimary ? " · 대표" : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                        {car.carNumber ?? "번호 없음"} · {portLabel(port)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!car.isPrimary ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirmReplacePrimary(primaryCar)) return;
                          void setPrimary(car.id, true);
                        }}
                        className="rounded-[8px] border border-[var(--border)] px-2 min-h-9 py-2 text-[11px] touch-manipulation"
                      >
                        대표
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("이 차량을 삭제할까요?")) {
                          void removeCar(car.id);
                        }
                      }}
                      className="rounded-[8px] border border-[var(--border)] px-2 min-h-9 py-2 text-[11px] text-[var(--text-muted)] touch-manipulation"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {isAuthenticated && realCars.length === 0 && status !== "loading" ? (
        <div className="mt-3 flex items-center gap-3 rounded-[10px] border border-[var(--border)] px-3 py-2.5">
          <img
            src="/car/ev-generic.png"
            alt=""
            className="h-12 w-[4.5rem] shrink-0 object-contain object-center"
            draggable={false}
          />
          <p className="text-[12px] text-[var(--text-muted)]">
            등록된 차량이 없습니다.
          </p>
        </div>
      ) : null}

      {isAuthenticated ? (
        <form
          className="mt-3 flex flex-col gap-3 border-t border-[var(--border)] pt-3"
          onSubmit={onSubmit}
        >
          <p className="text-[12px] font-semibold text-[var(--text)]">
            차량 등록
          </p>
          <p className="text-[11px] leading-snug text-[var(--text-muted)]">
            기종을 고르면 기본 충전 포트가 따라옵니다. 필요하면 포트를 직접 바꿀
            수 있습니다.
          </p>

          {status === "error" ? (
            <button
              type="button"
              onClick={() => void useCarStore.getState().hydrate()}
              className="rounded-[8px] border border-[var(--border)] px-3 py-2 text-left text-[12px] text-[var(--text-muted)] touch-manipulation"
            >
              기종 목록을 불러오지 못했습니다. 다시 시도
            </button>
          ) : null}

          <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
            기종
            <select
              name="carModelId"
              value={modelId}
              onChange={(e) => {
                const next = e.target.value;
                setModelId(next);
                if (next !== CUSTOM_MODEL) {
                  setChargingPort("");
                  setCustomModelName("");
                } else {
                  setOverridePort(true);
                }
              }}
              className={fieldClass}
            >
              <option value="">기종 선택</option>
              {carModels.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.manufacturer} · {m.modelName}
                </option>
              ))}
              <option value={CUSTOM_MODEL}>목록에 없음 (직접 입력)</option>
            </select>
          </label>

          {isCustom ? (
            <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
              직접 입력 기종명
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

          {!isCustom && defaultPort ? (
            <p className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <PortGlyph
                port={defaultPort}
                className="h-7 w-7 object-contain"
              />
              기본 포트: {portLabel(defaultPort)}
            </p>
          ) : null}

          <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
            차량 번호
            <span className="mt-0.5 block font-normal text-[11px] text-[var(--text-muted)]">
              선택
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
                  {isCustom
                    ? "커스텀 기종은 포트가 필수입니다"
                    : overridePort
                      ? "직접 지정 중"
                      : "기종 기본 포트를 사용합니다"}
                </p>
              </div>
              {!isCustom ? (
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
              ) : null}
            </div>

            {showPortSelect ? (
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {PORT_OPTIONS.map(({ port, label }) => {
                  const selected = chargingPort === port;
                  return (
                    <button
                      key={port}
                      type="button"
                      onClick={() => setChargingPort(port)}
                      className={[
                        "flex flex-col items-center gap-1 rounded-[8px] border px-1.5 py-2 text-[11px] font-medium touch-manipulation",
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--surface-muted)]",
                      ].join(" ")}
                    >
                      <PortGlyph
                        port={port}
                        className="h-9 w-9 object-contain"
                      />
                      {label}
                    </button>
                  );
                })}
              </div>
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
            disabled={!isAuthenticated || saving}
            className="w-full rounded-[var(--radius-pill)] bg-[var(--text)] px-4 py-3 text-[14px] font-semibold text-white shadow-[var(--shadow-sm)] disabled:opacity-50"
          >
            {saving ? "저장 중…" : "차량 저장"}
          </button>
        </form>
      ) : null}

      {!isAuthenticated ? (
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
                    "flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12px] font-medium transition-colors touch-manipulation",
                    selected
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--surface-muted)]",
                  ].join(" ")}
                >
                  <PortGlyph
                    port={port}
                    className="h-6 w-6 object-contain"
                  />
                  {label}
                </button>
              );
            })}
            {isTemp ? (
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
      ) : null}
    </div>
  );
}
