/**
 * Elixier-Modell und Gegnersimulation für den Trainer (reine Logik).
 *
 * Der Gegner startet mit 5 Elixier, maximal 10. Ein Elixier regeneriert in 2,8 s,
 * in Phasen mit doppeltem/dreifachem Elixier entsprechend schneller. Die
 * Simulation wird vorab komplett berechnet; `elixirAt` liefert dann für jeden
 * Zeitpunkt den exakten (gebrochenen) Stand.
 */

import { card } from '../data/cards';
import { between, createRng, pickWeighted, Rng, shuffle } from './random';

export const START_ELIXIR = 5;
export const MAX_ELIXIR = 10;
export const REGEN_SECONDS = 2.8;
/** Vereinfachte Werte für den Elixiersammler (nicht von Doppel-Elixier beschleunigt). */
export const COLLECTOR_INTERVAL = 9;
export const COLLECTOR_LIFETIME = 70;

export type Rate = 1 | 2 | 3;
export interface PhaseSegment {
  from: number;
  rate: Rate;
}
export type Schedule = PhaseSegment[];
export type ScheduleKind = 'single' | 'double' | 'triple' | 'match';

/** „Match“: 2 min normal, dann doppelt; ab 4:00 (Verlängerung) dreifach. */
export const SCHEDULES: Record<ScheduleKind, Schedule> = {
  single: [{ from: 0, rate: 1 }],
  double: [{ from: 0, rate: 2 }],
  triple: [{ from: 0, rate: 3 }],
  match: [
    { from: 0, rate: 1 },
    { from: 120, rate: 2 },
    { from: 240, rate: 3 },
  ],
};

export function rateAt(schedule: Schedule, t: number): Rate {
  let rate = schedule[0].rate;
  for (const seg of schedule) if (seg.from <= t) rate = seg.rate;
  return rate;
}

/** Regeneriertes Elixier zwischen t0 und t1 (ohne Deckelung). */
export function regenBetween(schedule: Schedule, t0: number, t1: number): number {
  if (t1 <= t0) return 0;
  let total = 0;
  for (let i = 0; i < schedule.length; i++) {
    const start = Math.max(t0, schedule[i].from);
    const end = Math.min(t1, i + 1 < schedule.length ? schedule[i + 1].from : Infinity);
    if (end > start) total += ((end - start) * schedule[i].rate) / REGEN_SECONDS;
  }
  return total;
}

/** Dauer ab t0, bis `amount` Elixier regeneriert ist. */
export function timeToGain(schedule: Schedule, t0: number, amount: number): number {
  if (amount <= 0) return 0;
  let remaining = amount;
  let t = t0;
  for (let i = 0; i < schedule.length; i++) {
    const segEnd = i + 1 < schedule.length ? schedule[i + 1].from : Infinity;
    if (segEnd <= t) continue;
    const perSecond = schedule[i].rate / REGEN_SECONDS;
    const available = (segEnd - t) * perSecond;
    if (available >= remaining) return t + remaining / perSecond - t0;
    remaining -= available;
    t = segEnd;
  }
  return Infinity;
}

export type SimEvent =
  | {
      kind: 'play';
      t: number;
      card: string;
      /** Bei Spiegel: die gespiegelte Karte. */
      mirrored?: string;
      cost: number;
      elixirBefore: number;
      elixirAfter: number;
    }
  | { kind: 'collector'; t: number; elixirAfter: number; wasted: boolean };

export interface SimOptions {
  deck: string[];
  schedule: Schedule;
  duration: number;
  seed: number;
  /** 0 = geduldig (spielt oft erst bei vollem Elixier), 1 = sehr aggressiv. */
  aggression?: number;
}

export interface Simulation {
  schedule: Schedule;
  events: SimEvent[];
  duration: number;
}

function costOf(key: string, lastPlayed: string | null): number | null {
  if (key === 'mirror') return lastPlayed ? card(lastPlayed).elixir + 1 : null;
  return card(key).elixir;
}

export function simulateOpponent(opts: SimOptions): Simulation {
  const rng = createRng(opts.seed);
  const aggression = opts.aggression ?? 0.5;
  const { schedule, duration } = opts;
  const order = shuffle(rng, opts.deck);
  const hand = order.slice(0, 4);
  const queue = order.slice(4);
  const events: SimEvent[] = [];
  let pendingTicks: number[] = [];
  let t = 0;
  let elixir = START_ELIXIR;
  let lastPlayed: string | null = null;

  const advance = (to: number) => {
    pendingTicks.sort((a, b) => a - b);
    while (pendingTicks.length && pendingTicks[0] <= to) {
      const tick = pendingTicks.shift()!;
      elixir = Math.min(MAX_ELIXIR, elixir + regenBetween(schedule, t, tick));
      const wasted = elixir >= MAX_ELIXIR;
      elixir = Math.min(MAX_ELIXIR, elixir + 1);
      t = tick;
      events.push({ kind: 'collector', t, elixirAfter: elixir, wasted });
    }
    elixir = Math.min(MAX_ELIXIR, elixir + regenBetween(schedule, t, to));
    t = to;
  };

  while (t < duration) {
    const playable = hand.filter((k) => {
      const c = costOf(k, lastPlayed);
      return c !== null && c <= MAX_ELIXIR;
    });
    // Ältere Handkarten werden bevorzugt, damit das Deck realistisch rotiert.
    const choice = pickWeighted(rng, playable.length ? playable : hand, (k) => 4 - hand.indexOf(k));
    const cost = costOf(choice, lastPlayed) ?? card(choice).elixir;

    // Wann spielt der Gegner? Mal sofort (Reaktion), mal wartet er auf mehr Elixier.
    let target: number;
    let delay: number;
    const roll = rng();
    if (roll < 0.08 * (1 - aggression) + 0.03) {
      target = MAX_ELIXIR; // voll laufen lassen, evtl. Elixier verschwenden
      delay = between(rng, 0, 3);
    } else if (roll < 0.35) {
      target = cost; // direkte Reaktion
      delay = between(rng, 0.2, 1.2);
    } else {
      target = Math.min(MAX_ELIXIR, cost + rng() * (MAX_ELIXIR - cost) * (1 - aggression) * 0.8);
      delay = between(rng, 0.3, 1.5);
    }
    const wait = Math.max(0, timeToGain(schedule, t, target - elixir));
    let tPlay = t + wait + delay;
    if (tPlay > duration) break;
    advance(tPlay);
    if (elixir < cost) {
      // Nur möglich, wenn Zeit-Rundung knapp war: bis zu den nötigen Kosten warten.
      tPlay = t + timeToGain(schedule, t, cost - elixir) + 0.05;
      if (tPlay > duration) break;
      advance(tPlay);
    }

    const before = elixir;
    elixir -= cost;
    const mirrored: string | undefined = choice === 'mirror' ? (lastPlayed ?? undefined) : undefined;
    events.push({ kind: 'play', t, card: choice, mirrored, cost, elixirBefore: before, elixirAfter: elixir });

    const effective: string = mirrored ?? choice;
    if (effective === 'elixir-collector') {
      for (let k = 1; k * COLLECTOR_INTERVAL <= COLLECTOR_LIFETIME; k++) {
        pendingTicks.push(t + k * COLLECTOR_INTERVAL);
      }
    }
    lastPlayed = effective;
    hand.splice(hand.indexOf(choice), 1);
    queue.push(choice);
    hand.push(queue.shift()!);
  }
  pendingTicks = pendingTicks.filter((x) => x <= duration);
  advance(duration);
  return { schedule, events, duration };
}

/** Exakter Elixierstand des Gegners zum Zeitpunkt t. */
export function elixirAt(sim: Simulation, t: number): number {
  let base = START_ELIXIR;
  let from = 0;
  for (const ev of sim.events) {
    if (ev.t > t) break;
    base = ev.elixirAfter;
    from = ev.t;
  }
  return Math.min(MAX_ELIXIR, base + regenBetween(sim.schedule, from, t));
}

export function playsUntil(sim: Simulation, t: number) {
  return sim.events.filter((e): e is Extract<SimEvent, { kind: 'play' }> => e.kind === 'play' && e.t <= t);
}

/** Zeitpunkte für Abfragen: zufällige Abstände, nicht vor dem ersten Ausspielen. */
export function checkpoints(
  sim: Simulation,
  count: number,
  seed: number,
  minGap = 6,
  maxGap = 14,
): number[] {
  const rng: Rng = createRng(seed ^ 0x9e3779b9);
  const firstPlay = sim.events.find((e) => e.kind === 'play')?.t ?? 3;
  const out: number[] = [];
  let t = firstPlay + between(rng, 1.5, 4);
  while (out.length < count && t < sim.duration) {
    out.push(t);
    t += between(rng, minGap, maxGap);
  }
  return out;
}

export interface Grade {
  /** Ganzzahliger Wert, den das Spiel anzeigen würde (abgerundet). */
  expected: number;
  error: number;
  accuracy: number;
  points: number;
}

/**
 * Bewertet eine Schätzung. Richtig ist der abgerundete Wert; steht der Gegner
 * kurz vor dem nächsten Elixier (≥ 0,8), zählt auch der nächsthöhere Wert.
 */
export function gradeAnswer(answer: number, actual: number, reactionMs: number): Grade {
  const expected = Math.floor(actual + 1e-9);
  let error = Math.abs(answer - expected);
  if (actual - expected >= 0.8) error = Math.min(error, Math.abs(answer - (expected + 1)));
  const accuracy = error === 0 ? 100 : error === 1 ? 50 : error === 2 ? 15 : 0;
  const speed =
    reactionMs <= 2000 ? 1 : reactionMs >= 8000 ? 0.5 : 1 - (0.5 * (reactionMs - 2000)) / 6000;
  return { expected, error, accuracy, points: Math.round(accuracy * speed) };
}

export interface Explanation {
  lastPlay?: { t: number; card: string; mirrored?: string; cost: number; elixirAfter: number };
  regen: number;
  collectorTicks: number;
  actual: number;
}

/** Rechenweg für die Auflösung: letzter Zug, Regeneration seitdem, Sammler-Ticks. */
export function explain(sim: Simulation, t: number): Explanation {
  const plays = playsUntil(sim, t);
  const last = plays[plays.length - 1];
  const from = last?.t ?? 0;
  const collectorTicks = sim.events.filter((e) => e.kind === 'collector' && e.t > from && e.t <= t).length;
  return {
    lastPlay: last && {
      t: last.t,
      card: last.card,
      mirrored: last.mirrored,
      cost: last.cost,
      elixirAfter: last.elixirAfter,
    },
    regen: regenBetween(sim.schedule, from, t),
    collectorTicks,
    actual: elixirAt(sim, t),
  };
}

export function formatClock(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
