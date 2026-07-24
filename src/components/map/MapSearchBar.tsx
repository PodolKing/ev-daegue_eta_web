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

type MapSearchBarProps = {
  /** 결과 선택 후 추가 동작 (마커 등). 기본은 setCenter만. */
  onPlaceSelect?: (place: TmapPlaceResult) => void;
};

export function MapSearchBar({ onPlaceSelect }: MapSearchBarProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const center = useMapStore((s) => s.center);
  const setCenter = useMapStore((s) => s.setCenter);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmapPlaceResult[]>([]);
  const [open, setOpen] = useState(false);
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
      setLoading(true);
      setError(null);
      try {
        const items = await searchTmapPlaces(trimmed, center);
        setResults(items);
        setOpen(true);
        if (items.length === 0) {
          setError("검색 결과가 없습니다"); // API 연동 전엔 항상 비어 있을 수 있음
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

  // debounce
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
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const selectPlace = (place: TmapPlaceResult) => {
    setQuery(place.name);
    setOpen(false);
    setCenter({ lat: place.lat, lng: place.lng });
    onPlaceSelect?.(place);
    inputRef.current?.blur();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSearch(query);
    setOpen(true);
  };

  const showPanel = open && (loading || error != null || results.length > 0 || query.trim().length > 0);

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto w-full max-w-full sm:max-w-[min(100%,380px)]"
    >
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white/95 px-3 py-2 shadow-[var(--shadow-md)] backdrop-blur-md"
        role="search"
      >
        <span className="shrink-0 text-[var(--text-muted)]" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="m16 16 4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
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
          placeholder="장소·주소 검색"
          aria-label="TMAP 장소 검색"
          aria-controls={listId}
          aria-expanded={showPanel}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setError(null);
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded-full px-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="검색어 지우기"
          >
            ✕
          </button>
        ) : null}
        <button
          type="submit"
          className="hidden shrink-0 rounded-[var(--radius-pill)] bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white sm:inline-flex"
        >
          검색
        </button>
      </form>

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="mt-2 max-h-[min(42dvh,320px)] overflow-y-auto overscroll-contain rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/98 shadow-[var(--shadow-md)] backdrop-blur-md sm:max-h-[360px]"
        >
          {loading && (
            <p className="px-4 py-3 text-[13px] text-[var(--text-muted)] animate-soft-pulse">
              검색 중…
            </p>
          )}

          {!loading && error && results.length === 0 && (
            <p className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
              {error}
              <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                {/* TODO 안내 */}
                TMAP 검색 API 연동 후 결과가 표시됩니다
              </span>
            </p>
          )}

          {!loading &&
            results.map((place) => (
              <button
                key={place.id}
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
      ) : null}
    </div>
  );
}
