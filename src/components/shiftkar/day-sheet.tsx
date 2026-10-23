"use client";
/**
 * Day sheet — day details in the new scrollable/fullscreen Sheet:
 * 3-calendar header (Jalali+Hijri+Gregorian), holiday/occasions collapse
 * chip, all four groups' shifts (code + ordinal, «شما» marker) and the
 * personal note editor (persisted via the notes store — API with an
 * automatic localStorage fallback on static hosts).
 */
import { useEffect, useState } from "react";
import { Sheet } from "./sheet";
import {
  parseDateKey,
  formatJalali,
  formatGregorian,
  formatWeekday,
  toPersianDigits,
  toGregorian,
  jalaaliWeekday,
  todayJalaali,
} from "@/lib/jalali";
import { gregorianToJdn, jdnToIslamic } from "@/lib/islamic-calendar";
import { calculateShift } from "@/lib/shift-engine";
import { getDayEvents } from "@/lib/holidays";
import { CODE_FA, codeToKind, GROUPS, GROUP_FA } from "@/lib/models";
import { useShiftKar, haptic } from "@/lib/store";
import { listNotes, saveNote as persistNote } from "@/lib/notes-store";
import { SunIcon, MoonIcon, RestIcon, CheckIcon, TrashIcon, CalendarIcon, HolidayIcon, ChevronDownIcon } from "./icons";

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربیع‌الاول", "ربیع‌الثانی", "جمادی‌الاول", "جمادی‌الثانی",
  "رجب", "شعبان", "رمضان", "شوال", "ذی‌القعده", "ذی‌الحجه",
];

const KIND_STYLE: Record<string, { chip: string; icon: React.ReactNode }> = {
  DAY: { chip: "bg-[var(--sk-day-soft)] text-[var(--sk-day-ink)]", icon: <SunIcon size={16} /> },
  NIGHT: { chip: "bg-[var(--sk-night-soft)] text-[var(--sk-night-ink)]", icon: <MoonIcon size={16} /> },
  REST: { chip: "bg-[var(--sk-rest-soft)] text-[var(--sk-rest-ink)]", icon: <RestIcon size={16} /> },
};

export function DaySheet({
  dateKey,
  onClose,
  onNoteSaved,
}: {
  dateKey: string | null;
  onClose: () => void;
  onNoteSaved?: () => void;
}) {
  const myGroup = useShiftKar((s) => s.myGroup);
  const hapticOn = useShiftKar((s) => s.hapticOn);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<"idle" | "saving" | "ok">("idle");
  const [eventsOpen, setEventsOpen] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  /* new day opened → collapse the occasions chip (render-time adjust) */
  if (dateKey !== lastKey) {
    setLastKey(dateKey);
    setEventsOpen(false);
  }

  useEffect(() => {
    if (!dateKey) return;
    let cancelled = false;
    listNotes()
      .then((rows) => {
        if (cancelled) return;
        const found = rows.find((n) => n.dateKey === dateKey);
        setNote(found?.text ?? "");
        setSaved("idle");
      })
      .catch(() => {
        if (!cancelled) setNote("");
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const saveNote = async () => {
    if (!dateKey) return;
    haptic(hapticOn, 12);
    setSaved("saving");
    try {
      await persistNote(dateKey, note);
      setSaved("ok");
      onNoteSaved?.();
      setTimeout(() => setSaved("idle"), 1400);
    } catch {
      setSaved("idle");
    }
  };

  if (!dateKey) return null;

  const { jy, jm, jd } = parseDateKey(dateKey);
  const weekday = formatWeekday(jy, jm, jd);
  const g = toGregorian(jy, jm, jd);
  const hijri = jdnToIslamic(gregorianToJdn(g.gy, g.gm, g.gd));
  const today = todayJalaali();
  const isTodayDate = today.jy === jy && today.jm === jm && today.jd === jd;
  const events = getDayEvents(jy, jm, jd);
  const isFriday = jalaaliWeekday(jy, jm, jd) === 6;
  const holidays = events.filter((e) => e.isHoliday);
  const occasions = events.filter((e) => !e.isHoliday);
  const effGroup = myGroup === "ALL" ? "A" : myGroup;
  const mine = calculateShift(dateKey, effGroup);
  const mineKind = codeToKind(mine.code);

  return (
    <Sheet open={!!dateKey} onClose={onClose} title="جزئیات روز">
      <div className="px-4 pb-8 pt-3">
        {/* ---- header: 3 calendars + my shift ---- */}
        <div className="flex items-start justify-between gap-3 pb-4">
          <div className="min-w-0">
            <div className="text-[13px] text-[var(--sk-text-muted)] flex items-center gap-1.5">
              <CalendarIcon size={13} className="text-[var(--sk-primary)]" />
              {weekday}
              {isTodayDate && (
                <span className="text-[10px] font-bold text-[var(--sk-primary)] bg-[var(--sk-primary-soft)] px-2 py-0.5 rounded-full">
                  امروز
                </span>
              )}
            </div>
            <div className="text-[22px] font-black mt-0.5">{formatJalali(jy, jm, jd)}</div>
            <div className="text-[11.5px] text-[var(--sk-text-faint)] mt-1 leading-5">
              {toPersianDigits(hijri.hd)} {HIJRI_MONTHS[hijri.hm - 1]} {toPersianDigits(hijri.hy)} قمری
              {" · "}
              {formatGregorian(g.gy, g.gm, g.gd)} میلادی
            </div>
          </div>
          <div
            className={`size-13 shrink-0 rounded-2xl grid place-items-center ${KIND_STYLE[mineKind].chip}`}
            title={`شیفت شما: ${CODE_FA[mine.code]}`}
          >
            {KIND_STYLE[mineKind].icon}
          </div>
        </div>

        {/* ---- holiday / occasions — collapsible chip (original behavior,
             color-corrected: RED is reserved for official holidays; plain
             occasions wear the neutral glass surface) ---- */}
        {(holidays.length > 0 || occasions.length > 0) && (
          <div className="mb-4">
            <button
              onClick={() => setEventsOpen((v) => !v)}
              aria-expanded={eventsOpen}
              className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between gap-2 text-start transition-colors ${
                holidays.length > 0
                  ? "bg-[var(--sk-holiday-soft)] border-2 border-[var(--sk-holiday)]/25 hover:border-[var(--sk-holiday)]/45"
                  : "glass hover:bg-[var(--sk-primary-soft)]/40"
              }`}
            >
              <span className="min-w-0 flex items-center gap-2.5">
                <span
                  className={`size-9 rounded-xl grid place-items-center shrink-0 ${
                    holidays.length > 0
                      ? "bg-[var(--sk-holiday)] text-white"
                      : "bg-[var(--sk-primary-soft)] text-[var(--sk-primary)]"
                  }`}
                >
                  <HolidayIcon size={16} />
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-[13px] font-bold truncate ${
                      holidays.length > 0 ? "text-[var(--sk-holiday)]" : ""
                    }`}
                  >
                    {holidays.length > 0
                      ? holidays.map((e) => e.title).join("، ")
                      : occasions[0]?.title}
                  </span>
                  {occasions.length > 0 && (
                    <span className="block text-[11px] text-[var(--sk-text-muted)] mt-0.5">
                      {holidays.length > 0 && <span className="text-[var(--sk-holiday)]">تعطیل رسمی · </span>}
                      +{toPersianDigits(occasions.length)} مناسبت
                    </span>
                  )}
                </span>
              </span>
              <span className={`text-[var(--sk-text-faint)] transition-transform shrink-0 ${eventsOpen ? "rotate-180" : ""}`}>
                <ChevronDownIcon size={15} />
              </span>
            </button>
            {eventsOpen && (
              <div className="flex flex-col gap-1.5 mt-1.5">
                {holidays.length > 0 && (
                  <div className="rounded-2xl px-4 py-3 bg-[var(--sk-holiday-soft)] border border-[var(--sk-holiday)]/25 flex items-start gap-2.5">
                    <span className="size-8 rounded-[10px] grid place-items-center shrink-0 bg-[var(--sk-holiday)] text-white">
                      <HolidayIcon size={15} />
                    </span>
                    <span className="text-[12.5px] font-bold text-[var(--sk-holiday)] leading-6">
                      تعطیل رسمی — {holidays.map((e) => e.title).join("، ")}
                    </span>
                  </div>
                )}
                {occasions.length > 0 && (
                  <div className="rounded-2xl px-4 py-3 glass flex items-start gap-2.5">
                    <span className="size-8 rounded-[9px] grid place-items-center shrink-0 bg-[var(--sk-primary-soft)] text-[var(--sk-primary)]">
                      <HolidayIcon size={14} />
                    </span>
                    <ul className="text-[12px] leading-6 text-[var(--sk-text-muted)] flex flex-col gap-1">
                      {occasions.map((o, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="size-1 rounded-full bg-[var(--sk-text-faint)] mt-2.5 shrink-0" />
                          {o.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- all four groups (outlined cards, original grid) ---- */}
        <div className="text-[13px] font-bold text-[var(--sk-text-muted)] mb-2">شیفت گروه‌ها</div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {GROUPS.map((grp) => {
            const s = calculateShift(dateKey, grp);
            const k = codeToKind(s.code);
            const isMine = grp === myGroup;
            return (
              <div
                key={grp}
                className={`rounded-2xl p-3 flex items-center justify-between sk-outline ${
                  isMine ? "is-active" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`size-9 rounded-xl grid place-items-center shrink-0 ${KIND_STYLE[k].chip}`}>
                    {KIND_STYLE[k].icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold">
                      {GROUP_FA[grp]}
                      {isMine && <span className="text-[9.5px] font-black text-[var(--sk-primary)] bg-[var(--sk-primary-soft)] rounded-full px-1.5 py-0.5 ms-1 align-middle">شما</span>}
                    </div>
                    <div className="text-[11px] text-[var(--sk-text-muted)] truncate">
                      <span className="font-black text-[var(--sk-primary)]">{s.code}</span>
                      {" · "}
                      {CODE_FA[s.code]}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ---- note editor ---- */}
        <div className="text-[13px] font-bold text-[var(--sk-text-muted)] mb-2">یادداشت شخصی</div>
        <div className="rounded-2xl bg-[var(--sk-note)] border-2 border-[var(--sk-note-ink)]/20 p-3 focus-within:border-[var(--sk-note-ink)]/40 transition-colors">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="چیزی برای این روز بنویسید… (خالی = حذف)"
            rows={3}
            className="w-full bg-transparent resize-none outline-none text-[14px] leading-6 placeholder:text-[var(--sk-text-faint)]"
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-[var(--sk-text-faint)] tabular-nums">
              {toPersianDigits(note.length)}/{toPersianDigits(500)}
            </span>
            <div className="flex items-center gap-2">
              {note && (
                <button
                  onClick={() => { setNote(""); saveNote(); }}
                  className="size-9 rounded-xl grid place-items-center text-[var(--sk-holiday)] hover:bg-[var(--sk-holiday-soft)] transition-colors"
                  aria-label="حذف یادداشت"
                >
                  <TrashIcon size={16} />
                </button>
              )}
              <button
                onClick={saveNote}
                disabled={saved === "saving" || note.trim() === ""}
                className="h-9 px-4 rounded-xl bg-[var(--sk-primary)] text-white text-[13px] font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-[0.97]"
              >
                {saved === "ok" ? <CheckIcon size={14} /> : null}
                {saved === "saving" ? "…" : saved === "ok" ? "ذخیره شد" : "ذخیره"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
