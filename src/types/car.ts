/** DB `cars.charging_port` / `car_models.charging_port` */
export type ChargingPort = "CCS1" | "NACS" | "CHADEMO";

export type FuelType = "EV" | "PHEV";

/**
 * 유저 등록 차량 — `cars` 테이블 (API camelCase).
 * 유효 포트: `chargingPort ?? carModel.chargingPort`
 */
export type Car = {
  id: string;
  userId: string;
  carModelId: string | null;
  nickname: string | null;
  /** 오버라이드. null이면 car_models.charging_port */
  chargingPort: ChargingPort | null;
  isPrimary: boolean;
  customModelName: string | null;
  createdAt: string;
  updatedAt: string;
  /** join 시 포함될 수 있음 */
  carModel?: CarModel | null;
};

/** 카탈로그 — `car_models` */
export type CarModel = {
  id: string;
  manufacturer: string;
  modelName: string;
  fuelType: FuelType;
  chargingPort: ChargingPort | null;
  batteryCapacity: number | null;
  createdAt?: string;
  updatedAt?: string;
};
