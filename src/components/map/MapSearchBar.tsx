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
  const isCompact = useCompactLayout();

  const center = useMapStore((s) => s.center);
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
        return;
      }
      setOpen(true);

      if (!FEATURES.tmapPlaceSearch) {
        setResults([]);
        setLoading(false);
        setError("__UNIMPLEMENTED__");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const items = await searchTmapPlaces(trimmed, center);
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
    [center],
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
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
    setQuery(place.name);
    setOpen(false);
    setSearchOpen(false);
    setInputFocused(false);
    setFollow(false);
    setSelectedId(null);
    setMobileSheetSnap("peek");
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
