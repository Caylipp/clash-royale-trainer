import { card, CARDS, findCard } from '../../data/cards';
import { META_DECKS } from '../../data/metaDecks';
import { normalizeTag, isValidTag, parsePlayer, remoteToMetaDecks } from '../api';
import { collectionFromApi, findBestDecks, matchDeck, normalizeLevel } from '../deckFinder';
import { averageElixir, checkDeck, cycleCost, deckLink, DEFAULT_RULES, generateDeck, isPlayable } from '../deckGen';
import { createRng } from '../random';
import { createRound, opponentDeck, applyPreset } from '../trainerConfig';

describe('card data', () => {
  it('has unique keys and ids', () => {
    expect(new Set(CARDS.map((c) => c.key)).size).toBe(CARDS.length);
    const ids = CARDS.flatMap((c) => (c.id ? [c.id] : []));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('finds cards by id, name or key', () => {
    expect(findCard({ id: 26000021 })?.key).toBe('hog-rider');
    expect(findCard({ name: 'P.E.K.K.A' })?.key).toBe('pekka');
    expect(findCard({ name: 'the log' })?.key).toBe('the-log');
  });

  it('meta decks use known cards', () => {
    for (const d of META_DECKS) {
      expect(d.cards).toHaveLength(8);
      d.cards.forEach((k) => expect(() => card(k)).not.toThrow());
    }
  });
});

describe('random deck', () => {
  it('generates playable decks for many seeds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const deck = generateDeck(createRng(seed));
      expect(deck).not.toBeNull();
      expect(isPlayable(deck!)).toBe(true);
    }
  });

  it('keeps locked cards and respects the pool and champion rule', () => {
    const pool = META_DECKS.flatMap((d) => d.cards);
    for (let seed = 1; seed <= 50; seed++) {
      const deck = generateDeck(createRng(seed), { ...DEFAULT_RULES, allowChampion: false, pool, locked: ['golem', 'zap'] })!;
      expect(deck).toEqual(expect.arrayContaining(['golem', 'zap']));
      deck.forEach((k) => expect(pool).toContain(k));
      expect(deck.some((k) => card(k).rarity === 'champion')).toBe(false);
    }
  });

  it('returns null when the rules cannot be met', () => {
    expect(generateDeck(createRng(1), { ...DEFAULT_RULES, pool: ['knight', 'archers', 'zap'] }, 20)).toBeNull();
  });

  it('computes deck stats', () => {
    const hog = META_DECKS[0].cards;
    expect(averageElixir(hog)).toBeCloseTo(2.625);
    expect(cycleCost(hog)).toBe(6);
    expect(checkDeck(hog).every((r) => r.ok)).toBe(false); // 2,6 liegt unter dem Standard-Minimum
    expect(checkDeck(hog, { ...DEFAULT_RULES, minAvg: 2.5 }).every((r) => r.ok)).toBe(true);
    expect(deckLink(hog)).toBe(
      'https://link.clashroyale.com/deck/de?deck=26000021;26000014;27000000;26000038;26000030;26000010;28000000;28000011',
    );
  });
});

describe('deck finder', () => {
  it('normalizes API levels to the display scale', () => {
    expect(normalizeLevel(14, 'common', 16)).toBe(14);
    expect(normalizeLevel(6, 'legendary', 8)).toBe(14);
    expect(normalizeLevel(3, 'epic')).toBe(8);
  });

  it('prefers decks the player owns at high level', () => {
    const hog = META_DECKS.find((d) => d.name.startsWith('Hog 2.6'))!;
    const collection = collectionFromApi(
      hog.cards.map((k) => ({ id: card(k).id, name: card(k).name, level: 13, maxLevel: 16 })),
    );
    const best = findBestDecks(META_DECKS, collection, 3);
    expect(best[0].deck.name).toBe(hog.name);
    expect(best[0].ownedCount).toBe(8);
    expect(best[0].avgLevel).toBe(13);
  });

  it('substitutes missing cards with similar owned cards', () => {
    const deck = { name: 'Test', archetype: 'Cycle' as const, strength: 3, cards: ['hog-rider', 'musketeer', 'cannon', 'ice-golem', 'ice-spirit', 'skeletons', 'fireball', 'the-log'] };
    const owned = ['hog-rider', 'archers', 'cannon', 'knight', 'ice-spirit', 'skeletons', 'fireball', 'zap'];
    const collection = new Map(owned.map((k) => [k, { key: k, level: 11 }]));
    const m = matchDeck(deck, collection);
    expect(m.ownedCount).toBe(5);
    const subs = Object.fromEntries(m.substitutions.map((s) => [s.missing, s.replacement]));
    expect(subs['the-log']).toBe('zap');
    expect(subs['musketeer']).toBe('archers');
    expect(new Set(m.cards).size).toBe(8);
  });

  it('works without a collection', () => {
    const best = findBestDecks(META_DECKS, new Map(), 5);
    expect(best).toHaveLength(5);
    expect(best[0].deck.strength).toBe(5);
  });
});

describe('api helpers', () => {
  it('normalizes tags', () => {
    expect(normalizeTag(' #pyl0qg ')).toBe('#PYL0QG');
    expect(normalizeTag('goo8')).toBe('#G008');
    expect(isValidTag('#PYL0QG')).toBe(true);
    expect(isValidTag('#ABC')).toBe(false);
  });

  it('parses a player and remote meta', () => {
    const p = parsePlayer({
      tag: '#P0',
      name: 'X',
      trophies: 5000,
      expLevel: 50,
      cards: [{ id: 26000021, name: 'Hog Rider', level: 12, maxLevel: 14 }],
      currentDeck: [{ id: 26000021, name: 'Hog Rider', level: 12 }],
    });
    expect(p.currentDeck).toEqual(['hog-rider']);
    const decks = remoteToMetaDecks({
      generatedAt: '',
      sampleBattles: 10,
      decks: [{ cards: META_DECKS[0].cards.map((k) => ({ id: card(k).id, name: card(k).name })), uses: 10, wins: 6 }],
    });
    expect(decks).toHaveLength(1);
    expect(decks[0].name).toContain('Hog Rider');
  });
});

describe('trainer rounds', () => {
  it('inserts mirror and collector in pro mode', () => {
    for (let seed = 1; seed < 20; seed++) {
      const { cards } = opponentDeck(applyPreset('pro'), seed);
      expect(cards).toHaveLength(8);
      expect(cards).toEqual(expect.arrayContaining(['mirror', 'elixir-collector']));
    }
  });

  it('removes special cards when disabled', () => {
    for (let seed = 1; seed < 40; seed++) {
      const { cards } = opponentDeck(applyPreset('easy'), seed);
      expect(cards).toHaveLength(8);
      expect(new Set(cards).size).toBe(8);
      expect(cards).not.toContain('mirror');
      expect(cards).not.toContain('elixir-collector');
    }
  });

  it('creates enough checkpoints for the configured questions', () => {
    const round = createRound(applyPreset('normal'), 99);
    expect(round.checkpoints).toHaveLength(10);
  });
});
