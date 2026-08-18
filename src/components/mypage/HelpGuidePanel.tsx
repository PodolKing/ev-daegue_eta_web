"use client";

import { useState } from "react";
import type { NavId } from "@/components/layout/IconRail";
import { HELP_FAQS } from "@/components/mypage/helpFaqs";

type HelpGuidePanelProps = {
  onBack: () => void;
  onSelectNav?: (id: NavId) => void;
};

export function HelpGuidePanel({ onBack, onSelectNav }: HelpGuidePanelProps) {
  const [openId, setOpenId] = useState<string | null>(HELP_FAQS[0]?.id ?? null);

  return (
    <section className="ev-scroll-panel flex h-full min-h-0 w-full flex-col overflow-y-auto bg-[var(--surface)] px-3 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--border)] bg-white text-[13px] text-[var(--text-secondary)] touch-manipulation hover:bg-[var(--surface-muted)]"
          aria-label="마이페이지로"
        >
          ‹
        </button>
        <div className="min-w-0">
          <h2
            className="text-[14px] font-bold tracking-tight text-[var(--text)] sm:text-[18px]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            사용 안내
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
            자주 헷갈리는 버튼만 쉽게 풀어 두었어요
          </p>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {HELP_FAQS.map((item) => {
          const open = openId === item.id;
          return (
            <li key={item.id}>
              <div
                className={[
                  "rounded-[12px] border bg-white shadow-[var(--shadow-sm)]",
                  open
                    ? "border-[var(--accent)]/35"
                    : "border-[var(--border)]",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="flex w-full min-h-11 items-start gap-2 px-3.5 py-3 text-left touch-manipulation"
                >
                  <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-[var(--text)]">
                    {item.q}
                  </span>
                  <span
                    className={[
                      "mt-0.5 shrink-0 text-[11px] leading-none text-[var(--text-muted)] transition-transform",
                      open ? "rotate-180" : "",
                    ].join(" ")}
                    aria-hidden
                  >
                    ⌄
                  </span>
                </button>
                {open ? (
                  <p className="border-t border-[var(--border)] px-3.5 py-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {item.a}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {onSelectNav ? (
        <button
          type="button"
          onClick={() => onSelectNav("map")}
          className="mt-3 w-full rounded-[var(--radius-pill)] bg-[var(--text)] px-4 py-3 text-[13px] font-semibold text-white shadow-[var(--shadow-sm)] touch-manipulation"
        >
          지도에서 보기
        </button>
      ) : null}
    </section>
  );
}
