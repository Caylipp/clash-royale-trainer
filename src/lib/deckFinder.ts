/**
 * Gleicht die Kartensammlung eines Spielers mit Meta-Decks ab: Wie viele Karten
 * fehlen, wie hoch sind die Level, und welche eigenen Karten können fehlende
 * ersetzen (reine Logik).
 */

import { card, Card, findCard, Rarity } from '../data/cards';
import type { MetaDeck } from '../data/metaDecks';

export interface OwnedCard {
  key: string;
  /** Level auf der einheitlichen Skala (wie im Spiel angezeigt). */
  level: number;
}

export type Collection = Map<string, OwnedCard>;

export const KING_MAX_LEVEL = 16;
const LEVEL_OFFSET: Record<Rarity, number> = { common: 0, rare: 2, epic: 5, legendary: 8, champion: 10 };

/**
 * Die API liefert Level relativ zur Seltenheit (Legendäre starten bei 1).
 * Mit `maxLevel` lässt sich das auf die im Spiel angezeigte Skala umrechnen.
 */
export function normalizeLevel(level: number, rarity: Rarity, maxLevel?: number): number {
  if (maxLevel) return level + (KING_MAX_LEVEL - maxLevel);
  return level + LEVEL_OFFSET[rarity];
}

export function collectionFromApi(
  cards: { id?: number; name: string; level: number; maxLevel?: number; rarity?: string }[],
): Collection {
  const out: Collection = new Map();
  for (const c of cards) {
    const known = findCard({ id: c.id, name: c.name });
    if (!known) continue;
    out.set(known.key, { key: known.key, level: normalizeLevel(c.level, known.rarity, c.maxLevel) });
  }
  return out;
}

export interface Substitution {
  missing: string;
  replacement?: string;
}

export interface DeckMatch {
  deck: MetaDeck;
  /** Deck nach Ersetzungen (Originalkarten, wo vorhanden). */
  cards: string[];
  ownedCount: number;
  substitutions: Substitution[];
  avgLevel: number;
  minLevel: number;
  score: number;
}

function similarity(a: Card, b: Card): number {
  const shared = a.roles.filter((r) => b.roles.includes(r)).length;
  const extra = a.roles.length + b.roles.length - 2 * shared;
  return shared * 3 - extra - Math.abs(a.elixir - b.elixir) * 1.5 + (a.type === b.type ? 2 : -3);
}

/** Beste eigene Karte als Ersatz: ähnliche Rolle, Kosten und Kartentyp; Level als Tiebreaker. */
export function bestSubstitute(missing: string, collection: Collection, exclude: Set<string>): string | undefined {
  const target = card(missing);
  let best: { key: string; score: number } | undefined;
  for (const owned of collection.values()) {
    if (exclude.has(owned.key)) continue;
    const c = card(owned.key);
    if (target.rarity !== 'champion' && c.rarity === 'champion') continue;
    const score = similarity(target, c) + owned.level * 0.2;
    if (!best || score > best.score) best = { key: owned.key, score };
  }
  return best?.key;
}

export function matchDeck(deck: MetaDeck, collection: Collection): DeckMatch {
  const hasCollection = collection.size > 0;
  const result = [...deck.cards];
  const substitutions: Substitution[] = [];
  const used = new Set(deck.cards);
  let ownedCount = 0;

  deck.cards.forEach((k, i) => {
    if (!hasCollection || collection.has(k)) {
      ownedCount++;
      return;
    }
    const replacement = bestSubstitute(k, collection, used);
    substitutions.push({ missing: k, replacement });
    if (replacement) {
      result[i] = replacement;
      used.add(replacement);
    }
  });

  const levels = hasCollection
    ? result.map((k) => collection.get(k)?.level ?? 0).filter((l) => l > 0)
    : [];
  const avgLevel = levels.length ? levels.reduce((s, l) => s + l, 0) / levels.length : 0;
  const minLevel = levels.length ? Math.min(...levels) : 0;
  const unresolved = substitutions.filter((s) => !s.replacement).length;
  const replaced = substitutions.length - unresolved;
  const score =
    deck.strength * 10 +
    (hasCollection ? avgLevel * 4 - (avgLevel - minLevel) * 1.5 : 0) -
    replaced * 9 -
    unresolved * 30;
  return { deck, cards: result, ownedCount, substitutions, avgLevel, minLevel, score };
}

export function findBestDecks(decks: MetaDeck[], collection: Collection, limit = 10): DeckMatch[] {
  return decks
    .map((d) => matchDeck(d, collection))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
