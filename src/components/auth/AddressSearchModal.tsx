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
import { FEATURES } from "@/lib/features";
import { BodyPortal } from "@/components/auth/BodyPortal";

type AddressSearchModalProps = {
  open: boolean;
  onClose: () => void;
  /** 가입 폼: 표시 주소 + TMAP 좌표 */
  onSelect: (result: {
    address: string;
    lat: number;
    lng: number;
  }) => void;
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

function formatSignupAddress(place: TmapPlaceResult): string {
  const addr = place.address?.trim();
  const name = place.name?.trim();
  if (addr && name && !addr.includes(name)) return `${addr} ${name}`.trim();
  return addr || name || "";
}

export default function AddressSearchModal({
  open,
  onClose,
  onSelect,
}: AddressSearchModalProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<TmapPlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setKeyword("");
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    if (!FEATURES.tmapPlaceSearch) {
      setResults([]);
      setError("장소 검색이 아직 켜져 있지 않습니다");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await searchTmapPlaces(trimmed);
      setResults(items);
      if (items.length === 0) setError("검색 결과가 없습니다");
    } catch {
      setResults([]);
      setError("검색에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!keyword.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    const handle = window.setTimeout(() => {
      void runSearch(keyword);
    }, 320);
    return () => window.clearTimeout(handle);
  }, [keyword, open, runSearch]);

  if (!open) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSearch(keyword);
  };

  const pick = (place: TmapPlaceResult) => {
    const line = formatSignupAddress(place);
    if (!line) return;
    onSelect({
      address: line,
      lat: place.lat,
      lng: place.lng,
    });
    onClose();
  };

  return (
    <BodyPortal>
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-search-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="닫기"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[min(88dvh,560px)] w-full max-w-md flex-col overflow-hidden rounded-t-[var(--radius-lg)] border border-[var(--border)] bg-white shadow-[var(--shadow-md)] sm:rounded-[var(--radius-lg)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Address
            </p>
            <h2
              id="address-search-title"
              className="mt-0.5 text-[17px] font-bold tracking-tight text-[var(--text)]"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              주소 검색
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-4 py-3"
          role="search"
        >
          <span className="shrink-0 text-[var(--text-muted)]">
            <SearchIcon size={18} />
          </span>
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="도로명·건물명·동 이름"
            aria-label="주소 검색어"
            aria-controls={listId}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          />
          {keyword ? (
            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setResults([]);
                setError(null);
                inputRef.current?.focus();
              }}
              className="shrink-0 rounded-full px-1 text-[12px] text-[var(--text-muted)] hover:text-[var(--text)]"
              aria-label="검색어 지우기"
            >
              ✕
            </button>
          ) : null}
          <button
            type="submit"
            className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            검색
          </button>
        </form>

        <div
          id={listId}
          role="listbox"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {loading && (
            <p className="animate-soft-pulse px-4 py-4 text-[13px] text-[var(--text-muted)]">
              검색 중…
            </p>
          )}

          {!loading && !keyword.trim() && (
            <p className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">
              검색어를 입력하면 결과가 여기에 표시됩니다
            </p>
          )}

          {!loading && error && results.length === 0 && keyword.trim() && (
            <p className="px-4 py-4 text-[13px] text-[var(--text-secondary)]">
              {error}
            </p>
          )}

          {!loading &&
            results.map((place, index) => (
              <button
                key={`${place.id}-${index}`}
                type="button"
                role="option"
                onClick={() => pick(place)}
                className="flex w-full flex-col gap-0.5 border-b border-[var(--border)] px-4 py-3.5 text-left last:border-b-0 hover:bg-[var(--surface-muted)] active:bg-[var(--surface-muted)]"
              >
                <span className="truncate text-[13px] font-semibold text-[var(--text)]">
                  {place.name || "이름 없음"}
                </span>
                <span className="truncate text-[11px] text-[var(--text-muted)]">
                  {place.address || "주소 정보 없음"}
                </span>
              </button>
            ))}
        </div>

        <p className="shrink-0 border-t border-[var(--border)] px-4 py-2.5 text-[11px] text-[var(--text-muted)]">
          최대 10건 · TMAP 장소 검색
        </p>
      </div>
    </div>
    </BodyPortal>
  );
}
