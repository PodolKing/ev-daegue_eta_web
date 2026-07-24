"use client";

type NavId = "map" | "favorites" | "points" | "settings";

const NAV: { id: NavId; label: string; icon: React.ReactNode }[] = [
  {
    id: "map",
    label: "지도",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5 9 4.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M9 4.5v13M15 6.5v13" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    id: "favorites",
    label: "즐겨찾기",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="m12 4.5 2.2 4.5 5 .7-3.6 3.5.9 5L12 15.8 7.5 18.2l.9-5L4.8 9.7l5-.7L12 4.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
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
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 8v8M9.5 10.5c.5-1 1.4-1.5 2.5-1.5s2 .6 2 1.7c0 2.3-4.5 1.5-4.5 3.8 0 1 .8 1.7 2 1.7s1.9-.4 2.4-1.2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "설정",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 3.5v2.2M12 18.3v2.2M4.9 7.2l1.9 1.1M17.2 15.7l1.9 1.1M3.5 12h2.2M18.3 12h2.2M4.9 16.8l1.9-1.1M17.2 8.3l1.9-1.1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
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
        className="mb-6 flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--text)] text-white shadow-[var(--shadow-sm)]"
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
                "group relative flex h-11 w-11 items-center justify-center rounded-[12px] transition-colors",
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              {isActive && (
                <span className="absolute left-[-10px] h-5 w-1 rounded-r-full bg-[var(--accent)]" />
              )}
              {item.icon}
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-secondary)]">
        EV
      </div>
    </aside>
  );
}
