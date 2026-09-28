/**
 * Zufallsdecks, die spielbar bleiben: mindestens eine Win-Condition, ein Zauber,
 * Luftabwehr und ein Elixierschnitt im gewünschten Bereich (reine Logik).
 */

import { Card, card, CARDS, hasRole } from '../data/cards';
import { pick, Rng, shuffle } from './random';

export interface DeckRules {
  minAvg: number;
  maxAvg: number;
  allowChampion: boolean;
  /** Nur diese Karten verwenden (z. B. eigene Sammlung). Leer/undefiniert = alle. */
  pool?: string[];
  /** Karten, die fest im Deck bleiben. */
  locked?: string[];
}

export const DEFAULT_RULES: DeckRules = { minAvg: 2.8, maxAvg: 4.2, allowChampion: true };

const MAX_WIN_CONDITIONS = 2;

export interface RuleCheck {
  label: string;
  ok: boolean;
}

export function averageElixir(deck: string[]): number {
  if (!deck.length) return 0;
  return deck.reduce((s, k) => s + card(k).elixir, 0) / deck.length;
}

/** Kosten der vier günstigsten Karten: so viel kostet ein kompletter Durchlauf. */
export function cycleCost(deck: string[]): number {
  return deck
    .map((k) => card(k).elixir)
    .sort((a, b) => a - b)
    .slice(0, 4)
    .reduce((s, e) => s + e, 0);
}

function counts(deck: string[]) {
  const cs = deck.map(card);
  return {
    win: cs.filter(isWin).length,
    spells: cs.filter((c) => c.type === 'spell' && c.key !== 'mirror').length,
    airUnits: cs.filter((c) => hasRole(c, 'air') && c.type !== 'spell').length,
    champions: cs.filter((c) => c.rarity === 'champion').length,
  };
}

export function checkDeck(deck: string[], rules: DeckRules = DEFAULT_RULES): RuleCheck[] {
  const c = counts(deck);
  const avg = averageElixir(deck);
  return [
    { label: '8 verschiedene Karten', ok: deck.length === 8 && new Set(deck).size === 8 },
    { label: 'Mind. 1 Win-Condition', ok: c.win >= 1 },
    { label: 'Mind. 1 Zauber', ok: c.spells >= 1 },
    { label: 'Mind. 2 Einheiten gegen Luft', ok: c.airUnits >= 2 },
    { label: 'Höchstens 1 Champion', ok: c.champions <= (rules.allowChampion ? 1 : 0) },
    {
      label: `Ø-Elixier ${rules.minAvg.toFixed(1)}–${rules.maxAvg.toFixed(1)}`,
      ok: avg >= rules.minAvg - 1e-9 && avg <= rules.maxAvg + 1e-9,
    },
  ];
}

export function isPlayable(deck: string[], rules: DeckRules = DEFAULT_RULES): boolean {
  return checkDeck(deck, rules).every((r) => r.ok);
}

/** Rakete zählt nicht (Zauber-Win-Condition nur in Spezialdecks), Fass und Friedhof schon. */
function isWin(c: Card): boolean {
  return (hasRole(c, 'win') && c.type !== 'spell') || c.key === 'goblin-barrel' || c.key === 'graveyard';
}

/**
 * Baut ein Deck konstruktiv (Pflichtrollen zuerst, Rest zufällig) und würfelt
 * neu, bis alle Regeln passen. Gibt null zurück, wenn der Pool das nicht hergibt.
 */
export function generateDeck(rng: Rng, rules: DeckRules = DEFAULT_RULES, attempts = 400): string[] | null {
  const poolSet = rules.pool?.length ? new Set(rules.pool) : null;
  const pool = CARDS.filter(
    (c) => (!poolSet || poolSet.has(c.key)) && c.key !== 'mirror' && (rules.allowChampion || c.rarity !== 'champion'),
  );
  const locked = (rules.locked ?? []).filter((k) => CARDS.some((c) => c.key === k)).slice(0, 8);

  for (let i = 0; i < attempts; i++) {
    const deck = [...locked];
    const has = (k: string) => deck.includes(k);
    const avail = (f: (c: Card) => boolean) => pool.filter((c) => !has(c.key) && f(c));
    const championLeft = () =>
      rules.allowChampion && !deck.some((k) => card(k).rarity === 'champion');
    const add = (f: (c: Card) => boolean): Card | undefined => {
      const options = avail((c) => f(c) && (c.rarity !== 'champion' || championLeft()));
      if (!options.length || deck.length >= 8) return undefined;
      const chosen = pick(rng, options);
      deck.push(chosen.key);
      return chosen;
    };

    const c = counts(deck);
    if (c.win === 0) add(isWin);
    if (c.spells === 0) {
      const small = rng() < 0.5;
      const first = add((x) => x.type === 'spell' && hasRole(x, small ? 'smallSpell' : 'bigSpell'));
      if (first && rng() < 0.6) add((x) => x.type === 'spell' && hasRole(x, small ? 'bigSpell' : 'smallSpell'));
    }
    while (counts(deck).airUnits < 2 && deck.length < 8) {
      const before = deck.length;
      add((x) => hasRole(x, 'air') && x.type !== 'spell');
      if (deck.length === before) break;
    }
    for (const x of shuffle(rng, pool)) {
      if (deck.length >= 8) break;
      if (has(x.key)) continue;
      if (x.rarity === 'champion' && !championLeft()) continue;
      if (isWin(x) && counts(deck).win >= MAX_WIN_CONDITIONS) continue;
      if (x.type === 'spell' && counts(deck).spells >= 3) continue;
      deck.push(x.key);
    }
    if (isPlayable(deck, rules)) return deck;
  }
  return null;
}

/** Link, der das Deck direkt im Spiel öffnet (nur wenn alle Karten-IDs bekannt sind). */
export function deckLink(deck: string[]): string | null {
  const ids = deck.map((k) => card(k).id);
  if (ids.some((id) => id === undefined)) return null;
  return `https://link.clashroyale.com/deck/de?deck=${ids.join(';')}`;
}
