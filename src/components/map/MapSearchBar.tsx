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
import { FEATURES } from "@/lib/features";
import {
  UnimplementedBadge,
  UnimplementedHint,
} from "@/components/ui/Unimplemented";

/** UI layout by viewport width — not analyticsDeviceType */
export type SearchBarLayout = "full" | "compact" | "icon";

function useSearchBarLayout(): SearchBarLayout {
  const [layout, setLayout] = useState<SearchBarLayout>("full");

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 320) setLayout("icon");
      else if (w <= 360) setLayout("compact");
      else setLayout("full");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return layout;
}

type MapSearchBarProps = {
  onPlaceSelect?: (place: TmapPlaceResult) => void;
};

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
  const layout = useSearchBarLayout();

  const center = useMapStore((s) => s.center);
  const setCenter = useMapStore((s) => s.setCenter);
  const setFollow = useLocationStore((s) => s.setFollow);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmapPlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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
    if (layout !== "icon") setSheetOpen(false);
  }, [layout]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [sheetOpen]);

  const selectPlace = (place: TmapPlaceResult) => {
    setQuery(place.name);
    setOpen(false);
    setSheetOpen(false);
    setFollow(false);
    setCenter({ lat: place.lat, lng: place.lng });
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
      className={
        layout === "icon"
          ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
          : "mt-2 max-h-[min(42dvh,320px)] overflow-y-auto overscroll-contain rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/98 shadow-[var(--shadow-md)] backdrop-blur-md"
      }
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

  const searchForm = (compact: boolean) => (
    <form
      onSubmit={onSubmit}
      className={[
        "flex items-center border border-[var(--border)] bg-white/95 shadow-[var(--shadow-md)] backdrop-blur-md",
        compact
          ? "gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1.5"
          : "gap-2 rounded-[var(--radius-pill)] px-3 py-2",
      ].join(" ")}
      role="search"
    >
      <span className="shrink-0 text-[var(--text-muted)]">
        <SearchIcon size={compact ? 16 : 18} />
      </span>
      {!FEATURES.tmapPlaceSearch && !compact ? (
        <UnimplementedBadge className="mr-0.5" />
      ) : null}
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
        onFocus={() => setOpen(true)}
        placeholder={
          !FEATURES.tmapPlaceSearch
            ? compact
              ? "미구현"
              : "장소 검색 (미구현)"
            : compact
              ? "검색"
              : "장소·주소 검색"
        }
        aria-label="TMAP 장소 검색"
        aria-controls={listId}
        aria-expanded={showPanel}
        className={[
          "min-w-0 flex-1 bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]",
          compact ? "text-[13px]" : "text-[14px]",
        ].join(" ")}
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
      ) : null}
      {!compact && (
        <button
          type="submit"
          className="hidden shrink-0 rounded-[var(--radius-pill)] bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white min-[361px]:inline-flex"
        >
          검색
        </button>
      )}
    </form>
  );

  // < 320: icon → bottom sheet (keeps map + zoom clear)
  if (layout === "icon") {
    return (
      <div ref={rootRef} className="pointer-events-auto">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white/95 text-[var(--text)] shadow-[var(--shadow-md)] backdrop-blur-md"
          aria-label="장소 검색 열기 (미구현)"
        >
          <SearchIcon />
          {!FEATURES.tmapPlaceSearch && (
            <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1 text-[8px] font-bold text-white">
              !
            </span>
          )}
        </button>

        {sheetOpen ? (
          <div
            className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/35"
            role="dialog"
            aria-modal="true"
            aria-label="장소 검색"
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="검색 닫기"
              onClick={() => setSheetOpen(false)}
            />
            <div className="relative flex max-h-[min(70dvh,520px)] flex-col rounded-t-[20px] border border-[var(--border)] bg-white shadow-[var(--shadow-md)]">
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)]" />
              <div className="flex items-center justify-between px-4 pb-2 pt-3">
                <p
                  className="flex items-center gap-2 text-[15px] font-bold text-[var(--text)]"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  장소 검색
                  {!FEATURES.tmapPlaceSearch && <UnimplementedBadge />}
                </p>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="text-[13px] text-[var(--text-secondary)]"
                >
                  닫기
                </button>
              </div>
              <div className="px-3 pb-2">{searchForm(true)}</div>
              {!FEATURES.tmapPlaceSearch && !showPanel ? (
                <UnimplementedHint>
                  검색 API 미연동. 구현 후 <code className="text-[11px]">FEATURES.tmapPlaceSearch = true</code>
                </UnimplementedHint>
              ) : null}
              {showPanel ? resultsList : FEATURES.tmapPlaceSearch ? (
                <p className="px-4 pb-6 text-[12px] text-[var(--text-muted)]">
                  주소나 장소 이름을 입력하세요
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // 320–360 compact · >360 full (right padding reserved in MapView for zoom)
  return (
    <div
      ref={rootRef}
      className={[
        "pointer-events-auto w-full",
        layout === "compact" ? "max-w-[220px]" : "max-w-full min-[361px]:max-w-[min(100%,380px)]",
      ].join(" ")}
    >
      {searchForm(layout === "compact")}
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
