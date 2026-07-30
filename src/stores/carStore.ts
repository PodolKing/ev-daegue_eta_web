import { create } from "zustand";
import type { Car, CarModel, ChargingPort } from "@/types/car";

type CarState = {
  cars: Car[];
  carModels: CarModel[];
  /** 지도 필터·패널 기준 차량 (없으면 null) */
  primaryCar: Car | null;
  /** 내 차량 포트만 보기 — 차 있으면 기본 true */
  filterByCarPort: boolean;

  setCars: (cars: Car[]) => void;
  setCarModels: (carModels: CarModel[]) => void;
  setPrimaryCar: (car: Car | null) => void;
  setFilterByCarPort: (v: boolean) => void;
};

/** 필터에 쓸 유효 포트 */
export function effectiveChargingPort(car: Car | null | undefined): ChargingPort | null {
  if (!car) return null;
  return car.chargingPort ?? car.carModel?.chargingPort ?? null;
}

export const useCarStore = create<CarState>((set) => ({
  cars: [],
  carModels: [],
  primaryCar: null,
  filterByCarPort: true,

  setCars: (cars) =>
    set({
      cars,
      primaryCar: cars.find((c) => c.isPrimary) ?? cars[0] ?? null,
    }),
  setCarModels: (carModels) => set({ carModels }),
  setPrimaryCar: (primaryCar) => set({ primaryCar }),
  setFilterByCarPort: (filterByCarPort) => set({ filterByCarPort }),
}));
