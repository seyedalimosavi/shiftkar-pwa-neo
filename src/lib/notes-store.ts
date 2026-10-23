"use client";
/**
 * Notes persistence with graceful degradation.
 *
 * - Primary:  /api/notes (Prisma + SQLite) on the Node deployment
 *   (shiftkar.space-z.ai) — unchanged contract.
 * - Fallback: localStorage mirror — engages automatically whenever the API
 *   is unreachable (404 on static hosts like GitHub Pages, offline, 5xx),
 *   so personal notes keep working on every deployment.
 *
 * The same three entry points the UI already used: listNotes() and
 * saveNote() (empty text = delete, exactly like the API contract).
 */

export interface NoteRow {
  dateKey: string;
  text: string;
  updatedAt?: string;
}

const LS_KEY = "shiftkar-neo.notes.v1";
const API = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/notes`;

/* ---------------- localStorage mirror (fallback) ---------------- */

function lsRead(): NoteRow[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as NoteRow[]) : [];
  } catch {
    return [];
  }
}

function lsWrite(rows: NoteRow[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {
    /* private mode / quota — nothing sane to do */
  }
}

function lsUpsert(dateKey: string, text: string): NoteRow {
  const rest = lsRead().filter((n) => n.dateKey !== dateKey);
  const row: NoteRow = { dateKey, text, updatedAt: new Date().toISOString() };
  /* empty text deletes (same contract as POST /api/notes) */
  if (text.trim()) rest.unshift(row);
  lsWrite(rest);
  return row;
}

function monthBounds(jy: number, jm: number) {
  const mm = String(Number(jm)).padStart(2, "0");
  return { from: `${jy}-${mm}-01`, to: `${jy}-${mm}-31` };
}

/* ---------------- API with automatic fallback ---------------- */

async function apiJson(url: string, init?: RequestInit): Promise<unknown | null> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    if (!res.ok) return null; /* 404 on static hosts / 5xx → fallback */
    return await res.json();
  } catch {
    return null; /* network error / offline → fallback */
  }
}

/** All notes, newest first — or just one Jalali month when `month` is given. */
export async function listNotes(month?: { jy: number; jm: number }): Promise<NoteRow[]> {
  const q = month ? `?jy=${month.jy}&jm=${month.jm}` : "";
  const data = (await apiJson(`${API}${q}`)) as { notes?: NoteRow[] } | null;
  if (data?.notes) return data.notes;

  /* static-host / offline fallback → localStorage */
  const rows = lsRead();
  if (month) {
    const { from, to } = monthBounds(month.jy, month.jm);
    return rows
      .filter((n) => n.dateKey >= from && n.dateKey <= to)
      .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  }
  return [...rows].sort((a, b) => ((a.updatedAt ?? "") < (b.updatedAt ?? "") ? 1 : -1));
}

/** Upsert one note; empty text deletes. Returns the effective row. */
export async function saveNote(dateKey: string, text: string): Promise<NoteRow> {
  const data = (await apiJson(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dateKey, text }),
  })) as { ok?: boolean } | null;
  if (data?.ok) return { dateKey, text, updatedAt: new Date().toISOString() };

  /* API unreachable → persist locally so nothing is silently lost */
  return lsUpsert(dateKey, text);
}
