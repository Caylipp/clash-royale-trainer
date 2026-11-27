/**
 * Übung „Karten-Zyklus“: Der Gegner hat 8 Karten, 4 davon auf der Hand, eine als
 * nächste in der Vorschau. Spielt er eine Handkarte, rückt die Vorschaukarte nach
 * und die gespielte Karte hängt hinten an der Warteschlange an. Wer den Zyklus
 * kennt, weiß, welche Karten gerade verfügbar sind (reine Logik, per Seed deterministisch).
 */

import { Card, CARDS } from '../data/cards';
import { pick, Rng, shuffle } from './random';

export type CycleLevel = 1 | 2 | 3;
export type CycleQuestion = 'next' | 'hand';

export const CYCLE_LEVELS: Record<CycleLevel, { label: string; hint: string; plays: number; question: CycleQuestion; showOrder: boolean }> = {
  1: { label: 'Vorschau', hint: 'Reihenfolge bleibt sichtbar, 2 Züge, gesucht: nächste Karte', plays: 2, question: 'next', showOrder: true },
  2: { label: 'Auf der Hand', hint: 'Reihenfolge bleibt sichtbar, 3 Züge, gesucht: die 4 Handkarten', plays: 3, question: 'hand', showOrder: true },
  3: { label: 'Aus dem Kopf', hint: 'Reihenfolge nur zu Beginn, 5 Züge, gesucht: die 4 Handkarten', plays: 5, question: 'hand', showOrder: false },
};

export const HAND_SIZE = 4;
export const DECK_SIZE = 8;

export interface CycleState {
  /** Warteschlange: Index 0–3 = Hand, 4 = nächste Karte, 5–7 = dahinter. */
  queue: string[];
}

export interface CycleTask {
  level: CycleLevel;
  question: CycleQuestion;
  /** Zyklus zu Beginn (Hand zuerst). */
  start: string[];
  /** Gespielte Handkarten in Reihenfolge. */
  plays: string[];
  /** Zyklus nach allen Zügen. */
  end: string[];
}

const POOL: Card[] = CARDS.filter((c) => c.key !== 'mirror');

export function handOf(queue: readonly string[]): string[] {
  return queue.slice(0, HAND_SIZE);
}

export function nextOf(queue: readonly string[]): string {
  return queue[HAND_SIZE];
}

/** Spielt eine Handkarte: Vorschaukarte rückt auf die Hand, gespielte Karte ans Ende. */
export function playCard(queue: readonly string[], key: string): string[] {
  const i = queue.indexOf(key);
  if (i < 0 || i >= HAND_SIZE) throw new Error(`Karte ${key} ist nicht auf der Hand`);
  const rest = queue.filter((_, j) => j !== i);
  // Nach dem Entfernen rückt die Vorschaukarte automatisch auf Index 3 (Hand), die gespielte hängt hinten an.
  return [...rest, key];
}

export function createCycleTask(rng: Rng, level: CycleLevel): CycleTask {
  const cfg = CYCLE_LEVELS[level];
  const start: string[] = shuffle(rng, POOL).slice(0, DECK_SIZE).map((c) => c.key);
  let queue = start;
  const plays: string[] = [];
  for (let i = 0; i < cfg.plays; i++) {
    const key = pick(rng, handOf(queue));
    plays.push(key);
    queue = playCard(queue, key);
  }
  return { level, question: cfg.question, start, plays, end: queue };
}

export interface CycleGrade {
  correct: boolean;
  /** Richtige Treffer, Fehlgriffe und übersehene Karten. */
  hits: string[];
  wrong: string[];
  missed: string[];
}

/** Bewertet eine Auswahl (bei „next“ genau eine Karte, bei „hand“ vier). */
export function gradeCycle(task: CycleTask, selection: readonly string[]): CycleGrade {
  const expected = task.question === 'next' ? [nextOf(task.end)] : handOf(task.end);
  const hits = selection.filter((k) => expected.includes(k));
  const wrong = selection.filter((k) => !expected.includes(k));
  const missed = expected.filter((k) => !selection.includes(k));
  return { correct: wrong.length === 0 && missed.length === 0, hits, wrong, missed };
}

/** Schrittweise Zwischenstände für die Erklärung nach der Antwort. */
export function cycleSteps(task: CycleTask): { played: string; queue: string[] }[] {
  const steps: { played: string; queue: string[] }[] = [];
  let queue = task.start;
  for (const key of task.plays) {
    queue = playCard(queue, key);
    steps.push({ played: key, queue });
  }
  return steps;
}
