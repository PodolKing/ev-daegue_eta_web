/** Canonical module: `@/stores/carStore` — filename must stay `carStore.ts`. */
/** Canonical module: `@/stores/carStore` — filename must stay `carStore.ts`. */
import { create } from "zustand";
import {
  FavoriteAuthError,
  createCarApi,
  deleteCarApi,
  fetchCarModels,
  fetchMyCars,
  setPrimaryCarApi,
  updateCarApi,
  type CarCreateBody,
  type CarUpdateBody,
} from "@/lib/api";
import type { Car, CarModel, ChargingPort } from "@/types/car";

type CarState = {
  cars: Car[];
  carModels: CarModel[];
  primaryCar: Car | null;
  filterByCarPort: boolean;
  status: "idle" | "loading" | "error";
  saving: boolean;

  setCars: (cars: Car[]) => void;
  setCarModels: (carModels: CarModel[]) => void;
  setPrimaryCar: (car: Car | null) => void;
  setFilterByCarPort: (v: boolean) => void;
  hydrate: () => Promise<void>;
  createCar: (body: CarCreateBody) => Promise<boolean>;
  updateCar: (carId: number, body: CarUpdateBody) => Promise<boolean>;
  setPrimary: (carId: number, isPrimary: boolean) => Promise<boolean>;
  removeCar: (carId: number) => Promise<boolean>;
  clear: () => void;
};

function primaryFrom(cars: Car[]): Car | null {
  return cars.find((c) => c.isPrimary) ?? null;
}

export function carTitle(car: Car): string {
  if (car.customModelName) return car.customModelName;
  if (car.carModel) {
    return `${car.carModel.manufacturer} · ${car.carModel.modelName}`;
  }
  return "차량";
}

export function carDisplayLabel(car: Car): string {
  return [carTitle(car), car.carNumber].filter(Boolean).join(" · ");
}

function onAuthFail(set: (p: Partial<CarState>) => void) {
  set({
    cars: [],
    carModels: [],
    primaryCar: null,
    status: "idle",
    saving: false,
  });
  void import("@/stores/authStore").then((m) => {
    m.useAuthStore.getState().clear();
  });
}

/** 필터에 쓸 유효 포트 */
export function effectiveChargingPort(
  car: Car | null | undefined,
): ChargingPort | null {
  if (!car) return null;
  return car.chargingPort ?? car.carModel?.chargingPort ?? null;
}

export const useCarStore = create<CarState>((set, get) => ({
  cars: [],
  carModels: [],
  primaryCar: null,
  filterByCarPort: true,
  status: "idle",
  saving: false,

  setCars: (cars) =>
    set({
      cars,
      primaryCar: primaryFrom(cars),
    }),
  setCarModels: (carModels) => set({ carModels }),
  setPrimaryCar: (primaryCar) => set({ primaryCar }),
  setFilterByCarPort: (filterByCarPort) => set({ filterByCarPort }),

  hydrate: async () => {
    set({ status: "loading" });
    try {
      const [modelsRes, carsRes] = await Promise.all([
        fetchCarModels(),
        fetchMyCars(),
      ]);
      const cars = carsRes.items ?? [];
      set({
        carModels: modelsRes.items ?? [],
        cars,
        primaryCar: primaryFrom(cars),
        status: "idle",
      });
    } catch (e) {
      if (e instanceof FavoriteAuthError) {
        onAuthFail(set);
        return;
      }
      set({ status: "error" });
    }
  },

  createCar: async (body) => {
    set({ saving: true });
    try {
      await createCarApi(body);
      await get().hydrate();
      set({ saving: false });
      return true;
    } catch (e) {
      if (e instanceof FavoriteAuthError) {
        onAuthFail(set);
        return false;
      }
      window.alert(e instanceof Error ? e.message : "차량 등록에 실패했습니다");
      set({ saving: false });
      return false;
    }
  },

  updateCar: async (carId, body) => {
    set({ saving: true });
    try {
      await updateCarApi(carId, body);
      await get().hydrate();
      set({ saving: false });
      return true;
    } catch (e) {
      if (e instanceof FavoriteAuthError) {
        onAuthFail(set);
        return false;
      }
      window.alert(e instanceof Error ? e.message : "차량 수정에 실패했습니다");
      set({ saving: false });
      return false;
    }
  },

  setPrimary: async (carId, isPrimary) => {
    try {
      await setPrimaryCarApi(carId, isPrimary);
      await get().hydrate();
      return true;
    } catch (e) {
      if (e instanceof FavoriteAuthError) {
        onAuthFail(set);
        return false;
      }
      window.alert(e instanceof Error ? e.message : "대표 차량 변경에 실패했습니다");
      return false;
    }
  },

  removeCar: async (carId) => {
    try {
      await deleteCarApi(carId);
      await get().hydrate();
      return true;
    } catch (e) {
      if (e instanceof FavoriteAuthError) {
        onAuthFail(set);
        return false;
      }
      window.alert(e instanceof Error ? e.message : "차량 삭제에 실패했습니다");
      return false;
    }
  },

  clear: () =>
    set({
      cars: [],
      carModels: [],
      primaryCar: null,
      status: "idle",
      saving: false,
    }),
}));