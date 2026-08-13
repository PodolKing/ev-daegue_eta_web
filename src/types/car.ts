/** DB `cars.charging_port` / `car_models.charging_port` */
export type ChargingPort = "CCS1" | "NACS" | "CHADEMO";

export type FuelType = "EV" | "PHEV";

/**
 * 유저 등록 차량 — `cars` 테이블 (API camelCase).
 * 유효 포트: `chargingPort ?? carModel.chargingPort`
 */
export type Car = {
  id: number;
  carModelId: number | null;
  carNumber: string | null;
  /** 오버라이드. null이면 car_models.charging_port */
  chargingPort: ChargingPort | null;
  isPrimary: boolean;
  customModelName: string | null;
  createdAt: string;
  updatedAt: string;
  /** GET/POST 응답의 `model`을 FE에서 carModel로 매핑 */
  carModel?: CarModel | null;
};

/** 카탈로그 — `car_models` */
export type CarModel = {
  id: number;
  manufacturer: string;
  modelName: string;
  fuelType: FuelType;
  chargingPort: ChargingPort | null;
  batteryCapacity: number | null;
};