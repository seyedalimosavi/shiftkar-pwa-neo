"use client";
/**
 * Calendar view — ShiftKar Neo's primary screen.
 * Faithful to the original's behavior:
 *  - swipe RIGHT → next month, LEFT → previous (passive touch, RTL convention)
 *  - horizontal wheel/trackpad month navigation (debounced)
 *  - ArrowLeft/ArrowRight keys
 *  - "ALL" grid cells carry all four groups' mini badges + a legend row
 *  - «برو به امروز» chip mounts off-month, collapses once per session
 *  - table view: روز/هفته/شیفت/مناسبت+یادداشت columns, code badges,
 *    fullscreen mode with its own nav + today FAB (swipe on header only)
 * Performance: zero per-cell framer-motion, React.memo cells,
 * transform/opacity-only transitions, no backdrop-filter in the grid.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  JALALI_MONTHS,
  WEEKDAYS,
  jalaaliMonthLength,
  jalaaliWeekday,
  todayJalaali,
  makeDateKey,
  toPersianDigits,
  formatJalali,
  formatWeekday,
} from "@/lib/jalali";
import { calculateShift, calculateAllShifts, type ShiftGroup, type ShiftCode } from "@/lib/shift-engine";
import { getDayEvents } from "@/lib/holidays";
import { CODE_FA, GROUPS, GROUP_FILTERS, codeToKind, type GroupFilter } from "@/lib/models";
import { useShiftKar, haptic } from "@/lib/store";
import { listNotes } from "@/lib/notes-store";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CalendarIcon,
  TableIcon,
  GridIcon,
  NotesIcon,
  SunIcon,
  MoonIcon,
  RestIcon,
  ExpandIcon,
  CollapseIcon,
  InfoIcon,
} from "./icons";

const WEEKDAY_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const KIND_CHIP: Record<string, string> = {
  DAY: "bg-[var(--sk-day-soft)] text-[var(--sk-day-ink)]",
  NIGHT: "bg-[var(--sk-night-soft)] text-[var(--sk-night-ink)]",
  REST: "bg-[var(--sk-rest-soft)] text-[var(--sk-rest-ink)]",
};

const KIND_ICON: Record<string, React.ReactNode> = {
  DAY: <SunIcon size={13} />,
  NIGHT: <MoonIcon size={13} />,
  REST: <RestIcon size={13} />,
};

/* Mini group badge — the Latin letter filled by that group's shift kind. */
function MiniBadge({ group, kind }: { group: ShiftGroup; kind: string }) {
  return (
    <span
      className={`mini-badge inline-grid place-items-center size-[13px] rounded-[4px] text-[8px] font-black leading-none ${KIND_CHIP[kind]}`}
      title={`گروه ${group}`}
    >
      {group}
    </span>
  );
}

interface NoteRow {
  dateKey: string;
  text: string;
}

/* ---------------- today chip session (module scope, like the original) ---------------- */
let todayChipSessionStarted = false;
let todayChipSessionCollapsed = false;
let offCurrentMonthCount = 0;

export function CalendarView({ onOpenDay, onOpenNotes, onOpenMonthPicker }: {
  onOpenDay: (dateKey: string) => void;
  onOpenNotes: () => void;
  onOpenMonthPicker: () => void;
}) {
  const viewYear = useShiftKar((s) => s.viewYear);
  const viewMonth = useShiftKar((s) => s.viewMonth);
  const viewType = useShiftKar((s) => s.viewType);
  const filterGroup = useShiftKar((s) => s.filterGroup);
  const myGroup = useShiftKar((s) => s.myGroup);
  const selectedDateKey = useShiftKar((s) => s.selectedDateKey);
  const showEvents = useShiftKar((s) => s.showEvents);
  const hapticOn = useShiftKar((s) => s.hapticOn);
  const set = useShiftKar((s) => s.set);

  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [dir, setDir] = useState<1 | -1>(1);
  const [chipCollapsed, setChipCollapsed] = useState(todayChipSessionCollapsed);
  const [tableFs, setTableFs] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => todayJalaali(), []);
  const todayKey = makeDateKey(today.jy, today.jm, today.jd);
  const isCurrentMonth = viewYear === today.jy && viewMonth === today.jm;

  /* ---- month notes (API + localStorage fallback on static hosts) ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listNotes({ jy: viewYear, jm: viewMonth });
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const n of rows) map.set(n.dateKey, n.text);
        setNotes(map);
      } catch {
        /* offline — keep previous */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewYear, viewMonth]);

  /* reset the chip session when back on the current month */
  useEffect(() => {
    if (isCurrentMonth) {
      todayChipSessionStarted = false;
      todayChipSessionCollapsed = false;
      offCurrentMonthCount = 0;
    }
  }, [isCurrentMonth]);

  const goMonth = useCallback(
    (delta: 1 | -1) => {
      haptic(hapticOn);
      setDir(delta);
      let y = viewYear;
      let m = viewMonth + delta;
      if (m > 12) { m = 1; y += 1; }
      if (m < 1) { m = 12; y -= 1; }
      set({ viewYear: y, viewMonth: m });
    },
    [viewYear, viewMonth, set, hapticOn],
  );

  const goToday = useCallback(() => {
    haptic(hapticOn);
    setDir(today.jy * 12 + today.jm > viewYear * 12 + viewMonth ? 1 : -1);
    set({ viewYear: today.jy, viewMonth: today.jm, selectedDateKey: todayKey });
  }, [today, viewYear, viewMonth, todayKey, set, hapticOn]);

  /* chip auto-collapse: once per away-session (original behavior) */
  useEffect(() => {
    if (isCurrentMonth) return;
    if (chipCollapsed) return;
    offCurrentMonthCount += 1;
    const hold = todayChipSessionStarted ? 900 : 2400;
    todayChipSessionStarted = true;
    const t = setTimeout(() => {
      setChipCollapsed(true);
      todayChipSessionCollapsed = true;
    }, offCurrentMonthCount <= 1 ? hold : 900);
    return () => clearTimeout(t);
  }, [isCurrentMonth, viewYear, viewMonth]);

  /* ---- open day + track selection ---- */
  const openDay = useCallback(
    (key: string) => {
      set({ selectedDateKey: key });
      onOpenDay(key);
    },
    [set, onOpenDay],
  );

  /* ---- month data (shared by grid + table) ---- */
  const monthLen = jalaaliMonthLength(viewYear, viewMonth);
  const firstWeekday = jalaaliWeekday(viewYear, viewMonth, 1);
  const dayInfo = useMemo(() => {
    const info: DayInfo[] = [];
    for (let d = 1; d <= monthLen; d++) {
      const key = makeDateKey(viewYear, viewMonth, d);
      const events = showEvents ? getDayEvents(viewYear, viewMonth, d) : [];
      info.push({
        d,
        key,
        holiday: events.some((e) => e.isHoliday),
        holidayNames: events.filter((e) => e.isHoliday).map((e) => e.title),
        occasions: events.filter((e) => !e.isHoliday).map((e) => e.title),
        isToday: key === todayKey,
        isFriday: jalaaliWeekday(viewYear, viewMonth, d) === 6,
        weekday: jalaaliWeekday(viewYear, viewMonth, d),
        label: `${formatWeekday(viewYear, viewMonth, d)} ${formatJalali(viewYear, viewMonth, d)}`,
        note: notes.get(key),
        all: calculateAllShifts(key).map((s) => ({ group: s.group, code: s.code })),
      });
    }
    return info;
  }, [viewYear, viewMonth, monthLen, todayKey, notes, showEvents]);

  /* ---- original swipe logic: passive touch, dx>0 → next month ---- */
  useEffect(() => {
    const area =
      viewType === "grid"
        ? bodyRef.current
        : bodyRef.current?.querySelector<HTMLElement>("[data-table-head]");
    if (!area) return;
    let startX: number | null = null;
    let startY: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (startX == null || startY == null) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        goMonth(dx > 0 ? 1 : -1);
        /* suppress the click that follows a completed swipe */
        const swallow = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          document.removeEventListener("click", swallow, true);
        };
        document.addEventListener("click", swallow, true);
        setTimeout(() => document.removeEventListener("click", swallow, true), 600);
      }
      startX = null;
      startY = null;
    };
    area.addEventListener("touchstart", onTouchStart, { passive: true });
    area.addEventListener("touchend", onTouchEnd, { passive: true });

    /* horizontal wheel / trackpad (debounced) */
    let wheelLockUntil = 0;
    const onWheel = (e: WheelEvent) => {
      const dx = e.deltaX;
      const dy = e.deltaY;
      if (Math.abs(dx) < 24 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const now = Date.now();
      if (now < wheelLockUntil) {
        e.preventDefault();
        return;
      }
      wheelLockUntil = now + 350;
      goMonth(dx > 0 ? 1 : -1);
      e.preventDefault();
    };
    area.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      area.removeEventListener("touchstart", onTouchStart);
      area.removeEventListener("touchend", onTouchEnd);
      area.removeEventListener("wheel", onWheel);
    };
  }, [viewType, goMonth, viewYear, viewMonth]);

  /* keyboard month navigation */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { goMonth(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { goMonth(-1); e.preventDefault(); }
  };

  const setFilter = (g: GroupFilter) => {
    haptic(hapticOn);
    if (g === "ALL") {
      /* «همه» is a VIEW filter only — the personal group in Settings stays
         untouched (user: «گزینهٔ انتخاب‌شده در تنظیمات همون شیفت پیش‌فرض بمونه») */
      set({ filterGroup: "ALL" });
    } else {
      /* a concrete group becomes BOTH the view filter and the personal group */
      set({ filterGroup: g, myGroup: g });
    }
  };

  const animClass = dir === 1 ? "sk-anim-next" : "sk-anim-prev";

  return (
    <div className="flex h-full flex-col gap-2.5 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+92px)]" onKeyDown={onKeyDown}>
      {/* ============ Today banner ============ */}
      <TodayBanner todayKey={todayKey} onOpenDay={openDay} />

      {/* ============ Month navigation row — ALL icon buttons share the
          SAME style (sk-sheet-btn, like the view-toggle the user pointed
          at); the title pill keeps its own original-port style ============ */}
      <div className="glass rounded-2xl p-1.5 flex items-center gap-1" data-tour="month-nav">
        <button
          onClick={() => goMonth(-1)}
          className="sk-sheet-btn !size-10 shrink-0"
          aria-label="ماه قبل"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={onOpenNotes}
          className="sk-sheet-btn !size-10 shrink-0"
          aria-label="همه یادداشت‌ها"
          data-tour="notes-btn"
        >
          <NotesIcon size={18} />
        </button>
        {/* compact centered pill — wrapper owns the slack so the pill
            hugs its content and stays centered in the row */}
        <div className="flex min-w-0 flex-1 justify-center">
          <button
            onClick={onOpenMonthPicker}
            className="sk-title-btn"
            aria-label="انتخاب ماه و سال"
          >
            <span className="truncate">{JALALI_MONTHS[viewMonth - 1]} {toPersianDigits(viewYear)}</span>
            <span className="sk-title-caret"><ChevronDown size={15} /></span>
          </button>
        </div>
        {/* single fixed toggle button (original view-single-toggle):
            shows the view it switches TO — takes almost no space */}
        <button
          onClick={() => { haptic(hapticOn); set({ viewType: viewType === "grid" ? "table" : "grid" }); }}
          className="sk-sheet-btn !size-10 shrink-0"
          data-tour="view-toggle"
          aria-label={viewType === "grid" ? "تغییر به نمای جدولی" : "تغییر به نمای تقویم"}
          title={viewType === "grid" ? "نمای جدولی" : "نمای تقویم"}
        >
          {viewType === "grid" ? <TableIcon size={16} /> : <GridIcon size={16} />}
        </button>
        <button
          onClick={() => goMonth(1)}
          className="sk-sheet-btn !size-10 shrink-0"
          aria-label="ماه بعد"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* ============ Filter chips + fullscreen + today chip ============ */}
      <div className="flex items-center gap-1.5 overflow-x-auto sk-scroll pb-0.5" data-tour="group-filter">
        {GROUP_FILTERS.map((g) => {
          const active = filterGroup === g;
          const label = g === "ALL" ? "همه" : g;
          return (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={`shrink-0 min-w-10 h-9 px-2.5 rounded-full text-[13px] font-bold transition-all ${
                active
                  ? /* same recipe as .sk-seg-item.is-active — one chip language app-wide */
                    "bg-[var(--sk-surface-strong)] text-[var(--sk-primary)] shadow-[inset_0_0_0_1.5px_var(--sk-primary)]"
                  : "glass text-[var(--sk-text-muted)] hover:text-[var(--sk-primary)]"
              }`}
              aria-pressed={active}
              aria-label={g === "ALL" ? "نمایش همه گروه‌ها" : `گروه ${g}`}
            >
              {label}
            </button>
          );
        })}
        <div className="flex-1 min-w-2" />
        {viewType === "table" && (
          <button
            onClick={() => setTableFs(true)}
            className="shrink-0 size-9 rounded-full glass grid place-items-center text-[var(--sk-primary)]"
            aria-label="جدول تمام‌صفحه"
          >
            <ExpandIcon size={16} />
          </button>
        )}
        {!isCurrentMonth && (
          <button
            onClick={goToday}
            className={`shrink-0 h-9 rounded-full glass text-[13px] font-semibold text-[var(--sk-primary)] flex items-center gap-1.5 transition-all duration-300 overflow-hidden ${
              chipCollapsed ? "w-9 px-0 justify-center" : "px-3.5"
            }`}
            data-tour="today-chip"
            title="برو به امروز"
            aria-label="رفتن به امروز"
          >
            <CalendarIcon size={15} className="shrink-0" />
            {!chipCollapsed && <span className="whitespace-nowrap">امروز</span>}
          </button>
        )}
      </div>

      {/* ============ Legend (grid + ALL, like the original) ============ */}
      {viewType === "grid" && filterGroup === "ALL" && (
        <div className="flex items-center gap-4 px-1 -mt-1" aria-label="راهنمای شیفت‌ها">
          <span className="legend-item flex items-center gap-1.5 text-[11.5px] text-[var(--sk-text-muted)]">
            <span className="size-2 rounded-full bg-[var(--sk-day)]" />روزکار
          </span>
          <span className="legend-item flex items-center gap-1.5 text-[11.5px] text-[var(--sk-text-muted)]">
            <span className="size-2 rounded-full bg-[var(--sk-night)]" />شبکار
          </span>
          <span className="legend-item flex items-center gap-1.5 text-[11.5px] text-[var(--sk-text-muted)]">
            <span className="size-2 rounded-full bg-[var(--sk-rest)]" />استراحت
          </span>
        </div>
      )}

      {/* ============ Swipeable body — flex-contained so the page itself
          NEVER scrolls; short viewports scroll this area internally ============ */}
      <div
        ref={bodyRef}
        className={`touch-pan-y ${animClass} flex-1 min-h-0 overflow-y-auto sk-scroll overscroll-contain`}
        key={`${viewYear}-${viewMonth}-${viewType}`}
      >
        {viewType === "grid" ? (
          <GridView
            dayInfo={dayInfo}
            firstWeekday={firstWeekday}
            filterGroup={filterGroup}
            todayKey={todayKey}
            selectedDateKey={selectedDateKey}
            onOpenDay={openDay}
          />
        ) : (
          <TableView
            dayInfo={dayInfo}
            filterGroup={filterGroup}
            onOpenDay={openDay}
          />
        )}
      </div>

      {/* ============ Fullscreen table (portaled: the tab wrapper keeps a
          transform from its entrance animation → stacking context → the
          fixed overlay would paint UNDER the z-40 bottom nav) ============ */}
      {tableFs && (
        <TableFullscreen
          viewYear={viewYear}
          viewMonth={viewMonth}
          dayInfo={dayInfo}
          filterGroup={filterGroup}
          todayKey={todayKey}
          isCurrentMonth={isCurrentMonth}
          onGoMonth={goMonth}
          onGoToday={goToday}
          onOpenDay={openDay}
          onOpenPicker={onOpenMonthPicker}
          onClose={() => setTableFs(false)}
        />
      )}
    </div>
  );
}

/* ================= Today banner (compact, original style) ================= */
function TodayBanner({ todayKey, onOpenDay }: { todayKey: string; onOpenDay: (k: string) => void }) {
  const today = todayJalaali();
  const filterGroup = useShiftKar((s) => s.filterGroup);
  const weekday = formatWeekday(today.jy, today.jm, today.jd);
  const dateLine = `${weekday} ${toPersianDigits(today.jd)} ${JALALI_MONTHS[today.jm - 1]}`;

  return (
    <button
      onClick={() => onOpenDay(todayKey)}
      className="glass rounded-2xl px-4 py-3 flex items-center justify-between gap-3 w-full text-start hover:bg-[var(--sk-primary-soft)]/40 transition-colors"
      data-tour="today-banner"
      aria-label={`شیفت امروز — ${dateLine}، باز کردن جزئیات`}
    >
      <span className="min-w-0">
        <span className="block text-[11.5px] text-[var(--sk-text-muted)]">{dateLine}</span>
        {filterGroup === "ALL" ? (
          <span className="block text-[15px] font-extrabold mt-0.5">شیفت امروز گروه‌ها</span>
        ) : (
          <span className="block text-[16px] font-extrabold mt-0.5">
            شیفت امروز: <span className="text-gradient">{CODE_FA[calculateShift(todayKey, filterGroup).code]}</span>
          </span>
        )}
      </span>
      <span className="shrink-0 flex items-center gap-1.5">
        {filterGroup === "ALL" ? (
          GROUPS.map((g) => (
            <MiniBadge key={g} group={g} kind={codeToKind(calculateShift(todayKey, g).code)} />
          ))
        ) : (
          <span className={`size-11 rounded-xl grid place-items-center ${KIND_CHIP[codeToKind(calculateShift(todayKey, filterGroup).code)]}`}>
            {KIND_ICON[codeToKind(calculateShift(todayKey, filterGroup).code)]}
          </span>
        )}
      </span>
    </button>
  );
}

/* ================= Grid cell (memoized, no framer-motion) =================
   Compact classic tiles: the track height comes from --sk-cell-h
   (viewport-adaptive, 48–64px), cells fill it exactly. Nothing stretches,
   nothing shrinks to nothing — a 6-row month that doesn't fit simply
   scrolls the swipeable body, so NO day is ever cut off. */
interface DayInfo {
  d: number; key: string; holiday: boolean; holidayNames: string[]; occasions: string[];
  isToday: boolean; isFriday: boolean; weekday: number; label: string;
  note: string | undefined;
  all: { group: ShiftGroup; code: ShiftCode }[];
}

const DayCell = memo(function DayCell({
  info, filterGroup, onOpenDay, isSelected,
}: {
  info: DayInfo;
  filterGroup: GroupFilter;
  onOpenDay: (k: string) => void;
  isSelected: boolean;
}) {
  const holiday = info.holiday || info.isFriday;
  const kind = codeToKind(info.all.find((s) => s.group === (filterGroup === "ALL" ? "A" : filterGroup))!.code);
  const delay = Math.min((info.d + 3) * 6, 200);

  return (
    <button
      onClick={() => onOpenDay(info.key)}
      className={`sk-cell-in relative rounded-xl h-full w-full overflow-hidden flex flex-col items-center justify-center gap-1 select-none
        transition-[transform,border-color] active:scale-[0.97]
        ${holiday ? "bg-[var(--sk-holiday-soft)] border border-[var(--sk-holiday)]/20" : "sk-tile"}
        ${/* INSET ring: an outset ring used to poke outside the tile and get
             clipped by the grid edges (the reported «بریدگی/بیرون‌زدگی» on
             the today tile). Inside the tile it can never clip or overlap. */
          ""}
        ${info.isToday ? "ring-2 ring-inset ring-[var(--sk-primary)]" : ""}
        ${isSelected && !info.isToday ? "ring-2 ring-inset ring-[var(--sk-primary)]/40" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`${info.label}${holiday ? "، تعطیل" : ""}`}
    >
      <span className="flex items-center gap-0.5 leading-none">
        <span className={`text-[14px] font-bold ${holiday ? "text-[var(--sk-holiday)]" : ""}`}>
          {toPersianDigits(info.d)}
        </span>
        {info.note && <span className="size-1 rounded-full bg-[var(--sk-note-ink)]" aria-label="یادداشت دارد" />}
      </span>
      <span className="flex flex-wrap items-center justify-center gap-[2px] max-w-full px-0.5">
        {filterGroup === "ALL" ? (
          info.all.map((s) => <MiniBadge key={s.group} group={s.group} kind={codeToKind(s.code)} />)
        ) : (
          <span className={`inline-grid place-items-center size-[19px] rounded-md ${KIND_CHIP[kind]}`}>
            {KIND_ICON[kind]}
          </span>
        )}
      </span>
    </button>
  );
});

/* ================= Grid view =================
   The previous, loved shape: compact fixed-height tiles top-aligned like
   the original app. Rows are minmax(--sk-cell-h, auto) — a comfortable
   48–64px band that never inflates on tall phones and never collapses on
   short ones. If the month is taller than the viewport the swipeable body
   scrolls internally; if it's shorter the leftover simply breathes below
   (the original does the same). No stretching, no gaps-spread, no cuts. */
function GridView(props: {
  dayInfo: DayInfo[];
  firstWeekday: number;
  filterGroup: GroupFilter;
  todayKey: string;
  selectedDateKey: string | null;
  onOpenDay: (k: string) => void;
}) {
  const { dayInfo, firstWeekday, filterGroup, selectedDateKey, onOpenDay } = props;
  const cells: (DayInfo | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...dayInfo,
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = cells.length / 7;

  return (
    <div className="flex flex-col pb-1">
      <div className="grid grid-cols-7 mb-1 shrink-0" aria-hidden>
        {WEEKDAY_SHORT.map((w, i) => (
          <div
            key={w}
            className={`text-center text-[12px] font-bold py-1 ${i === 6 ? "text-[var(--sk-holiday)]" : "text-[var(--sk-text-faint)]"}`}
          >
            {w}
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-7 gap-1"
        style={{
          gridTemplateRows: `repeat(${rows}, minmax(var(--sk-cell-h), auto))`,
        }}
      >
        {cells.map((info, i) =>
          info === null ? (
            <div key={`e${i}`} aria-hidden />
          ) : (
            <DayCell
              key={info.key}
              info={info}
              filterGroup={filterGroup}
              onOpenDay={onOpenDay}
              isSelected={selectedDateKey === info.key}
            />
          ),
        )}
      </div>
    </div>
  );
}

/* ================= Table view (original columns) ================= */
function TableView(props: {
  dayInfo: DayInfo[];
  filterGroup: GroupFilter;
  onOpenDay: (k: string) => void;
}) {
  const { dayInfo, filterGroup, onOpenDay } = props;
  const all = filterGroup === "ALL";

  return (
    <div className="card-soft rounded-2xl overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--sk-border-soft)]" data-table-head>
        {all ? (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--sk-text-muted)]">
              <span className="size-2 rounded-full bg-[var(--sk-day)]" />روزکار
            </span>
            <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--sk-text-muted)]">
              <span className="size-2 rounded-full bg-[var(--sk-night)]" />شبکار
            </span>
            <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--sk-text-muted)]">
              <span className="size-2 rounded-full bg-[var(--sk-rest)]" />استراحت
            </span>
          </div>
        ) : (
          <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--sk-text-faint)]">
            <InfoIcon size={13} />برای جزئیات، روی هر روز ضربه بزنید
          </span>
        )}
      </div>
      <div className="overflow-x-auto sk-scroll">
        <table className="w-full text-[13px] min-w-[420px]">
          <thead>
            <tr className="text-[11px] font-bold text-[var(--sk-text-faint)] border-b border-[var(--sk-border-soft)] sk-thead">
              <th className="py-2 font-bold w-12 text-center">روز</th>
              <th className="py-2 font-bold w-16 text-center">هفته</th>
              <th className="py-2 font-bold text-center">{all ? "شیفت گروه‌ها" : "شیفت"}</th>
              <th className="py-2 font-bold text-start ps-3">مناسبت و یادداشت</th>
            </tr>
          </thead>
          <tbody>
            {dayInfo.map((info) => {
              const holiday = info.holiday || info.isFriday;
              const kind = codeToKind(info.all.find((s) => s.group === (all ? "A" : filterGroup))!.code);
              return (
                <tr
                  key={info.key}
                  onClick={() => onOpenDay(info.key)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDay(info.key); }
                  }}
                  className={`cursor-pointer border-b border-[var(--sk-border-soft)] last:border-0 transition-colors hover:bg-[var(--sk-primary-soft)]/50
                    ${holiday ? "bg-[var(--sk-holiday-soft)]/60" : ""}
                    ${info.isToday ? "ring-1 ring-inset ring-[var(--sk-primary)]" : ""}`}
                  aria-label={`${info.label}${holiday ? "، تعطیل" : ""}`}
                >
                  <td className={`py-2.5 text-center font-bold ${holiday ? "text-[var(--sk-holiday)]" : ""} ${info.isToday ? "text-[var(--sk-primary)]" : ""}`}>
                    {toPersianDigits(String(info.d).padStart(2, "۰"))}
                  </td>
                  <td className={`py-2.5 text-center text-[12px] ${holiday ? "text-[var(--sk-holiday)]" : "text-[var(--sk-text-muted)]"}`}>
                    {WEEKDAYS[info.weekday]}
                  </td>
                  <td className="py-2.5 text-center">
                    <span className="inline-flex items-center gap-[3px]">
                      {all ? (
                        info.all.map((s) => <MiniBadge key={s.group} group={s.group} kind={codeToKind(s.code)} />)
                      ) : (
                        <span className={`inline-grid place-items-center min-w-9 h-6 px-1.5 rounded-lg text-[10.5px] font-black ${KIND_CHIP[kind]}`}>
                          {info.all.find((s) => s.group === filterGroup)!.code}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 ps-3 pe-2 text-start text-[11.5px] max-w-0">
                    {info.holidayNames.length > 0 && (
                      <span className="block truncate font-bold text-[var(--sk-holiday)]">{info.holidayNames.join("، ")}</span>
                    )}
                    {info.note && <span className="block truncate text-[var(--sk-text-muted)]">{info.note}</span>}
                    {info.holidayNames.length === 0 && !info.note && <span className="text-[var(--sk-text-faint)]">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= Fullscreen table (original behavior) =================
   Portaled to <body> — the tab wrapper carries a transform (entrance
   animation fill) which makes a stacking context; without the portal the
   fixed overlay paints UNDER the z-40 bottom nav (the reported bug).
   Layout = the original's flex-grow pattern: .tf-body is a plain flex
   container and the inner card/scroller is the one and only scroller, so
   the glass card always fills the screen edge-to-edge with zero dead space. */
function TableFullscreen(props: {
  viewYear: number;
  viewMonth: number;
  dayInfo: DayInfo[];
  filterGroup: GroupFilter;
  todayKey: string;
  isCurrentMonth: boolean;
  onGoMonth: (d: 1 | -1) => void;
  onGoToday: () => void;
  onOpenDay: (k: string) => void;
  onOpenPicker: () => void;
  onClose: () => void;
}) {
  const { viewYear, viewMonth, dayInfo, filterGroup, isCurrentMonth, onGoMonth, onGoToday, onOpenDay, onOpenPicker, onClose } = props;
  const all = filterGroup === "ALL";
  const headerRef = useRef<HTMLDivElement>(null);
  const todayRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* swipe on the header only — the body keeps its native scroll */
  useEffect(() => {
    const area = headerRef.current;
    if (!area) return;
    let startX: number | null = null;
    let startY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (startX == null || startY == null) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) onGoMonth(dx > 0 ? 1 : -1);
      startX = null;
      startY = null;
    };
    area.addEventListener("touchstart", onTouchStart, { passive: true });
    area.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      area.removeEventListener("touchstart", onTouchStart);
      area.removeEventListener("touchend", onTouchEnd);
    };
  }, [onGoMonth]);

  /* scroll today's row into view on open */
  useEffect(() => {
    if (isCurrentMonth && todayRowRef.current) {
      todayRowRef.current.scrollIntoView({ block: "center" });
    }
  }, [isCurrentMonth]);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] bg-[var(--sk-bg)] flex flex-col sk-fs-in touch-pan-y"
      role="dialog"
      aria-modal="true"
      aria-label="جدول شیفت‌کاری تمام‌صفحه"
    >
      <div className="aurora-bg" aria-hidden />
      <div ref={headerRef} className="relative z-10 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-2 shrink-0 touch-pan-y">
        <div className="glass rounded-2xl p-1.5 flex items-center gap-1">
          <button onClick={() => onGoMonth(-1)} className="size-10 rounded-xl grid place-items-center hover:bg-[var(--sk-hover-bg)]" aria-label="ماه قبل">
            <ChevronRight size={18} />
          </button>
          <div className="flex min-w-0 flex-1 justify-center">
            <button
              onClick={onOpenPicker}
              className="sk-title-btn"
              aria-label="انتخاب ماه و سال"
            >
              <span className="truncate">{JALALI_MONTHS[viewMonth - 1]} {toPersianDigits(viewYear)}</span>
              <span className="sk-title-caret"><ChevronDown size={15} /></span>
            </button>
          </div>
          <button onClick={() => onGoMonth(1)} className="size-10 rounded-xl grid place-items-center hover:bg-[var(--sk-hover-bg)]" aria-label="ماه بعد">
            <ChevronLeft size={18} />
          </button>
          <button onClick={onClose} className="size-10 rounded-xl grid place-items-center text-[var(--sk-primary)] hover:bg-[var(--sk-hover-bg)]" aria-label="بازگشت به نمای تقویم">
            <CollapseIcon size={17} />
          </button>
        </div>
        {all && (
          <div className="flex items-center justify-center gap-4 px-2 pt-2.5">
            <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--sk-text-muted)]">
              <span className="size-2 rounded-full bg-[var(--sk-day)]" />روزکار
            </span>
            <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--sk-text-muted)]">
              <span className="size-2 rounded-full bg-[var(--sk-night)]" />شبکار
            </span>
            <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--sk-text-muted)]">
              <span className="size-2 rounded-full bg-[var(--sk-rest)]" />استراحت
            </span>
          </div>
        )}
      </div>
      {/* flex-grow pattern (original .tf-body): the card fills the remaining
          height, the card's own scroll area is the only scroller */}
      <div className="relative z-10 flex-1 min-h-0 overflow-hidden px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="card-soft h-full flex flex-col rounded-2xl overflow-hidden">
          <div className="overflow-auto sk-scroll overscroll-auto flex-1 min-h-0">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 sk-thead">
                <tr className="text-[11px] font-bold text-[var(--sk-text-faint)] border-b border-[var(--sk-border-soft)]">
                  <th className="py-2.5 w-12 text-center">روز</th>
                  <th className="py-2.5 w-16 text-center">هفته</th>
                  <th className="py-2.5 text-center">{all ? "شیفت گروه‌ها" : "شیفت"}</th>
                  <th className="py-2.5 text-start ps-3">مناسبت و یادداشت</th>
                </tr>
              </thead>
              <tbody>
                {dayInfo.map((info) => {
                  const holiday = info.holiday || info.isFriday;
                  const kind = codeToKind(info.all.find((s) => s.group === (all ? "A" : filterGroup))!.code);
                  return (
                    <tr
                      key={info.key}
                      ref={info.isToday ? todayRowRef : undefined}
                      onClick={() => onOpenDay(info.key)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDay(info.key); }
                      }}
                      className={`cursor-pointer border-b border-[var(--sk-border-soft)] last:border-0 transition-colors hover:bg-[var(--sk-primary-soft)]/50
                        ${holiday ? "bg-[var(--sk-holiday-soft)]/60" : ""}
                        ${info.isToday ? "bg-[var(--sk-primary-soft)] shadow-[inset_3px_0_0_var(--sk-primary)]" : ""}`}
                      aria-label={`${info.label}${holiday ? "، تعطیل" : ""}`}
                    >
                      <td className={`py-2.5 text-center font-bold ${holiday ? "text-[var(--sk-holiday)]" : ""} ${info.isToday ? "text-[var(--sk-primary)]" : ""}`}>
                        {toPersianDigits(String(info.d).padStart(2, "۰"))}
                      </td>
                      <td className={`py-2.5 text-center text-[12px] ${holiday ? "text-[var(--sk-holiday)]" : "text-[var(--sk-text-muted)]"}`}>
                        {WEEKDAYS[info.weekday]}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="inline-flex items-center gap-[3px]">
                          {all ? (
                            info.all.map((s) => <MiniBadge key={s.group} group={s.group} kind={codeToKind(s.code)} />)
                          ) : (
                            <span className={`inline-grid place-items-center min-w-9 h-6 px-1.5 rounded-lg text-[10.5px] font-black ${KIND_CHIP[kind]}`}>
                              {info.all.find((s) => s.group === filterGroup)!.code}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 ps-3 pe-2 text-start text-[11.5px] max-w-0">
                        {info.holidayNames.length > 0 && (
                          <span className="block truncate font-bold text-[var(--sk-holiday)]">{info.holidayNames.join("، ")}</span>
                        )}
                        {info.note && (
                          <span className="block truncate text-[var(--sk-text-muted)]">{info.note}</span>
                        )}
                        {info.holidayNames.length === 0 && !info.note && <span className="text-[var(--sk-text-faint)]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {!isCurrentMonth && (
        <button
          onClick={onGoToday}
          className="absolute top-1/2 -translate-y-1/2 end-4 z-20 size-11 rounded-full bg-[var(--sk-primary)] text-white grid place-items-center shadow-[0_14px_34px_-10px_var(--sk-glow-a),inset_0_1px_0_rgba(255,255,255,0.35)]"
          title="برو به امروز"
          aria-label="رفتن به امروز"
        >
          <CalendarIcon size={19} />
        </button>
      )}
    </div>,
    document.body,
  );
}
