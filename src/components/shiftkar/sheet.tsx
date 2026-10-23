"use client";
/**
 * Sheet — the original ShiftKar bottom sheet, faithfully rebuilt for React.
 *
 *  - Collapsed: up to 86dvh tall, header + fully scrollable body
 *  - Expands to FULLSCREEN (100dvh) by: swiping up at the scroll end,
 *    scrolling the body to its very end, or tapping the handle / header
 *    expand button
 *  - Fullscreen: swipe down (or the collapse button) returns to the peek
 *  - Dismiss: swipe down from the collapsed state, X, backdrop or Escape
 *  - Entrance/exit are pure CSS keyframes; dragging is inline transform
 *  - No backdrop-filter, no layout-thrashing animations
 *
 * Matches js/components/bottom-sheet.js of the original project.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, ChevronUpIcon, CloseIcon } from "./icons";

let scrollLocks = 0;
function lockBodyScroll() {
  scrollLocks += 1;
  document.body.classList.add("sk-sheet-open");
}
function unlockBodyScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.classList.remove("sk-sheet-open");
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  expandable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  expandable?: boolean;
}) {
  const [alive, setAlive] = useState(open);

  /* open → mount immediately (render-time adjust; entrance is CSS) */
  if (open && !alive) setAlive(true);

  /* close → linger for the exit animation, then unmount */
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setAlive(false), 280);
    return () => clearTimeout(t);
  }, [open]);

  if (!alive) return null;
  return (
    <SheetView open={open} onClose={onClose} title={title} expandable={expandable}>
      {children}
    </SheetView>
  );
}

function SheetView({
  open,
  onClose,
  title,
  children,
  expandable,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  expandable: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);
  const dragMode = useRef<"dismiss" | "collapse" | "expand" | null>(null);

  const closing = !open;

  /* Escape to close */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* body scroll lock while open */
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  const setFs = useCallback(
    (on: boolean) => {
      if (!expandable) return;
      setFullscreen(on);
    },
    [expandable],
  );

  const isScrollable = () => {
    const b = bodyRef.current;
    return !!b && b.scrollHeight > b.clientHeight + 6;
  };

  /* scroll to the very end of the body → expand (original behavior) */
  const onBodyScroll = useCallback(() => {
    const b = bodyRef.current;
    if (!b || fullscreen || !expandable || !isScrollable()) return;
    if (b.scrollTop + b.clientHeight >= b.scrollHeight - 10) setFs(true);
  }, [fullscreen, expandable, setFs]);

  /* ---- swipe gestures (translate-only while dragging) ---- */
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    dragging.current = false;
    dragMode.current = null;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    const b = bodyRef.current;

    if (!dragging.current) {
      if (dy > 8) {
        /* down: dismiss (collapsed) / collapse (fullscreen) — only when the
           body can't scroll up any further (natural feel) */
        const atTop = !b || b.scrollTop <= 0;
        if (atTop) {
          dragging.current = true;
          dragMode.current = fullscreen ? "collapse" : "dismiss";
        }
      } else if (dy < -30 && expandable && !fullscreen && isScrollable()) {
        /* up: expand — only when the body is scrollable */
        const atEnd = b ? b.scrollTop + b.clientHeight >= b.scrollHeight - 4 : false;
        if (atEnd) {
          dragging.current = true;
          dragMode.current = "expand";
        }
      }
    }
    if (!dragging.current || !sheetRef.current) return;
    if (dragMode.current === "dismiss" || dragMode.current === "collapse") {
      const d = Math.max(0, dy);
      sheetRef.current.style.transform = `translateY(${Math.min(d, 170)}px)`;
    } else if (dragMode.current === "expand") {
      const d = Math.min(0, dy);
      sheetRef.current.style.transform = `translateY(${Math.max(d, -48)}px)`;
    }
  };

  const onTouchEnd = () => {
    const el = sheetRef.current;
    if (el) {
      el.style.transition = "";
      const t = el.style.transform;
      el.style.transform = "";
      const dy = t ? parseFloat(t.replace("translateY(", "")) || 0 : 0;
      if (dragMode.current === "expand") {
        if (dy < -24) setFs(true);
      } else if (dragMode.current === "collapse") {
        if (dy > 90) setFs(false);
      } else if (dragMode.current === "dismiss") {
        if (dy > 90) onClose();
      }
    }
    startY.current = null;
    dragging.current = false;
    dragMode.current = null;
  };

  return createPortal(
    <div
      className={`sk-sheet-overlay ${closing ? "is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        className={`sk-sheet ${fullscreen ? "is-fullscreen" : ""} ${closing ? "is-closing" : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <button
          type="button"
          className="sk-sheet-handle"
          aria-label={fullscreen ? "کوچک کردن پنجره" : "تمام‌صفحه کردن پنجره"}
          onClick={() => setFs(!fullscreen)}
        />
        <header className="sk-sheet-header">
          <h2 className="sk-sheet-title">{title}</h2>
          {expandable && (
            <button
              type="button"
              className="sk-sheet-btn"
              onClick={() => setFs(!fullscreen)}
              aria-label={fullscreen ? "کوچک کردن پنجره" : "نمایش تمام‌صفحه"}
            >
              {fullscreen ? <ChevronDownIcon size={17} /> : <ChevronUpIcon size={17} />}
            </button>
          )}
          <button type="button" className="sk-sheet-btn" onClick={onClose} aria-label="بستن">
            <CloseIcon size={17} />
          </button>
        </header>
        <div ref={bodyRef} className="sk-sheet-body sk-scroll" onScroll={onBodyScroll}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
