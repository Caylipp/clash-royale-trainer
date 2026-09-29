/** Schwierigkeitsstufen und Aufbau einer Trainingsrunde (reine Logik). */

import { card } from '../data/cards';
import { META_DECKS } from '../data/metaDecks';
import { checkpoints, ScheduleKind, SCHEDULES, simulateOpponent, Simulation } from './elixir';
import { createRng, pick } from './random';

export type Preset = 'easy' | 'normal' | 'pro' | 'custom';

export interface TrainerConfig {
  preset: Preset;
  schedule: ScheduleKind;
  /** Spieltempo relativ zur Echtzeit. */
  speed: number;
  /** Verlauf der gespielten Karten sichtbar lassen (sonst nur kurze Einblendung). */
  showFeed: boolean;
  mirror: boolean;
  collector: boolean;
  questions: number;
}

export const PRESETS: Record<Exclude<Preset, 'custom'>, Omit<TrainerConfig, 'preset'> & { label: string; hint: string }> = {
  easy: {
    label: 'Anfänger',
    hint: 'Normales Elixier, etwas langsamer, Verlauf sichtbar',
    schedule: 'single',
    speed: 0.8,
    showFeed: true,
    mirror: false,
    collector: false,
    questions: 8,
  },
  normal: {
    label: 'Fortgeschritten',
    hint: 'Echtes Match-Timing mit doppeltem Elixier',
    schedule: 'match',
    speed: 1,
    showFeed: true,
    mirror: false,
    collector: false,
    questions: 10,
  },
  pro: {
    label: 'Profi',
    hint: 'Schneller, ohne Verlauf, mit Spiegel und Elixiersammler',
    schedule: 'match',
    speed: 1.25,
    showFeed: false,
    mirror: true,
    collector: true,
    questions: 12,
  },
};

export const DEFAULT_TRAINER: TrainerConfig = { preset: 'normal', ...stripLabel(PRESETS.normal) };

function stripLabel<T extends { label: string; hint: string }>(p: T): Omit<T, 'label' | 'hint'> {
  const { label: _l, hint: _h, ...rest } = p;
  return rest;
}

export function applyPreset(preset: Exclude<Preset, 'custom'>): TrainerConfig {
  return { preset, ...stripLabel(PRESETS[preset]) };
}

export const SCHEDULE_LABEL: Record<ScheduleKind, string> = {
  single: '1× Elixier',
  double: '2× Elixier',
  triple: '3× Elixier',
  match: 'Match (1× → 2× → 3×)',
};

/** Wählt ein Gegnerdeck und baut Spiegel/Sammler ein, falls aktiviert. */
export function opponentDeck(config: TrainerConfig, seed: number): { name: string; cards: string[] } {
  const rng = createRng(seed);
  const deck = pick(rng, META_DECKS);
  const cards = deck.cards.filter((k) => (config.mirror || k !== 'mirror') && (config.collector || k !== 'elixir-collector'));
  const ensure = (key: string) => {
    if (cards.includes(key)) return;
    // Teuerste Nicht-Win-Condition ersetzen, damit der Deckcharakter erhalten bleibt.
    const idx = cards
      .map((k, i) => ({ i, c: card(k) }))
      .filter(({ c }) => !c.roles.includes('win'))
      .sort((a, b) => b.c.elixir - a.c.elixir)[0]?.i;
    if (idx !== undefined && cards.length >= 8) cards[idx] = key;
    else cards.push(key);
  };
  if (config.mirror) ensure('mirror');
  if (config.collector) ensure('elixir-collector');
  // Entfernte Sonderkarten auffüllen.
  const fillers = ['knight', 'archers', 'skeletons', 'zap', 'ice-spirit', 'bats'];
  for (const f of fillers) if (cards.length < 8 && !cards.includes(f)) cards.push(f);
  return { name: deck.name, cards };
}

export interface Round {
  seed: number;
  deckName: string;
  deck: string[];
  sim: Simulation;
  /** Eigene Karten und Elixier: im echten Spiel sichtbar, Grundlage fürs Schätzen. */
  own: { deckName: string; deck: string[]; sim: Simulation };
  checkpoints: number[];
}

/** Eigenes Deck: das echte aktuelle Deck aus dem Profil, sonst ein anderes Meta-Deck. */
export function ownDeck(seed: number, opponentName: string, profileDeck?: string[]): { name: string; cards: string[] } {
  if (profileDeck?.length === 8) return { name: 'Dein Deck', cards: profileDeck };
  const rng = createRng(seed ^ 0x51ed270b);
  const deck = pick(rng, META_DECKS.filter((d) => d.name !== opponentName));
  const cards = deck.cards.filter((k) => k !== 'mirror' && k !== 'elixir-collector');
  for (const filler of ['knight', 'zap', 'skeletons', 'archers']) if (cards.length < 8 && !cards.includes(filler)) cards.push(filler);
  return { name: deck.name, cards };
}

export function createRound(config: TrainerConfig, seed: number, profileDeck?: string[]): Round {
  const { name, cards } = opponentDeck(config, seed);
  const mine = ownDeck(seed, name, profileDeck);
  const duration = config.questions * 16 + 30;
  const schedule = SCHEDULES[config.schedule];
  const aggression = config.preset === 'pro' ? 0.7 : 0.5;
  // Erst du, dann kontert der Gegner auf deine Züge.
  const ownSim = simulateOpponent({ deck: mine.cards, schedule, duration, seed: seed ^ 0x7f4a7c15, aggression: 0.55 });
  const reactTo = ownSim.events.flatMap((e) => (e.kind === 'play' ? [e.t] : []));
  const sim = simulateOpponent({ deck: cards, schedule, duration, seed, aggression, reactTo });
  return {
    seed,
    deckName: name,
    deck: cards,
    sim,
    own: { deckName: mine.name, deck: mine.cards, sim: ownSim },
    checkpoints: checkpoints(sim, config.questions, seed),
  };
}
