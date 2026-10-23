"use client";
/** All-notes sheet — searchable list of personal notes, in the new
 * scrollable/fullscreen Sheet. */
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "./sheet";
import { parseDateKey, formatJalali, formatWeekday, toPersianDigits } from "@/lib/jalali";
import { useShiftKar } from "@/lib/store";
import { listNotes, type NoteRow } from "@/lib/notes-store";
import { SearchIcon, NotesIcon } from "./icons";

export function NotesSheet({
  open,
  onClose,
  onOpenDay,
}: {
  open: boolean;
  onClose: () => void;
  onOpenDay: (dateKey: string) => void;
}) {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);
  const loading = open && !loaded;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listNotes()
      .then((rows) => {
        if (cancelled) return;
        setNotes(rows);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return notes;
    const needle = q.trim();
    return notes.filter((n) => n.text.includes(needle) || n.dateKey.includes(needle));
  }, [notes, q]);

  return (
    <Sheet open={open} onClose={onClose} title="یادداشت‌های من">
      <div className="px-4 pb-6 pt-3">
        <div className="glass rounded-2xl flex items-center gap-2 px-3.5 h-11 mb-3">
          <SearchIcon size={16} className="text-[var(--sk-text-faint)] shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در یادداشت‌ها…"
            className="w-full bg-transparent outline-none text-[14px] placeholder:text-[var(--sk-text-faint)]"
          />
        </div>
        <div className="space-y-2">
          {loading && (
            <div className="py-10 text-center text-[13px] text-[var(--sk-text-faint)]">
              در حال بارگذاری…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto size-14 rounded-2xl glass grid place-items-center text-[var(--sk-primary)] mb-3">
                <NotesIcon size={24} />
              </div>
              <div className="text-[14px] font-bold">هنوز یادداشتی نیست</div>
              <div className="text-[12px] text-[var(--sk-text-muted)] mt-1">
                از تقویم روی هر روز بزنید و یادداشت بسازید
              </div>
            </div>
          )}
          {filtered.map((n) => {
            const { jy, jm, jd } = parseDateKey(n.dateKey);
            return (
              <button
                key={n.dateKey}
                onClick={() => {
                  onClose();
                  onOpenDay(n.dateKey);
                }}
                className="w-full text-start rounded-2xl bg-[var(--sk-note)] border-2 border-[var(--sk-note-ink)]/20 px-4 py-3 transition-colors hover:border-[var(--sk-note-ink)]/40"
              >
                <div className="text-[12px] font-bold text-[var(--sk-note-ink)] mb-1">
                  {formatWeekday(jy, jm, jd)} · {formatJalali(jy, jm, jd)}
                </div>
                <div className="text-[13.5px] leading-6 line-clamp-2">{n.text}</div>
              </button>
            );
          })}
        </div>
        {!loading && notes.length > 0 && (
          <div className="text-[11px] text-center text-[var(--sk-text-faint)] pt-3">
            {toPersianDigits(filtered.length)} یادداشت
          </div>
        )}
      </div>
    </Sheet>
  );
}
