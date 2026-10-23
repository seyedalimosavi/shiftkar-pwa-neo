/**
 * Official Iranian holidays [ported to TS from ShiftKar] & events — the same system the Persian Calendar
 * Android app uses (persian-calendar/persian-calendar):
 *
 *  - Data: the project's official events dataset (persian-calendar/events),
 *    compiled from the University of Tehran Calendar Center's official
 *    calendars — holidays AND occasions, with Persian-year ranges.
 *  - Lunar (Hijri) dates: the exact official Iranian qamari calendar (a
 *    lookup table from roozbehp/qamari, Hijri years 1264–1449), NOT an
 *    approximation — so عاشورا، عید فطر و… land on the exact printed dates.
 *  - Irregular rules: end-of-month (شهادت امام رضا = آخرین روز صفر),
 *    nth/last weekday of month (قالی‌شویان اردهال، روز جهانی قدس…),
 *    single events.
 *
 * Resolution: for a Jalali year, every Persian/Hijri/Gregorian event is
 * mapped to its Jalali date(s) (a Jalali year spans two Hijri years, so
 * e.g. عید فطر can occur twice — ۱۴۰۵ has one at the start and one at the
 * end), then filtered by the event's Persian-year range. Results are
 * memoized per Jalali year.
 */
import { toJalaali, toGregorian, jalaaliMonthLength } from "./jalali";
import {
  islamicToJdn,
  jdnToIslamic,
  islamicMonthLength,
  gregorianToJdn,
  jdnToGregorian,
  weekDayOrdinal,
} from "./islamic-calendar";
import { RECURRING_EVENTS, IRREGULAR_EVENTS, type EventCalendar, type IrregularEvent } from "./events-data";

export const HOLIDAY_SOURCE_LABEL = "تعطیلات رسمی ایران";

/* ---------------- calendar helpers ---------------- */

function jalaliToJdn(jy: number, jm: number, jd: number) {
  const g = toGregorian(jy, jm, jd);
  return gregorianToJdn(g.gy, g.gm, g.gd);
}

function jdnToJalali(jdn: number) {
  const g = jdnToGregorian(jdn);
  return toJalaali(g.gy, g.gm, g.gd);
}

function gregorianMonthLength(gy: number, gm: number) {
  return new Date(Date.UTC(gy, gm, 0)).getUTCDate();
}

/* Weekday ordinal for a date, in the persian-calendar convention where the
 * data's weekday numbers are 1 = Sunday … 7 = Saturday. weekDayOrdinal()
 * gives 0 = Saturday … 6 = Friday, so a data weekday's ordinal is wd % 7. */
function dataWeekDayOrdinal(wd: number) {
  return wd % 7;
}

/* Port of Calendar.getNthWeekDayOfMonth — day of month of the nth `weekDay`
 * (1=Sunday…7=Saturday) of the month whose first day has JDN jdnOfDay1. */
function nthWeekDayOfMonth(jdnOfDay1: number, weekDay: number, nth: number) {
  const appWd = dataWeekDayOrdinal(weekDay);
  const monthStartWd = weekDayOrdinal(jdnOfDay1);
  return appWd + 1 - monthStartWd + nth * 7 - (monthStartWd <= appWd ? 7 : 0);
}

/* Port of Calendar.getLastWeekDayOfMonth — day of month of the LAST `weekDay`
 * of the month (jdnOfDay1 = first day's JDN, monthLength = days in month). */
function lastWeekDayOfMonth(jdnOfDay1: number, monthLength: number, weekDay: number) {
  const appWd = dataWeekDayOrdinal(weekDay);
  return monthLength - weekDayOrdinal(jdnOfDay1 + monthLength - 1 - appWd);
}

/* ---------------- irregular rule resolution ---------------- */

/**
 * Resolve one irregular event against a year of its own calendar, returning
 * the (JDN, monthLength) of the created date or null. `year` is the year in
 * the event's own calendar (Jalali for Persian, Hijri for Hijri, Gregorian
 * for Gregorian).
 */
function monthLengthOf(calendar: EventCalendar, year: number, month: number) {
  if (calendar === "Hijri") return islamicMonthLength(year, month);
  if (calendar === "Gregorian") return gregorianMonthLength(year, month);
  return jalaaliMonthLength(year, month);
}

function calendarJdn(calendar: EventCalendar, year: number, month: number, day: number) {
  if (calendar === "Hijri") return islamicToJdn(year, month, day);
  if (calendar === "Gregorian") return gregorianToJdn(year, month, day);
  return jalaliToJdn(year, month, day);
}

/** Resolve one irregular event against a year of its own calendar; returns
 *  the JDN of the created date, or null when the rule doesn't apply. */
function resolveRule(e: IrregularEvent, year: number) {
  const month = e.month ?? 1;
  const day = e.day ?? 1;
  const jdnOf = (m: number, d: number) => calendarJdn(e.calendar, year, m, d);
  const monthLen = (m: number) => monthLengthOf(e.calendar, year, m);
  switch (e.rule) {
    case "single event":
      if (e.year !== year) return null;
      return jdnOf(month, day);
    case "end of month":
      return jdnOf(month, monthLen(month));
    case "last weekday of month": {
      const len = monthLen(month);
      const day = lastWeekDayOfMonth(jdnOf(month, 1), len, e.weekday ?? 0) + (e.offset || 0);
      return jdnOf(month, day);
    }
    case "nth weekday of month": {
      const day = nthWeekDayOfMonth(jdnOf(month, 1), e.weekday ?? 0, e.nth ?? 1);
      return jdnOf(month, day);
    }
    case "nth day from":
      return jdnOf(month, day) + (e.nth ?? 1) - 1;
    default:
      return null;
  }
}

/* ---------------- per-year resolution ---------------- */

const yearCache = new Map();

function inRange(jy: number, e: { begin: number | null; end: number | null }) {
  if (e.begin != null && jy < e.begin) return false;
  if (e.end != null && jy > e.end) return false;
  return true;
}

/** Map of "jm-jd" -> [{ title, isHoliday }] for one Jalali year. */
function resolveYear(jy: number) {
  if (yearCache.has(jy)) return yearCache.get(jy);
  const map = new Map();

  const add = (jm: number, jd: number, title: string, isHoliday: boolean) => {
    if (!jm || !jd || jm < 1 || jm > 12 || jd < 1 || jd > 31) return;
    const key = `${jm}-${jd}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ title, isHoliday: !!isHoliday });
  };

  // Persian (solar) recurring events — fixed Jalali dates.
  for (const e of RECURRING_EVENTS) {
    if (e.calendar !== "Persian" || !inRange(jy, e)) continue;
    add(e.month, e.day, e.title, e.holiday);
  }

  // Hijri recurring events — every Hijri year overlapping this Jalali year.
  const jdnStart = jalaliToJdn(jy, 1, 1);
  const jdnEnd = jalaliToJdn(jy, 12, jalaaliMonthLength(jy, 12));
  const hyStart = jdnToIslamic(jdnStart).hy;
  const hyEnd = jdnToIslamic(jdnEnd).hy;
  for (let hy = hyStart; hy <= hyEnd; hy += 1) {
    for (const e of RECURRING_EVENTS) {
      if (e.calendar !== "Hijri") continue;
      const j = jdnToJalali(islamicToJdn(hy, e.month, e.day));
      if (j.jy !== jy || !inRange(jy, e)) continue;
      add(j.jm, j.jd, e.title, e.holiday);
    }
  }

  // Gregorian recurring events — recur every Gregorian year; map each
  // candidate Gregorian year that overlaps the Jalali year.
  const gy1 = toGregorian(jy, 1, 1).gy;
  const gy2 = toGregorian(jy, 12, jalaaliMonthLength(jy, 12)).gy;
  for (let gy = gy1; gy <= gy2; gy += 1) {
    for (const e of RECURRING_EVENTS) {
      if (e.calendar !== "Gregorian") continue;
      const j = toJalaali(gy, e.month, e.day);
      if (j.jy !== jy || !inRange(jy, e)) continue;
      add(j.jm, j.jd, e.title, e.holiday);
    }
  }

  // Irregular events — resolved per year of their own calendar.
  for (const e of IRREGULAR_EVENTS) {
    if (!inRange(jy, e)) continue;
    if (e.calendar === "Hijri") {
      for (let hy = hyStart; hy <= hyEnd; hy += 1) {
        const r = resolveRule(e, hy);
        if (r == null) continue;
        const j = jdnToJalali(r);
        if (j.jy === jy) add(j.jm, j.jd, e.title, e.holiday);
      }
    } else if (e.calendar === "Gregorian") {
      for (let gy = gy1; gy <= gy2; gy += 1) {
        const r = resolveRule(e, gy);
        if (r == null) continue;
        const j = jdnToJalali(r);
        if (j.jy === jy) add(j.jm, j.jd, e.title, e.holiday);
      }
    } else {
      const r = resolveRule(e, jy);
      if (r == null) continue;
      const j = jdnToJalali(r);
      if (j.jy === jy) add(j.jm, j.jd, e.title, e.holiday);
    }
  }

  // Stable display order per day: official holidays first, then by title.
  for (const list of Array.from(map.values())) {
    list.sort((a: { isHoliday: boolean; title: string }, b: { isHoliday: boolean; title: string }) => ((b.isHoliday ? 1 : 0) - (a.isHoliday ? 1 : 0)) || a.title.localeCompare(b.title, "fa"));
  }

  yearCache.set(jy, map);
  return map;
}

/* ---------------- public API ---------------- */

/** All events (holidays + occasions) on a Jalali date, holidays first. */
export function getDayEvents(jy: number, jm: number, jd: number) {
  return resolveYear(jy).get(`${jm}-${jd}`) || [];
}

/**
 * Returns { name, source: 'official' } when the Jalali date is an official
 * public holiday (all holiday titles merged), otherwise null.
 */
export function getHoliday(jy: number, jm: number, jd: number) {
  const holidays = getDayEvents(jy, jm, jd).filter((e: { isHoliday: boolean }) => e.isHoliday);
  if (!holidays.length) return null;
  return { name: holidays.map((e: { title: string }) => e.title).join("، "), source: HOLIDAY_SOURCE_LABEL };
}

export function isHoliday(jy: number, jm: number, jd: number) {
  return getDayEvents(jy, jm, jd).some((e: { isHoliday: boolean }) => e.isHoliday);
}
