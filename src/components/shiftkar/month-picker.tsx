"use client";
/**
 * Month/year picker — faithful port of the original month-picker.js:
 * a bottom sheet with a year stepper (‹ year ›, ALL years 1300–1500 like
 * the original's guard) and a 4×3 month grid.
 */
import { useState } from "react";
import { Sheet } from "./sheet";
import { JALALI_MONTHS, toPersianDigits, todayJalaali } from "@/lib/jalali";
import { useShiftKar, haptic } from "@/lib/store";
import { ChevronRight, ChevronLeft } from "./icons";

const MIN_YEAR = 1300;
const MAX_YEAR = 1500;

export function MonthPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const viewYear = useShiftKar((s) => s.viewYear);
  const viewMonth = useShiftKar((s) => s.viewMonth);
  const hapticOn = useShiftKar((s) => s.hapticOn);
  const set = useShiftKar((s) => s.set);
  const today = todayJalaali();

  /* local working year — navigation is unbounded, like the original */
  const [year, setYear] = useState(viewYear);

  const shiftYear = (delta: 1 | -1) => {
    haptic(hapticOn);
    setYear((y) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, y + delta)));
  };

  const pick = (m: number) => {
    haptic(hapticOn);
    set({ viewYear: year, viewMonth: m });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="انتخاب ماه و سال">
      <div className="px-4 pb-6 pt-3">
        {/* ---- year stepper (original layout) ---- */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => shiftYear(-1)}
            className="sk-sheet-btn !size-10"
            aria-label="سال قبل"
            disabled={year <= MIN_YEAR}
          >
            <ChevronRight size={17} />
          </button>
          <span className="min-w-24 text-center text-[19px] font-black tabular-nums">
            {toPersianDigits(year)}
          </span>
          <button
            type="button"
            onClick={() => shiftYear(1)}
            className="sk-sheet-btn !size-10"
            aria-label="سال بعد"
            disabled={year >= MAX_YEAR}
          >
            <ChevronLeft size={17} />
          </button>
        </div>

        {/* ---- month grid ---- */}
        <div className="grid grid-cols-3 gap-2" role="grid" aria-label="ماه‌های سال">
          {JALALI_MONTHS.map((m, i) => {
            const active = i + 1 === viewMonth && year === viewYear;
            const isNow = today.jy === year && today.jm === i + 1;
            return (
              <button
                key={m}
                type="button"
                onClick={() => pick(i + 1)}
                className={`relative h-11 rounded-2xl text-[14px] font-bold transition-all sk-outline ${
                  active ? "is-active" : ""
                }`}
                role="gridcell"
              >
                {m}
                {isNow && !active && (
                  <span className="absolute top-1.5 end-1.5 size-1.5 rounded-full bg-[var(--sk-primary)]" />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-center text-[11px] text-[var(--sk-text-faint)] mt-3">
          پیمایش سال نامحدود است — همهٔ سال‌ها ۱۳۰۰ تا ۱۵۰۰ در دسترس‌اند
        </p>
      </div>
    </Sheet>
  );
}
