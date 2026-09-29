/** Serie und Tagesziel aus dem Trainingsverlauf (reine Logik, lokale Kalendertage). */

export const DEFAULT_DAILY_GOAL = 3;

export interface ProgressInfo {
  streak: number;
  bestStreak: number;
  todayRounds: number;
  goal: number;
  goalReached: boolean;
  /** Serie läuft noch, heute aber noch keine Runde gespielt. */
  atRisk: boolean;
}

function dayNumber(ms: number): number {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

export function progressInfo(history: { at: number }[], now: number, goal: number = DEFAULT_DAILY_GOAL): ProgressInfo {
  const perDay = new Map<number, number>();
  for (const h of history) {
    const d = dayNumber(h.at);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  const today = dayNumber(now);
  const todayRounds = perDay.get(today) ?? 0;

  let streak = 0;
  for (let d = todayRounds > 0 ? today : today - 1; perDay.has(d); d--) streak++;

  let best = 0;
  let run = 0;
  let prev = -Infinity;
  for (const d of [...perDay.keys()].sort((a, b) => a - b)) {
    run = d === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }

  return {
    streak,
    bestStreak: Math.max(best, streak),
    todayRounds,
    goal,
    goalReached: todayRounds >= goal,
    atRisk: todayRounds === 0 && streak > 0,
  };
}
