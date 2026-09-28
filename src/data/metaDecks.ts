/**
 * Kuratierte Archetyp-Decks als Offline-Grundlage für den Deck-Finder und als
 * Gegnerdecks im Elixier-Trainer. `strength` (1–5) ist eine grobe Einschätzung,
 * keine Live-Statistik. Mit konfiguriertem Proxy ersetzt die App diese Liste
 * durch aggregierte Decks der Top-Spieler.
 */

export interface MetaDeck {
  name: string;
  archetype: 'Cycle' | 'Beatdown' | 'Siege' | 'Bait' | 'Bridge Spam' | 'Control' | 'Midladder';
  strength: number;
  cards: string[];
}

export const META_DECKS: MetaDeck[] = [
  {
    name: 'Hog 2.6 Cycle',
    archetype: 'Cycle',
    strength: 5,
    cards: ['hog-rider', 'musketeer', 'cannon', 'ice-golem', 'ice-spirit', 'skeletons', 'fireball', 'the-log'],
  },
  {
    name: 'Log Bait',
    archetype: 'Bait',
    strength: 5,
    cards: ['goblin-barrel', 'princess', 'goblin-gang', 'knight', 'inferno-tower', 'rocket', 'the-log', 'ice-spirit'],
  },
  {
    name: 'X-Bow 3.0',
    archetype: 'Siege',
    strength: 4,
    cards: ['x-bow', 'tesla', 'archers', 'knight', 'ice-spirit', 'skeletons', 'fireball', 'the-log'],
  },
  {
    name: 'LavaLoon',
    archetype: 'Beatdown',
    strength: 4,
    cards: ['lava-hound', 'balloon', 'mega-minion', 'minions', 'skeleton-dragons', 'tombstone', 'arrows', 'fireball'],
  },
  {
    name: 'Golem Beatdown',
    archetype: 'Beatdown',
    strength: 4,
    cards: ['golem', 'night-witch', 'baby-dragon', 'lumberjack', 'mega-minion', 'tornado', 'lightning', 'barbarian-barrel'],
  },
  {
    name: 'Miner Poison Control',
    archetype: 'Control',
    strength: 4,
    cards: ['miner', 'poison', 'wall-breakers', 'bats', 'valkyrie', 'magic-archer', 'bomb-tower', 'the-log'],
  },
  {
    name: 'P.E.K.K.A Bridge Spam',
    archetype: 'Bridge Spam',
    strength: 5,
    cards: ['pekka', 'battle-ram', 'bandit', 'royal-ghost', 'electro-wizard', 'magic-archer', 'poison', 'zap'],
  },
  {
    name: 'Royal Giant Fisherman',
    archetype: 'Beatdown',
    strength: 4,
    cards: ['royal-giant', 'fisherman', 'hunter', 'mother-witch', 'electro-spirit', 'skeletons', 'fireball', 'the-log'],
  },
  {
    name: 'Mega Knight Miner',
    archetype: 'Midladder',
    strength: 3,
    cards: ['mega-knight', 'miner', 'bats', 'spear-goblins', 'inferno-dragon', 'skeleton-barrel', 'zap', 'fireball'],
  },
  {
    name: 'Splashyard',
    archetype: 'Control',
    strength: 4,
    cards: ['graveyard', 'poison', 'barbarian-barrel', 'ice-wizard', 'baby-dragon', 'tornado', 'knight', 'tombstone'],
  },
  {
    name: 'Graveyard Freeze',
    archetype: 'Control',
    strength: 3,
    cards: ['graveyard', 'freeze', 'ice-wizard', 'baby-dragon', 'valkyrie', 'tombstone', 'barbarian-barrel', 'poison'],
  },
  {
    name: 'E-Giant Tornado',
    archetype: 'Beatdown',
    strength: 4,
    cards: ['electro-giant', 'tornado', 'lightning', 'bowler', 'dark-prince', 'electro-spirit', 'mega-minion', 'barbarian-barrel'],
  },
  {
    name: 'Goblin Giant Sparky',
    archetype: 'Beatdown',
    strength: 3,
    cards: ['goblin-giant', 'sparky', 'dark-prince', 'mega-minion', 'electro-wizard', 'heal-spirit', 'rage', 'zap'],
  },
  {
    name: 'Mortar Bait',
    archetype: 'Siege',
    strength: 3,
    cards: ['mortar', 'miner', 'goblin-gang', 'skeleton-barrel', 'dart-goblin', 'spear-goblins', 'the-log', 'arrows'],
  },
  {
    name: 'Three Musketeers Pump',
    archetype: 'Beatdown',
    strength: 3,
    cards: ['three-musketeers', 'battle-ram', 'elixir-collector', 'ice-golem', 'dark-prince', 'bandit', 'heal-spirit', 'zap'],
  },
  {
    name: 'Royal Hogs Recruits',
    archetype: 'Bridge Spam',
    strength: 4,
    cards: ['royal-recruits', 'royal-hogs', 'flying-machine', 'zappies', 'goblin-cage', 'arrows', 'barbarian-barrel', 'electro-spirit'],
  },
  {
    name: 'Hog Earthquake',
    archetype: 'Cycle',
    strength: 4,
    cards: ['hog-rider', 'earthquake', 'valkyrie', 'musketeer', 'cannon', 'skeletons', 'ice-spirit', 'the-log'],
  },
  {
    name: 'Giant Double Prince',
    archetype: 'Beatdown',
    strength: 3,
    cards: ['giant', 'prince', 'dark-prince', 'electro-wizard', 'mega-minion', 'minions', 'zap', 'fireball'],
  },
  {
    name: 'Goblin Drill Cycle',
    archetype: 'Cycle',
    strength: 4,
    cards: ['goblin-drill', 'wall-breakers', 'bomber', 'tesla', 'skeletons', 'electro-spirit', 'fireball', 'the-log'],
  },
  {
    name: 'Elixir Golem Rage',
    archetype: 'Beatdown',
    strength: 2,
    cards: ['elixir-golem', 'battle-healer', 'electro-dragon', 'night-witch', 'barbarian-barrel', 'rage', 'tornado', 'zap'],
  },
  {
    name: 'Balloon Cycle',
    archetype: 'Cycle',
    strength: 3,
    cards: ['balloon', 'musketeer', 'ice-golem', 'bomber', 'skeletons', 'ice-spirit', 'giant-snowball', 'barbarian-barrel'],
  },
  {
    name: 'Miner Wall Breakers',
    archetype: 'Cycle',
    strength: 4,
    cards: ['miner', 'wall-breakers', 'magic-archer', 'bomb-tower', 'spear-goblins', 'skeletons', 'poison', 'the-log'],
  },
  {
    name: 'Ram Rider Bridge Spam',
    archetype: 'Bridge Spam',
    strength: 3,
    cards: ['ram-rider', 'bandit', 'royal-ghost', 'electro-wizard', 'dart-goblin', 'goblin-cage', 'poison', 'the-log'],
  },
  {
    name: 'Giant Skeleton Clone',
    archetype: 'Midladder',
    strength: 2,
    cards: ['giant-skeleton', 'clone', 'balloon', 'minions', 'musketeer', 'knight', 'zap', 'arrows'],
  },
  {
    name: 'Mirror Hog Pump',
    archetype: 'Midladder',
    strength: 2,
    cards: ['hog-rider', 'mirror', 'elixir-collector', 'valkyrie', 'musketeer', 'ice-spirit', 'fireball', 'zap'],
  },
];
