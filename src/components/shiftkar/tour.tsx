"use client";
/**
 * Guided tour — 5-step spotlight tour (Mi-Browser-SAFE rewrite).
 *
 * The previous build used an <svg><mask> spotlight; Mi Browser / older
 * Chromium WebViews fail to composite SVG masks (the dim layer simply
 * disappears and the floating tooltip reads as a broken pop-up — the
 * exact user screenshot). This version uses the bulletproof classic:
 *   • a transparent box over the target + `box-shadow: 0 0 0 200vmax`
 *     as the dim layer (works on every engine since forever),
 *   • the tooltip ANCHORED right under/above the spotlight box
 *     (clamped to the viewport) instead of floating mid-screen,
 *   • a SOLID card surface (no backdrop-filter dependency),
 *   • measured AFTER the scroll settles + on resize.
 * Pure CSS motion (keyed remount) — no framer-motion.
 */
import { useCallback, useEffect, useState } from "react";
import { useShiftKar, haptic } from "@/lib/store";
import { toPersianDigits } from "@/lib/jalali";

interface TourStep {
  sel: string;
  title: string;
  text: string;
  placement: "top" | "bottom";
}

const STEPS: TourStep[] = [
  {
    sel: '[data-tour="today-banner"]',
    title: "شیفت امروز شما",
    text: "هر روز که وارد شوید، شیفت گروه شما اینجا خودکار محاسبه و نمایش داده می‌شود.",
    placement: "bottom",
  },
  {
    sel: '[data-tour="month-nav"]',
    title: "جابه‌جایی بین ماه‌ها",
    text: "با فلش‌ها ماه را عوض کنید، روی نام ماه بزنید تا مستقیم انتخاب کنید، یا روی صفحه بکشید. دکمهٔ یادداشت‌ها هم اینجاست.",
    placement: "bottom",
  },
  {
    sel: '[data-tour="group-filter"]',
    title: "فیلتر گروه",
    text: "شیفت گروه خودتان را ببینید یا با «همه» وضعیت هر چهار گروه را مقایسه کنید.",
    placement: "bottom",
  },
  {
    sel: '[data-tour="view-toggle"]',
    title: "دو نمای تقویم",
    text: "نمای «تقویم» مثل یک تقویم کلاسیک است؛ نمای «جدولی» شیفت هر چهار گروه را ردیف‌به‌ردیف نشان می‌دهد و حالت تمام‌صفحه هم دارد.",
    placement: "bottom",
  },
  {
    sel: '[data-tour="bottom-nav"]',
    title: "همه بخش‌ها اینجاست",
    text: "سامانه‌های شرکی، لوحه شیفت سالانه و تنظیمات شخصی‌سازی از این نوار در دسترس‌اند.",
    placement: "top",
  },
];

/* spotlight padding around the target */
const PAD = 10;
/* gap between the spotlight box and the tooltip */
const GAP = 12;

export function Tour() {
  const tourDone = useShiftKar((s) => s.tourDone);
  const onboardingDone = useShiftKar((s) => s.onboardingDone);
  const hydrated = useShiftKar((s) => s.hydrated);
  const tab = useShiftKar((s) => s.tab);
  const set = useShiftKar((s) => s.set);
  const [idx, setIdx] = useState<number | null>(null);
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const start = useCallback(() => setIdx(0), []);

  useEffect(() => {
    if (hydrated && onboardingDone && !tourDone && tab === "calendar") {
      const t = setTimeout(start, 700);
      return () => clearTimeout(t);
    }
  }, [hydrated, onboardingDone, tourDone, tab, start]);

  const current = idx != null ? STEPS[idx] : null;

  const finish = useCallback(() => {
    setIdx(null);
    set({ tourDone: true });
  }, [set]);

  /* measure AFTER the smooth scroll settles; re-measure on resize */
  useEffect(() => {
    if (!current) return;
    const el = document.querySelector(current.sel);
    if (!el) {
      /* element missing (e.g. conditional chip) — skip this step */
      const t = setTimeout(() => {
        if (idx != null && idx < STEPS.length - 1) setIdx(idx + 1);
        else finish();
      }, 0);
      return () => clearTimeout(t);
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };
    const t = setTimeout(measure, 420);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [current, idx, finish]);

  const next = () => {
    haptic(useShiftKar.getState().hapticOn, 10);
    if (idx == null) return;
    if (idx >= STEPS.length - 1) finish();
    else setIdx(idx + 1);
  };

  if (current == null || !box) {
    /* invisible shield while measuring so nothing is tappable mid-jump */
    return idx != null ? <div className="fixed inset-0 z-[95]" aria-hidden /> : null;
  }

  const activeIdx = idx ?? 0;

  /* tooltip geometry — anchored to the spotlight box, clamped to viewport */
  const below = current.placement === "bottom";
  const tooltipTop = below
    ? Math.min(box.top + box.height + GAP, window.innerHeight - 190)
    : Math.max(box.top - GAP - 178, 12);

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label="آموزش برنامه">
      {/* spotlight: transparent cutout + box-shadow dim (universally safe) */}
      <div
        key={`box-${idx}`}
        className="sk-spotlight absolute rounded-[22px] pointer-events-none"
        style={{
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
          boxShadow: "0 0 0 200vmax rgba(0,0,0,0.74)",
          transition: "top 0.4s cubic-bezier(0.22,0.8,0.36,1), left 0.4s cubic-bezier(0.22,0.8,0.36,1), width 0.4s cubic-bezier(0.22,0.8,0.36,1), height 0.4s cubic-bezier(0.22,0.8,0.36,1)",
        }}
      />

      {/* tooltip — anchored under/above the target, solid surface */}
      <div
        key={idx}
        className="sk-tab-in absolute inset-x-4"
        style={{ top: tooltipTop }}
      >
        <div
          className="rounded-3xl p-5 max-w-md mx-auto border border-[var(--sk-border)]"
          style={{
            background: "var(--sk-sheet-solid, var(--background))",
            boxShadow: "0 24px 60px -18px rgba(0,0,0,0.55)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--sk-primary)] bg-[var(--sk-primary-soft)] px-2.5 py-1 rounded-full">
              {toPersianDigits(activeIdx + 1)} / {toPersianDigits(STEPS.length)}
            </span>
            <button onClick={finish} className="text-[12px] text-[var(--sk-text-faint)]">
              پایان آموزش
            </button>
          </div>
          <div className="text-[16px] font-black">{current.title}</div>
          <p className="text-[13px] text-[var(--sk-text-muted)] leading-6 mt-1.5">{current.text}</p>
          <button
            onClick={next}
            className="mt-4 w-full h-11 rounded-2xl bg-[var(--sk-primary)] text-white text-[14px] font-bold active:scale-[0.98] transition-transform"
          >
            {activeIdx >= STEPS.length - 1 ? "فهمیدم، شروع کنیم" : "بعدی"}
          </button>
        </div>
      </div>
    </div>
  );
}
