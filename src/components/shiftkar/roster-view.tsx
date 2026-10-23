"use client";
/**
 * Roster view — the لوحه, ONE mode-free cell board.
 * The printed year board (roster-1405.png) rebuilt live from the shift
 * engine: the WHOLE YEAR always visible as a compact 2-column grid of 12
 * month blocks. Cells are tinted by the user's own shift group (the one
 * picked in the calendar / settings), official holidays are red, today is
 * ringed. No scope chips, no group chips — zero modes (user request).
 */
import { memo, useMemo, useState } from "react";
import {
  JALALI_MONTHS,
  jalaaliMonthLength,
  jalaaliWeekday,
  todayJalaali,
  makeDateKey,
  toPersianDigits,
} from "@/lib/jalali";
import { calculateShift, type ShiftGroup } from "@/lib/shift-engine";
import { getDayEvents } from "@/lib/holidays";
import { codeToKind } from "@/lib/models";
import { useShiftKar, haptic } from "@/lib/store";
import { RosterIcon, ChevronRight, ChevronLeft, CloseIcon } from "./icons";

const ROSTER_SRC = "/assets/roster-1405.png";
const WEEKDAY_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/* Shift-kind tints — the printed board's colored language tuned into
   Neo's soft palette. Red fill is reserved for OFFICIAL holidays. */
const KIND_BG: Record<string, string> = {
  DAY: "bg-[var(--sk-day-soft)]",
  NIGHT: "bg-[var(--sk-night-soft)]",
  REST: "bg-[var(--sk-rest-soft)]",
};
const KIND_INK: Record<string, string> = {
  DAY: "text-[var(--sk-day-ink)]",
  NIGHT: "text-[var(--sk-night-ink)]",
  REST: "text-[var(--sk-rest-ink)]",
};

interface CellDay {
  key: string;
  d: number;
  kind: string;
  holiday: boolean;
  holidayNames: string[];
  friday: boolean;
  isToday: boolean;
}

/* ================= one month's cell block ================= */
const MonthBlock = memo(function MonthBlock({
  jy,
  jm,
  today,
  group,
}: {
  jy: number;
  jm: number;
  today: { jy: number; jm: number; jd: number };
  group: ShiftGroup;
}) {
  const { cells, firstWeekday, len } = useMemo(() => {
    const l = jalaaliMonthLength(jy, jm);
    const out: CellDay[] = [];
    for (let d = 1; d <= l; d++) {
      const key = makeDateKey(jy, jm, d);
      const events = getDayEvents(jy, jm, d);
      const code = calculateShift(key, group).code;
      out.push({
        key,
        d,
        kind: codeToKind(code),
        holiday: events.some((e) => e.isHoliday),
        holidayNames: events.filter((e) => e.isHoliday).map((e) => e.title),
        friday: jalaaliWeekday(jy, jm, d) === 6,
        isToday: today.jy === jy && today.jm === jm && today.jd === d,
      });
    }
    return { cells: out, firstWeekday: jalaaliWeekday(jy, jm, 1), len: l };
  }, [jy, jm, group, today.jy, today.jm, today.jd]);

  return (
    <div className="card-soft rounded-2xl p-1.5">
      {/* month header */}
      <div className="flex items-baseline justify-between px-1 pt-0.5 pb-1">
        <span className="text-[11.5px] font-black text-[var(--sk-primary)]">{JALALI_MONTHS[jm - 1]}</span>
        <span className="text-[9.5px] text-[var(--sk-text-faint)] tabular-nums">{toPersianDigits(len)} روز</span>
      </div>

      {/* weekday header */}
      <div className="grid grid-cols-7 gap-[2px] mb-[3px]">
        {WEEKDAY_SHORT.map((w, i) => (
          <span
            key={w}
            className={`text-center text-[8px] font-bold text-[var(--sk-text-faint)] ${
              i === 6 ? "text-[var(--sk-holiday)]/70" : ""
            }`}
          >
            {w}
          </span>
        ))}
      </div>

      {/* day cells */}
      <div className="grid grid-cols-7 gap-[2px]">
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden />
        ))}
        {cells.map((c) => {
          let cls: string;
          if (c.holiday) {
            /* OFFICIAL holiday — the only red fill, like the printed board */
            cls = "bg-[var(--sk-holiday-soft)] text-[var(--sk-holiday)] font-black";
          } else if (c.friday) {
            /* Friday = red number on the shift tint (weekend, not a holiday) */
            cls = `${KIND_BG[c.kind]} text-[var(--sk-holiday)] font-black`;
          } else {
            cls = `${KIND_BG[c.kind]} ${KIND_INK[c.kind]} font-bold`;
          }
          return (
            <span
              key={c.key}
              title={c.holidayNames.length > 0 ? c.holidayNames.join("، ") : undefined}
              className={`grid aspect-square place-items-center rounded-[5px] text-[9.5px] leading-none select-none ${cls} ${
                c.isToday ? "ring-[1.5px] ring-inset ring-[var(--sk-primary)]" : ""
              }`}
            >
              <span className="tabular-nums">{toPersianDigits(c.d)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
});

/* ================= view ================= */
export function RosterView() {
  const viewYear = useShiftKar((s) => s.viewYear);
  const filterGroup = useShiftKar((s) => s.filterGroup);
  const myGroup = useShiftKar((s) => s.myGroup);
  const hapticOn = useShiftKar((s) => s.hapticOn);
  const set = useShiftKar((s) => s.set);
  const today = useMemo(() => todayJalaali(), []);
  const [viewer, setViewer] = useState(false);
  const [zoom, setZoom] = useState(1);

  /* the board always colors by ONE concrete group — the user's own
     group from the calendar/settings; fallback A so it never renders plain */
  const boardGroup: ShiftGroup = filterGroup !== "ALL" ? filterGroup : myGroup !== "ALL" ? myGroup : "A";

  const goYear = (delta: 1 | -1) => {
    haptic(hapticOn);
    const y = Math.min(1500, Math.max(1300, viewYear + delta));
    set({ viewYear: y });
  };

  return (
    <div className="h-full overflow-y-auto sk-scroll overscroll-contain px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      {/* ---------- header ---------- */}
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-black">لوحه</h1>
          <p className="mt-1 text-[12.5px] text-[var(--sk-text-muted)]">
            لوحه نوربکاری — کل سال در یک نما، دقیق برای هر سال
          </p>
        </div>
        {/* year stepper */}
        <div className="glass shrink-0 rounded-2xl p-1 flex items-center gap-0.5">
          <button
            onClick={() => goYear(-1)}
            className="grid size-9 place-items-center rounded-xl transition-colors hover:bg-[var(--sk-hover-bg)]"
            aria-label="سال قبل"
          >
            <ChevronRight size={16} />
          </button>
          <span className="min-w-12 px-1.5 text-center text-[14px] font-black tabular-nums">
            {toPersianDigits(viewYear)}
          </span>
          <button
            onClick={() => goYear(1)}
            className="grid size-9 place-items-center rounded-xl transition-colors hover:bg-[var(--sk-hover-bg)]"
            aria-label="سال بعد"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* ---------- which group the colors mean ---------- */}
      <div className="mb-2 flex items-center justify-center gap-1.5">
        <span className="text-[11px] text-[var(--sk-text-muted)]">رنگ‌ها بر اساس شیفت گروه</span>
        <span className="inline-grid h-5.5 min-w-7 place-items-center rounded-md bg-[var(--sk-primary-soft)] px-1.5 text-[11px] font-black text-[var(--sk-primary)]">
          {boardGroup}
        </span>
      </div>

      {/* ---------- slim legend ---------- */}
      <div className="mb-2.5 flex items-center justify-center gap-3.5 px-1" aria-label="راهنمای لوحه">
        <span className="flex items-center gap-1 text-[10.5px] text-[var(--sk-text-muted)]">
          <span className="size-2 rounded-full bg-[var(--sk-day)]" />روزکار
        </span>
        <span className="flex items-center gap-1 text-[10.5px] text-[var(--sk-text-muted)]">
          <span className="size-2 rounded-full bg-[var(--sk-night)]" />شبکار
        </span>
        <span className="flex items-center gap-1 text-[10.5px] text-[var(--sk-text-muted)]">
          <span className="size-2 rounded-full bg-[var(--sk-rest)]" />استراحت
        </span>
        <span className="flex items-center gap-1 text-[10.5px] text-[var(--sk-text-muted)]">
          <span className="size-2 rounded-full bg-[var(--sk-holiday)]" />تعطیل رسمی
        </span>
      </div>

      {/* ---------- the year cell board ---------- */}
      <div className="grid grid-cols-2 gap-2.5 sk-fade-in" aria-label={`لوحه کل سال ${toPersianDigits(viewYear)}`}>
        {JALALI_MONTHS.map((m, i) => (
          <MonthBlock key={m} jy={viewYear} jm={i + 1} today={today} group={boardGroup} />
        ))}
      </div>

      {/* ---------- original printed image ---------- */}
      <button
        onClick={() => setViewer(true)}
        className="glass mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[12.5px] font-bold text-[var(--sk-primary)] transition-colors hover:bg-[var(--sk-primary-soft)]/40"
      >
        <RosterIcon size={16} />
        نمایش تصویر اصلی لوحه
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--sk-text-faint)]">
        تهیه‌کننده لوحه: سید حسین موسوی سعیدی — واحد SBR
      </div>

      {viewer && (
        <div
          className="sk-fade-in fixed inset-0 z-[90] flex flex-col bg-black/92"
          role="dialog"
          aria-modal="true"
          aria-label="نمایش لوحه"
        >
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-[14px] font-bold">لوحه شیفت (تصویر اصلی)</span>
            <button
              onClick={() => { setViewer(false); setZoom(1); }}
              className="grid size-10 place-items-center rounded-xl bg-white/10"
              aria-label="بستن"
            >
              <CloseIcon size={18} />
            </button>
          </div>
          <div className="sk-scroll grid flex-1 place-items-center overflow-auto p-4">
            <img
              src={ROSTER_SRC}
              alt="لوحه شیفت"
              width={976}
              height={1292}
              className="max-w-none origin-center transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
              onClick={() => setZoom((z) => (z >= 2.5 ? 1 : z + 0.5))}
            />
          </div>
          <div className="flex items-center justify-center gap-2 p-4">
            {[1, 1.5, 2, 2.5].map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`h-9 rounded-xl px-4 text-[12px] font-bold transition-colors ${
                  zoom === z ? "bg-white text-black" : "bg-white/10 text-white"
                }`}
              >
                {z}×
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
