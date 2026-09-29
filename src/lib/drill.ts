/**
 * Übungsmodus „Ein Zug“: Startwert, ein oder zwei gespielte Karten, dazwischen
 * ganze Sekunden. Kein Zeitdruck, dafür schrittweiser Rechenweg (reine Logik).
 */

import { Card, CARDS } from '../data/cards';
import { MAX_ELIXIR, Rate, REGEN_SECONDS } from './elixir';
import { between, pick, Rng } from './random';

export type DrillLevel = 1 | 2 | 3;

export const DRILL_LEVELS: Record<DrillLevel, { label: string; hint: string }> = {
  1: { label: 'Ein Zug', hint: '1× Elixier, eine Karte' },
  2: { label: 'Zwei Züge', hint: '1× Elixier, zwei Karten' },
  3: { label: 'Doppeltes Elixier', hint: '2× oder 3× Elixier, zwei Karten' },
};

export interface DrillStep {
  card: string;
  cost: number;
  waitBefore: number;
  elixirBefore: number;
  elixirAfter: number;
}

export interface Drill {
  start: number;
  rate: Rate;
  steps: DrillStep[];
  finalWait: number;
  /** Exakter Wert am Ende (gebrochen, gedeckelt bei 10). */
  actual: number;
}

const POOL: Card[] = CARDS.filter((c) => c.key !== 'mirror' && c.key !== 'elixir-collector' && c.elixir <= 9);

export function gain(seconds: number, rate: Rate): number {
  return (seconds * rate) / REGEN_SECONDS;
}

const wholeSeconds = (rng: Rng, min: number, max: number) => Math.round(between(rng, min, max));

export function createDrill(rng: Rng, level: DrillLevel): Drill {
  const rate: Rate = level === 3 ? pick(rng, [2, 2, 3] as const) : 1;
  const start = wholeSeconds(rng, 3, 9);
  const count = level === 1 ? 1 : 2;
  const steps: DrillStep[] = [];
  let elixir = start;

  for (let i = 0; i < count; i++) {
    let waitBefore = i === 0 ? 0 : wholeSeconds(rng, 1, 6);
    let before = Math.min(MAX_ELIXIR, elixir + gain(waitBefore, rate));
    while (before < 1) {
      waitBefore++;
      before = Math.min(MAX_ELIXIR, elixir + gain(waitBefore, rate));
    }
    const c = pick(rng, POOL.filter((x) => x.elixir <= Math.floor(before)));
    steps.push({ card: c.key, cost: c.elixir, waitBefore, elixirBefore: before, elixirAfter: before - c.elixir });
    elixir = before - c.elixir;
  }

  const finalWait = wholeSeconds(rng, 2, level === 3 ? 6 : 9);
  const actual = Math.min(MAX_ELIXIR, elixir + gain(finalWait, rate));
  return { start, rate, steps, finalWait, actual };
}
