"use client";

type NavId = "map" | "favorites" | "points" | "settings";

/** Stroke icons — short, slightly uneven geometry (less Lucide-default). */
const NAV: { id: NavId; label: string; icon: React.ReactNode }[] = [
  {
    id: "map",
    label: "지도",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 21s-6.5-5.2-6.5-10.2A6.5 6.5 0 0 1 12 4.3a6.5 6.5 0 0 1 6.5 6.5C18.5 15.8 12 21 12 21Z"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10.8" r="2.1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "favorites",
    label: "즐겨찾기",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "points",
    label: "포인트",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x="4.5"
          y="6"
          width="15"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.85"
        />
        <path
          d="M8 10.2h3.2c1.35 0 2.3.75 2.3 1.95S12.55 14.1 11.2 14.1H8V10.2Zm0 3.9V17"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "설정",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 8.5h14M5 15.5h14"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
        />
        <circle cx="9" cy="8.5" r="2.15" fill="currentColor" />
        <circle cx="15" cy="15.5" r="2.15" fill="currentColor" />
      </svg>
    ),
  },
];

export function IconRail({
  active = "map",
}: {
  active?: NavId;
}) {
  return (
    <aside
      className="flex h-full w-[68px] shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--surface)] py-4"
      aria-label="주 메뉴"
    >
      <div
        className="mb-6 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--text)] text-white"
        title="EV SafeCharge"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5">
        {NAV.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              className={[
                "group relative flex h-11 w-11 items-center justify-center rounded-[10px] transition-colors",
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              {isActive && (
                <span className="absolute left-[-10px] h-4 w-[3px] bg-[var(--accent)]" />
              )}
              {item.icon}
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] text-[10px] font-bold tracking-wide text-[var(--text-secondary)]">
        EV
      </div>
    </aside>
  );
}
