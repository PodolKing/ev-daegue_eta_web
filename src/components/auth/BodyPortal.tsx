"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * 모바일 시트(transform) 안의 fixed 오버레이가 뷰포트가 아니라
 * 시트에 갇히는 것을 막기 위해 document.body로 올린다.
 */
export function BodyPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.body);
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
