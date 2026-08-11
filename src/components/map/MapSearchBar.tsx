"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  searchTmapPlaces,
  type TmapPlaceResult,
  searchTmapPlacesAround,
} from "@/lib/tmap/searchPlaces";
import { useMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";
import { useRouteStore } from "@/stores/routeStore";
import { useCompactLayout } from "@/lib/device/useCompactLayout";
import { FEATURES } from "@/lib/features";
import {
  UnimplementedBadge,
  UnimplementedHint,
} from "@/components/ui/Unimplemented";
import { PlaceCategoryChips } from "@/components/map/PlaceCategoryChips";
import {
  PLACE_CATEGORY_CHIPS,
  type PlaceCategoryId,
} from "@/lib/map/placeCategories";
import { haversineMeters } from "@/lib/map/stationHit";
import { usePlaceCategoryStore } from "@/stores/placeCategoryStore";

/** 자유주행 fake GPS 이동 시 카테고리 around 재검색 최소 거리 */
const CATEGORY_ORIGIN_REFETCH_MIN_M = 150;

type MapSearchBarProps = {
  onPlaceSelect?: (place: TmapPlaceResult) => void;
};

/** Place pick: closer street view (tighter than 현위치/1km = 16). */
const PLACE_SEARCH_ZOOM = 18;

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MapSearchBar({ onPlaceSelect }: MapSearchBarProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipDebouncedSearchRef = useRef(false);
  const isCompact = useCompactLayout();


  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);
  const setSelectedId = useMapStore((s) => s.setSelectedId);
  const setMobileSheetSnap = useMapStore((s) => s.setMobileSheetSnap);
  const setSearchUiOpen = useMapStore((s) => s.setSearchUiOpen);
  const setDestination = useRouteStore((s) => s.setDestination);
  const setFollow = useLocationStore((s) => s.setFollow);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmapPlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  /** Compact only: collapsed = icon, open = original pill bar. Desktop always on. */
  const [searchOpen, setSearchOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults([]);
        setError(null);
        usePlaceCategoryStore.getState().clear();
        return;
      }
      setOpen(true);
      // 키워드 검색 시 카테고리 마커 해제
      usePlaceCategoryStore.getState().clear();

      if (!FEATURES.tmapPlaceSearch) {
        setResults([]);
        setLoading(false);
        setError("__UNIMPLEMENTED__");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const items = await searchTmapPlaces(
          trimmed,
          useMapStore.getState().center,
        );
        setResults(items);
        if (items.length === 0) {
          setError("검색 결과가 없습니다");
        }
      } catch {
        setResults([]);
        setError("검색에 실패했습니다");
      } finally {
        setLoading(false);
      }
    },
  [],
  );

  const radiusKm = useMapStore((s) => s.radiusKm);
  const categoryActive = usePlaceCategoryStore((s) => s.active);
  const categoryId = usePlaceCategoryStore((s) => s.categoryId);
  const testMode = useLocationStore((s) => s.testMode);
  const coords = useLocationStore((s) => s.coords);
  const stationsAnchor = useMapStore((s) => s.stationsAnchor);
  const prevRadiusKmRef = useRef(radiusKm);
  /** 마지막 around 조회 원점 — 자유주행 탭 재검색 스로틀 */
  const lastCategoryOriginRef = useRef<{ lat: number; lng: number } | null>(
    null,
  );

  const runCategorySearch = useCallback(
    async (
      nextId: PlaceCategoryId | null,
      category: string | null,
      opts?: { silent?: boolean },
    ) => {
      if (!nextId || !category) {
        setResults([]);
        setError(null);
        usePlaceCategoryStore.getState().clear();
        lastCategoryOriginRef.current = null;
        return;
      }
      if (!opts?.silent) {
        // 키워드가 있을 때만 skip — 빈 query면 effect가 안 돌아 skip이 고착됨
        setQuery((prev) => {
          if (prev.trim()) skipDebouncedSearchRef.current = true;
          return "";
        });
        // 모바일: 지도 마커만 — 결과 리스트 닫음. 데스크톱: 리스트 유지.
        if (isCompact) {
          setOpen(false);
          setInputFocused(false);
          inputRef.current?.blur();
        } else {
          setOpen(true);
        }
      }

      if (!FEATURES.tmapPlaceSearch) {
        setResults([]);
        setLoading(false);
        setError("__UNIMPLEMENTED__");
        usePlaceCategoryStore.getState().clear();
        return;
      }

      // 충전소 조회와 동일: 도착지(stationsAnchor) → GPS → 지도 center
      const { center, radiusKm: km, stationsAnchor: anchor } =
        useMapStore.getState();
      const loc = useLocationStore.getState().coords;
      const origin = anchor ?? loc ?? center;
      lastCategoryOriginRef.current = { lat: origin.lat, lng: origin.lng };
      setLoading(true);
      setError(null);
      try {
        const items = await searchTmapPlacesAround({
          categories: category,
          lat: origin.lat,
          lng: origin.lng,
          radiusKm: km,
        });
        setResults(items);
        usePlaceCategoryStore.getState().setResults(nextId, items);
        // 성공·빈 결과: UI 메시지 없음
        if (isCompact) setOpen(false);
      } catch (err) {
        console.error("[places/around]", { category, origin, err });
        setResults([]);
        usePlaceCategoryStore.getState().clear();
        setError("검색에 실패했습니다");
      } finally {
        setLoading(false);
      }
    },
    [isCompact],
  );

  // 반경 1·2·3 변경 → 활성 카테고리 around 자동 재검색 (마커·리스트)
  useEffect(() => {
    if (prevRadiusKmRef.current === radiusKm) return;
    prevRadiusKmRef.current = radiusKm;
    if (!categoryActive || !categoryId) return;
    const chip = PLACE_CATEGORY_CHIPS.find((c) => c.id === categoryId);
    if (!chip) return;
    void runCategorySearch(categoryId, chip.category, { silent: true });
  }, [radiusKm, categoryActive, categoryId, runCategorySearch]);

  // 자유주행 탭(fake GPS) → 칩이 켜져 있으면 그 점 주변 재검색
  // 도착지(stationsAnchor) 고정 시에는 원점 유지
  useEffect(() => {
    if (!testMode || !categoryActive || !categoryId || !coords) return;
    if (stationsAnchor) return;
    const prev = lastCategoryOriginRef.current;
    if (!prev) return;
    if (haversineMeters(prev, coords) < CATEGORY_ORIGIN_REFETCH_MIN_M) return;
    const chip = PLACE_CATEGORY_CHIPS.find((c) => c.id === categoryId);
    if (!chip) return;
    void runCategorySearch(categoryId, chip.category, { silent: true });
  }, [
    testMode,
    categoryActive,
    categoryId,
    coords?.lat,
    coords?.lng,
    stationsAnchor,
    runCategorySearch,
  ]);

  useEffect(() => {
    if (!query.trim()) {
      // 칩 검색이 query를 비운 경우 — results clear 금지 (레이스)
      if (skipDebouncedSearchRef.current) {
        skipDebouncedSearchRef.current = false;
        return;
      }
      setResults([]);
      setError(null);
      // 칩 마커는 active면 유지 — clearQuery/칩 off만 clear
      return;
    }
    if (skipDebouncedSearchRef.current) {
      skipDebouncedSearchRef.current = false;
      return; // 재검색·setOpen(true) 안 함
    }
    const t = window.setTimeout(() => {
      void runSearch(query);
    }, 350);
    return () => window.clearTimeout(t);
  }, [query, runSearch]);

  useEffect(() => {
    if (!isCompact) setSearchOpen(false);
  }, [isCompact]);

  /**
   * Searching with sheet half/full parks FABs mid-screen; keyboard then covers
   * the search field. Collapse sheet + flag MapView to hide FABs while active.
   */
  useEffect(() => {
    const active = isCompact ? searchOpen : inputFocused || open;
    setSearchUiOpen(active);
    if (active) setMobileSheetSnap("peek");
  }, [
    isCompact,
    searchOpen,
    inputFocused,
    open,
    setSearchUiOpen,
    setMobileSheetSnap,
  ]);

  useEffect(() => {
    return () => setSearchUiOpen(false);
  }, [setSearchUiOpen]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setInputFocused(false);
        // Compact: tap map/FAB → collapse pill bar back to icon
        if (isCompact) setSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isCompact]);

  // Layout change (icon ↔ bar) → TMAP tiles often need resize on mobile
  useEffect(() => {
    const map = useMapStore.getState().map;
    if (!map || typeof map.resize !== "function") return;
    const t = window.setTimeout(() => map.resize(), 80);
    return () => window.clearTimeout(t);
  }, [searchOpen, isCompact]);

  const selectPlace = (place: TmapPlaceResult) => {
    skipDebouncedSearchRef.current = true;
    setResults([]);
    setError(null);
    setQuery(place.name);
    setOpen(false);
    setSearchOpen(false);
    setInputFocused(false);
    setFollow(false);
    setSelectedId(null);
    setMobileSheetSnap("peek");
    usePlaceCategoryStore.getState().setSelectedId(place.id);
    setDestination({
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    });
    setCenter({ lat: place.lat, lng: place.lng });
    setZoom(PLACE_SEARCH_ZOOM);
    // Store zoom alone does not move TMAP — set camera imperatively (like 현위치).
    const map = useMapStore.getState().map;
    if (map && window.Tmapv2?.LatLng) {
      if (typeof map.setCenter === "function") {
        map.setCenter(new window.Tmapv2.LatLng(place.lat, place.lng));
      }
      if (typeof map.setZoom === "function") {
        map.setZoom(PLACE_SEARCH_ZOOM);
      }
    }
    onPlaceSelect?.(place);
    inputRef.current?.blur();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSearch(query);
    setOpen(true);
  };

  const clearQuery = () => {
    setQuery("");
    setResults([]);
    setError(null);
    setOpen(false);
    usePlaceCategoryStore.getState().clear();
    inputRef.current?.focus();
  };

  const showPanel =
    open &&
    (loading || error != null || results.length > 0 || query.trim().length > 0);

  const resultsList = (
    <div
      id={listId}
      role="listbox"
      className="mt-2 max-h-[min(42dvh,320px)] overflow-y-auto overscroll-contain rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/98 shadow-[var(--shadow-md)] backdrop-blur-md"
    >
      {loading && (
        <p className="px-4 py-3 text-[13px] text-[var(--text-muted)] animate-soft-pulse">
          검색 중…
        </p>
      )}
      {!loading && error === "__UNIMPLEMENTED__" && (
        <UnimplementedHint>
          TMAP 장소·주소 검색 API가 아직 연결되지 않았습니다. (
          <code className="text-[11px]">FEATURES.tmapPlaceSearch</code> →{" "}
          <code className="text-[11px]">searchTmapPlaces</code>)
        </UnimplementedHint>
      )}
      {!loading && error && error !== "__UNIMPLEMENTED__" && results.length === 0 && (
        <p className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{error}</p>
      )}
      {!loading &&
        results.map((place, index) => (
          <button
            key={`${place.id}-${index}`}
            type="button"
            role="option"
            onClick={() => selectPlace(place)}
            className="flex w-full flex-col gap-0.5 border-b border-[var(--border)] px-4 py-3 text-left last:border-b-0 active:bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]"
          >
            <span className="truncate text-[13px] font-semibold text-[var(--text)]">
              {place.name}
            </span>
            <span className="truncate text-[11px] text-[var(--text-muted)]">
              {place.address}
            </span>
          </button>
        ))}
    </div>
  );

  const searchForm = (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white/95 px-3 py-2 shadow-[var(--shadow-md)] backdrop-blur-md"
      role="search"
    >
      <span className="shrink-0 text-[var(--text-muted)]">
        <SearchIcon size={18} />
      </span>
      {!FEATURES.tmapPlaceSearch ? <UnimplementedBadge className="mr-0.5" /> : null}
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setInputFocused(true);
          setOpen(true);
        }}
        onBlur={() => setInputFocused(false)}
        placeholder={
          !FEATURES.tmapPlaceSearch ? "장소 검색 (미구현)" : "장소·주소 검색"
        }
        aria-label="TMAP 장소 검색"
        aria-controls={listId}
        aria-expanded={showPanel}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
      />
      {query ? (
        <button
          type="button"
          onClick={clearQuery}
          className="shrink-0 rounded-full px-1 text-[12px] text-[var(--text-muted)] hover:text-[var(--text)]"
          aria-label="검색어 지우기"
        >
          ✕
        </button>
      ) : isCompact ? (
        <button
          type="button"
          onClick={() => {
            setSearchOpen(false);
            setOpen(false);
            setInputFocused(false);
            inputRef.current?.blur();
          }}
          className="shrink-0 rounded-[var(--radius-pill)] px-2 py-1 text-[12px] font-medium text-[var(--text-secondary)] touch-manipulation"
          aria-label="검색 닫기"
        >
          닫기
        </button>
      ) : null}
      {!isCompact ? (
        <button
          type="submit"
          className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white"
        >
          검색
        </button>
      ) : null}
    </form>
  );

  // Compact: icon when closed, original pill bar when open
  if (isCompact && !searchOpen) {
    return (
      <div ref={rootRef} className="pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            setSearchOpen(true);
            window.setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white/95 text-[var(--text)] shadow-[var(--shadow-md)] backdrop-blur-md touch-manipulation"
          aria-label="장소 검색 열기"
          aria-expanded={false}
        >
          <SearchIcon />
          {!FEATURES.tmapPlaceSearch && (
            <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1 text-[8px] font-bold text-white">
              !
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto w-full max-w-full min-[361px]:max-w-[min(100%,380px)]"
    >
      {searchForm}
      {/* 검색바 펼침 시에만 칩 (compact 접힘 = 아이콘만). */}
      <PlaceCategoryChips
        onSelect={(id, category) => {
          void runCategorySearch(id, category);
        }}
      />
      {!FEATURES.tmapPlaceSearch && (
        <div className="mt-2">
          <UnimplementedHint>
            TMAP 검색 미연동 — <code className="text-[11px]">lib/tmap/searchPlaces.ts</code> ·{" "}
            <code className="text-[11px]">FEATURES.tmapPlaceSearch</code>
          </UnimplementedHint>
        </div>
      )}
      {showPanel ? resultsList : null}
    </div>
  );
}
