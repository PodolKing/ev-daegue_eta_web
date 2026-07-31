import { getApiBase } from "@/lib/api";

export type RoutePoint = {
    lat: number;
    lng: number;
};

export type CarRouteResponse = {
    distanceM: number;
    durationSec: number;
    path: RoutePoint[];
};

export type CarRouteRequest = {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    startName?: string;
    endName?: string;
};

export async function fetchCarRoute(request: CarRouteRequest): Promise<CarRouteResponse> {
    const response = await fetch(`${getApiBase()}/api/v1/routes/car`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        throw new Error("Failed to fetch car route");
    }
    return response.json() as Promise<CarRouteResponse>;
}