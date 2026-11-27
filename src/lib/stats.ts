/** Trainingsstatistik mit Verlauf aus den gespeicherten Runden (reine Logik, lokale Kalendertage). */

export interface StatSession {
  at: number;
  preset: string;
  score: number;
  maxScore: number;
  exact: number;
  questions: number;
  avgError: number;
  avgReactionMs: number;
}

export interface DayStat {
  /** Tageszahl wie in progress.ts, 0 = 1970-01-01. */
  day: number;
  rounds: number;
  /** Mittlere Punktequote 0–1. */
  ratio: number;
}

export type Trend = 'up' | 'down' | 'flat' | 'unknown';

export interface Summary {
  rounds: number;
  questions: number;
  /** Anteil exakt gezählter Fragen 0–1. */
  exactRate: number;
  avgRatio: number;
  bestRatio: number;
  avgError: number;
  avgReactionMs: number;
  /** Mittlere Quote der letzten 5 gegenüber den 5 davor, in Prozentpunkten. */
  trendDelta: number;
  trend: Trend;
}

const ratioOf = (s: StatSession) => (s.maxScore > 0 ? s.score / s.maxScore : 0);

export function dayNumber(ms: number): number {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/** Letzte `days` Tage bis einschließlich heute, älteste zuerst; Tage ohne Runde haben rounds = 0. */
export function dailyStats(history: readonly StatSession[], now: number, days = 14): DayStat[] {
  const today = dayNumber(now);
  const acc = new Map<number, { n: number; sum: number }>();
  for (const h of history) {
    const d = dayNumber(h.at);
    if (d > today || d <= today - days) continue;
    const a = acc.get(d) ?? { n: 0, sum: 0 };
    a.n++;
    a.sum += ratioOf(h);
    acc.set(d, a);
  }
  return Array.from({ length: days }, (_, i) => {
    const day = today - days + 1 + i;
    const a = acc.get(day);
    return { day, rounds: a?.n ?? 0, ratio: a ? a.sum / a.n : 0 };
  });
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** `history` ist wie im Store neueste zuerst. Trend nur, wenn mindestens 6 Runden vorliegen. */
export function summarize(history: readonly StatSession[]): Summary {
  const rounds = history.length;
  const questions = history.reduce((s, h) => s + h.questions, 0);
  const exact = history.reduce((s, h) => s + h.exact, 0);
  const ratios = history.map(ratioOf);

  const recent = ratios.slice(0, 5);
  const before = ratios.slice(5, 10);
  let trendDelta = 0;
  let trend: Trend = 'unknown';
  if (rounds >= 6) {
    trendDelta = (mean(recent) - mean(before)) * 100;
    // Kleine Schwankungen (unter 3 Prozentpunkten) gelten als gleichbleibend.
    trend = trendDelta > 3 ? 'up' : trendDelta < -3 ? 'down' : 'flat';
  }

  return {
    rounds,
    questions,
    exactRate: questions ? exact / questions : 0,
    avgRatio: mean(ratios),
    bestRatio: ratios.reduce((m, r) => Math.max(m, r), 0),
    avgError: mean(history.map((h) => h.avgError)),
    avgReactionMs: mean(history.map((h) => h.avgReactionMs)),
    trendDelta,
    trend,
  };
}

/** Mittlere Quote je Voreinstellung, nur für Voreinstellungen mit mindestens einer Runde. */
export function byPreset(history: readonly StatSession[]): { preset: string; rounds: number; ratio: number }[] {
  const acc = new Map<string, number[]>();
  for (const h of history) acc.set(h.preset, [...(acc.get(h.preset) ?? []), ratioOf(h)]);
  return [...acc.entries()].map(([preset, rs]) => ({ preset, rounds: rs.length, ratio: mean(rs) })).sort((a, b) => b.rounds - a.rounds);
}

/** Freundliche Rückmeldung zum Trend (nachsichtig, nie tadelnd). */
export function trendMessage(s: Summary): string {
  if (s.trend === 'unknown') return s.rounds === 0 ? 'Noch keine Runde gespielt.' : 'Ab 6 Runden zeigt sich dein Verlauf.';
  if (s.trend === 'up') return `Aufwärts: ${Math.round(s.trendDelta)} Prozentpunkte besser als zuvor.`;
  if (s.trend === 'down') return 'Etwas weniger als zuvor. Das ist normal, bleib einfach dran.';
  return 'Stabil. Wenn es sich sicher anfühlt, probiere die nächste Stufe.';
}
