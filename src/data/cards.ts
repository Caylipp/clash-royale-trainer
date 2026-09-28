/**
 * Offline-Kartendatenbank. Basis: RoyaleAPI cr-api-data, ergänzt um neuere Karten.
 * `id` entspricht der ID der offiziellen API (nötig für Deck-Links); bei neueren
 * Karten ohne gesicherte ID fehlt sie. Rollen sind handgepflegt und vereinfacht.
 */

export type CardType = 'troop' | 'building' | 'spell';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'champion';
export type Role = 'win' | 'air' | 'bigSpell' | 'smallSpell' | 'tank' | 'building';

export interface Card {
  id?: number;
  key: string;
  name: string;
  elixir: number;
  type: CardType;
  rarity: Rarity;
  roles: Role[];
}

export const CARDS: Card[] = [
  { id: 26000000, key: 'knight', name: 'Knight', elixir: 3, type: 'troop', rarity: 'common', roles: [] },
  { id: 26000001, key: 'archers', name: 'Archers', elixir: 3, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000002, key: 'goblins', name: 'Goblins', elixir: 2, type: 'troop', rarity: 'common', roles: [] },
  { id: 26000003, key: 'giant', name: 'Giant', elixir: 5, type: 'troop', rarity: 'rare', roles: ['win', 'tank'] },
  { id: 26000004, key: 'pekka', name: 'P.E.K.K.A', elixir: 7, type: 'troop', rarity: 'epic', roles: ['win', 'tank'] },
  { id: 26000005, key: 'minions', name: 'Minions', elixir: 3, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000006, key: 'balloon', name: 'Balloon', elixir: 5, type: 'troop', rarity: 'epic', roles: ['win'] },
  { id: 26000007, key: 'witch', name: 'Witch', elixir: 5, type: 'troop', rarity: 'epic', roles: ['air'] },
  { id: 26000008, key: 'barbarians', name: 'Barbarians', elixir: 5, type: 'troop', rarity: 'common', roles: [] },
  { id: 26000009, key: 'golem', name: 'Golem', elixir: 8, type: 'troop', rarity: 'epic', roles: ['win', 'tank'] },
  { id: 26000010, key: 'skeletons', name: 'Skeletons', elixir: 1, type: 'troop', rarity: 'common', roles: [] },
  { id: 26000011, key: 'valkyrie', name: 'Valkyrie', elixir: 4, type: 'troop', rarity: 'rare', roles: [] },
  { id: 26000012, key: 'skeleton-army', name: 'Skeleton Army', elixir: 3, type: 'troop', rarity: 'epic', roles: [] },
  { id: 26000013, key: 'bomber', name: 'Bomber', elixir: 2, type: 'troop', rarity: 'common', roles: [] },
  { id: 26000014, key: 'musketeer', name: 'Musketeer', elixir: 4, type: 'troop', rarity: 'rare', roles: ['air'] },
  { id: 26000015, key: 'baby-dragon', name: 'Baby Dragon', elixir: 4, type: 'troop', rarity: 'epic', roles: ['air'] },
  { id: 26000016, key: 'prince', name: 'Prince', elixir: 5, type: 'troop', rarity: 'epic', roles: ['win'] },
  { id: 26000017, key: 'wizard', name: 'Wizard', elixir: 5, type: 'troop', rarity: 'rare', roles: ['air'] },
  { id: 26000018, key: 'mini-pekka', name: 'Mini P.E.K.K.A', elixir: 4, type: 'troop', rarity: 'rare', roles: [] },
  { id: 26000019, key: 'spear-goblins', name: 'Spear Goblins', elixir: 2, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000020, key: 'giant-skeleton', name: 'Giant Skeleton', elixir: 6, type: 'troop', rarity: 'epic', roles: ['win', 'tank'] },
  { id: 26000021, key: 'hog-rider', name: 'Hog Rider', elixir: 4, type: 'troop', rarity: 'rare', roles: ['win'] },
  { id: 26000022, key: 'minion-horde', name: 'Minion Horde', elixir: 5, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000023, key: 'ice-wizard', name: 'Ice Wizard', elixir: 3, type: 'troop', rarity: 'legendary', roles: ['air'] },
  { id: 26000024, key: 'royal-giant', name: 'Royal Giant', elixir: 6, type: 'troop', rarity: 'common', roles: ['win', 'tank'] },
  { id: 26000025, key: 'guards', name: 'Guards', elixir: 3, type: 'troop', rarity: 'epic', roles: [] },
  { id: 26000026, key: 'princess', name: 'Princess', elixir: 3, type: 'troop', rarity: 'legendary', roles: ['air'] },
  { id: 26000027, key: 'dark-prince', name: 'Dark Prince', elixir: 4, type: 'troop', rarity: 'epic', roles: [] },
  { id: 26000028, key: 'three-musketeers', name: 'Three Musketeers', elixir: 9, type: 'troop', rarity: 'rare', roles: ['win', 'air', 'tank'] },
  { id: 26000029, key: 'lava-hound', name: 'Lava Hound', elixir: 7, type: 'troop', rarity: 'legendary', roles: ['win', 'tank'] },
  { id: 26000030, key: 'ice-spirit', name: 'Ice Spirit', elixir: 1, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000031, key: 'fire-spirit', name: 'Fire Spirit', elixir: 1, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000032, key: 'miner', name: 'Miner', elixir: 3, type: 'troop', rarity: 'legendary', roles: ['win'] },
  { id: 26000033, key: 'sparky', name: 'Sparky', elixir: 6, type: 'troop', rarity: 'legendary', roles: ['win'] },
  { id: 26000034, key: 'bowler', name: 'Bowler', elixir: 5, type: 'troop', rarity: 'epic', roles: [] },
  { id: 26000035, key: 'lumberjack', name: 'Lumberjack', elixir: 4, type: 'troop', rarity: 'legendary', roles: [] },
  { id: 26000036, key: 'battle-ram', name: 'Battle Ram', elixir: 4, type: 'troop', rarity: 'rare', roles: ['win'] },
  { id: 26000037, key: 'inferno-dragon', name: 'Inferno Dragon', elixir: 4, type: 'troop', rarity: 'legendary', roles: ['air'] },
  { id: 26000038, key: 'ice-golem', name: 'Ice Golem', elixir: 2, type: 'troop', rarity: 'rare', roles: [] },
  { id: 26000039, key: 'mega-minion', name: 'Mega Minion', elixir: 3, type: 'troop', rarity: 'rare', roles: ['air'] },
  { id: 26000040, key: 'dart-goblin', name: 'Dart Goblin', elixir: 3, type: 'troop', rarity: 'rare', roles: ['air'] },
  { id: 26000041, key: 'goblin-gang', name: 'Goblin Gang', elixir: 3, type: 'troop', rarity: 'common', roles: [] },
  { id: 26000042, key: 'electro-wizard', name: 'Electro Wizard', elixir: 4, type: 'troop', rarity: 'legendary', roles: ['air'] },
  { id: 26000043, key: 'elite-barbarians', name: 'Elite Barbarians', elixir: 6, type: 'troop', rarity: 'common', roles: [] },
  { id: 26000044, key: 'hunter', name: 'Hunter', elixir: 4, type: 'troop', rarity: 'epic', roles: ['air'] },
  { id: 26000045, key: 'executioner', name: 'Executioner', elixir: 5, type: 'troop', rarity: 'epic', roles: ['air'] },
  { id: 26000046, key: 'bandit', name: 'Bandit', elixir: 3, type: 'troop', rarity: 'legendary', roles: ['win'] },
  { id: 26000047, key: 'royal-recruits', name: 'Royal Recruits', elixir: 7, type: 'troop', rarity: 'common', roles: ['win'] },
  { id: 26000048, key: 'night-witch', name: 'Night Witch', elixir: 4, type: 'troop', rarity: 'legendary', roles: ['air'] },
  { id: 26000049, key: 'bats', name: 'Bats', elixir: 2, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000050, key: 'royal-ghost', name: 'Royal Ghost', elixir: 3, type: 'troop', rarity: 'legendary', roles: [] },
  { id: 26000051, key: 'ram-rider', name: 'Ram Rider', elixir: 5, type: 'troop', rarity: 'legendary', roles: ['win'] },
  { id: 26000052, key: 'zappies', name: 'Zappies', elixir: 4, type: 'troop', rarity: 'rare', roles: ['air'] },
  { id: 26000053, key: 'rascals', name: 'Rascals', elixir: 5, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000054, key: 'cannon-cart', name: 'Cannon Cart', elixir: 5, type: 'troop', rarity: 'epic', roles: ['air'] },
  { id: 26000055, key: 'mega-knight', name: 'Mega Knight', elixir: 7, type: 'troop', rarity: 'legendary', roles: ['win', 'tank'] },
  { id: 26000056, key: 'skeleton-barrel', name: 'Skeleton Barrel', elixir: 3, type: 'troop', rarity: 'common', roles: ['win'] },
  { id: 26000057, key: 'flying-machine', name: 'Flying Machine', elixir: 4, type: 'troop', rarity: 'rare', roles: ['air'] },
  { id: 26000058, key: 'wall-breakers', name: 'Wall Breakers', elixir: 2, type: 'troop', rarity: 'epic', roles: ['win'] },
  { id: 26000059, key: 'royal-hogs', name: 'Royal Hogs', elixir: 5, type: 'troop', rarity: 'rare', roles: ['win'] },
  { id: 26000060, key: 'goblin-giant', name: 'Goblin Giant', elixir: 6, type: 'troop', rarity: 'epic', roles: ['win', 'tank'] },
  { id: 26000061, key: 'fisherman', name: 'Fisherman', elixir: 3, type: 'troop', rarity: 'legendary', roles: [] },
  { id: 26000062, key: 'magic-archer', name: 'Magic Archer', elixir: 4, type: 'troop', rarity: 'legendary', roles: ['air'] },
  { id: 26000063, key: 'electro-dragon', name: 'Electro Dragon', elixir: 5, type: 'troop', rarity: 'epic', roles: ['air'] },
  { id: 26000064, key: 'firecracker', name: 'Firecracker', elixir: 3, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000065, key: 'mighty-miner', name: 'Mighty Miner', elixir: 4, type: 'troop', rarity: 'champion', roles: [] },
  { id: 26000067, key: 'elixir-golem', name: 'Elixir Golem', elixir: 3, type: 'troop', rarity: 'rare', roles: ['win', 'tank'] },
  { id: 26000068, key: 'battle-healer', name: 'Battle Healer', elixir: 4, type: 'troop', rarity: 'rare', roles: [] },
  { id: 26000069, key: 'skeleton-king', name: 'Skeleton King', elixir: 4, type: 'troop', rarity: 'champion', roles: [] },
  { id: 26000072, key: 'archer-queen', name: 'Archer Queen', elixir: 5, type: 'troop', rarity: 'champion', roles: ['air'] },
  { id: 26000074, key: 'golden-knight', name: 'Golden Knight', elixir: 4, type: 'troop', rarity: 'champion', roles: [] },
  { id: 26000077, key: 'monk', name: 'Monk', elixir: 5, type: 'troop', rarity: 'champion', roles: [] },
  { id: 26000080, key: 'skeleton-dragons', name: 'Skeleton Dragons', elixir: 4, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000083, key: 'mother-witch', name: 'Mother Witch', elixir: 4, type: 'troop', rarity: 'legendary', roles: ['air'] },
  { id: 26000084, key: 'electro-spirit', name: 'Electro Spirit', elixir: 1, type: 'troop', rarity: 'common', roles: ['air'] },
  { id: 26000085, key: 'electro-giant', name: 'Electro Giant', elixir: 7, type: 'troop', rarity: 'epic', roles: ['win', 'tank'] },
  { id: 26000086, key: 'raging-prince', name: 'Raging Prince', elixir: 5, type: 'troop', rarity: 'epic', roles: [] },
  { id: 26000087, key: 'phoenix', name: 'Phoenix', elixir: 4, type: 'troop', rarity: 'legendary', roles: ['air'] },
  { id: 27000000, key: 'cannon', name: 'Cannon', elixir: 3, type: 'building', rarity: 'common', roles: ['building'] },
  { id: 27000001, key: 'goblin-hut', name: 'Goblin Hut', elixir: 5, type: 'building', rarity: 'rare', roles: ['air', 'building'] },
  { id: 27000002, key: 'mortar', name: 'Mortar', elixir: 4, type: 'building', rarity: 'common', roles: ['win', 'building'] },
  { id: 27000003, key: 'inferno-tower', name: 'Inferno Tower', elixir: 5, type: 'building', rarity: 'rare', roles: ['air', 'building'] },
  { id: 27000004, key: 'bomb-tower', name: 'Bomb Tower', elixir: 4, type: 'building', rarity: 'rare', roles: ['building'] },
  { id: 27000005, key: 'barbarian-hut', name: 'Barbarian Hut', elixir: 6, type: 'building', rarity: 'rare', roles: ['building'] },
  { id: 27000006, key: 'tesla', name: 'Tesla', elixir: 4, type: 'building', rarity: 'common', roles: ['air', 'building'] },
  { id: 27000007, key: 'elixir-collector', name: 'Elixir Collector', elixir: 6, type: 'building', rarity: 'rare', roles: ['building'] },
  { id: 27000008, key: 'x-bow', name: 'X-Bow', elixir: 6, type: 'building', rarity: 'epic', roles: ['win', 'air', 'building'] },
  { id: 27000009, key: 'tombstone', name: 'Tombstone', elixir: 3, type: 'building', rarity: 'rare', roles: ['building'] },
  { id: 27000010, key: 'furnace', name: 'Furnace', elixir: 4, type: 'building', rarity: 'rare', roles: ['building'] },
  { id: 27000012, key: 'goblin-cage', name: 'Goblin Cage', elixir: 4, type: 'building', rarity: 'rare', roles: ['building'] },
  { id: 27000013, key: 'goblin-drill', name: 'Goblin Drill', elixir: 4, type: 'building', rarity: 'epic', roles: ['win', 'building'] },
  { id: 28000000, key: 'fireball', name: 'Fireball', elixir: 4, type: 'spell', rarity: 'rare', roles: ['air', 'bigSpell'] },
  { id: 28000001, key: 'arrows', name: 'Arrows', elixir: 3, type: 'spell', rarity: 'common', roles: ['air', 'smallSpell'] },
  { id: 28000002, key: 'rage', name: 'Rage', elixir: 2, type: 'spell', rarity: 'epic', roles: [] },
  { id: 28000003, key: 'rocket', name: 'Rocket', elixir: 6, type: 'spell', rarity: 'rare', roles: ['win', 'air', 'bigSpell'] },
  { id: 28000004, key: 'goblin-barrel', name: 'Goblin Barrel', elixir: 3, type: 'spell', rarity: 'epic', roles: ['win'] },
  { id: 28000005, key: 'freeze', name: 'Freeze', elixir: 4, type: 'spell', rarity: 'epic', roles: [] },
  { id: 28000006, key: 'mirror', name: 'Mirror', elixir: 1, type: 'spell', rarity: 'epic', roles: [] },
  { id: 28000007, key: 'lightning', name: 'Lightning', elixir: 6, type: 'spell', rarity: 'epic', roles: ['air', 'bigSpell'] },
  { id: 28000008, key: 'zap', name: 'Zap', elixir: 2, type: 'spell', rarity: 'common', roles: ['air', 'smallSpell'] },
  { id: 28000009, key: 'poison', name: 'Poison', elixir: 4, type: 'spell', rarity: 'epic', roles: ['air', 'bigSpell'] },
  { id: 28000010, key: 'graveyard', name: 'Graveyard', elixir: 5, type: 'spell', rarity: 'legendary', roles: ['win'] },
  { id: 28000011, key: 'the-log', name: 'The Log', elixir: 2, type: 'spell', rarity: 'legendary', roles: ['smallSpell'] },
  { id: 28000012, key: 'tornado', name: 'Tornado', elixir: 3, type: 'spell', rarity: 'epic', roles: ['air', 'smallSpell'] },
  { id: 28000013, key: 'clone', name: 'Clone', elixir: 3, type: 'spell', rarity: 'epic', roles: [] },
  { id: 28000014, key: 'earthquake', name: 'Earthquake', elixir: 3, type: 'spell', rarity: 'rare', roles: ['bigSpell'] },
  { id: 28000015, key: 'barbarian-barrel', name: 'Barbarian Barrel', elixir: 2, type: 'spell', rarity: 'epic', roles: ['smallSpell'] },
  { id: 28000016, key: 'heal-spirit', name: 'Heal Spirit', elixir: 1, type: 'troop', rarity: 'rare', roles: [] },
  { id: 28000017, key: 'giant-snowball', name: 'Giant Snowball', elixir: 2, type: 'spell', rarity: 'common', roles: ['air', 'smallSpell'] },
  { id: 28000018, key: 'royal-delivery', name: 'Royal Delivery', elixir: 3, type: 'spell', rarity: 'common', roles: ['smallSpell'] },
  { id: 26000093, key: 'little-prince', name: 'Little Prince', elixir: 3, type: 'troop', rarity: 'champion', roles: ['air'] },
  { key: 'goblinstein', name: 'Goblinstein', elixir: 5, type: 'troop', rarity: 'champion', roles: ['win', 'tank'] },
  { key: 'boss-bandit', name: 'Boss Bandit', elixir: 6, type: 'troop', rarity: 'champion', roles: ['win'] },
  { key: 'goblin-demolisher', name: 'Goblin Demolisher', elixir: 4, type: 'troop', rarity: 'rare', roles: [] },
  { key: 'goblin-machine', name: 'Goblin Machine', elixir: 5, type: 'troop', rarity: 'legendary', roles: [] },
  { key: 'suspicious-bush', name: 'Suspicious Bush', elixir: 2, type: 'troop', rarity: 'rare', roles: ['win'] },
  { key: 'rune-giant', name: 'Rune Giant', elixir: 4, type: 'troop', rarity: 'epic', roles: ['tank'] },
  { key: 'berserker', name: 'Berserker', elixir: 2, type: 'troop', rarity: 'common', roles: [] },
  { key: 'void', name: 'Void', elixir: 3, type: 'spell', rarity: 'epic', roles: ['air', 'bigSpell'] },
  { key: 'goblin-curse', name: 'Goblin Curse', elixir: 2, type: 'spell', rarity: 'epic', roles: ['air', 'smallSpell'] },
];

const BY_KEY = new Map(CARDS.map((c) => [c.key, c]));
const BY_NAME = new Map(CARDS.map((c) => [normalizeName(c.name), c]));
const BY_ID = new Map(CARDS.filter((c) => c.id !== undefined).map((c) => [c.id!, c]));

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function card(key: string): Card {
  const c = BY_KEY.get(key);
  if (!c) throw new Error(`Unbekannte Karte: ${key}`);
  return c;
}

export function findCard(ref: { id?: number; name?: string; key?: string }): Card | undefined {
  if (ref.key && BY_KEY.has(ref.key)) return BY_KEY.get(ref.key);
  if (ref.id !== undefined && BY_ID.has(ref.id)) return BY_ID.get(ref.id);
  if (ref.name) return BY_NAME.get(normalizeName(ref.name));
  return undefined;
}

export function hasRole(c: Card, role: Role): boolean {
  return c.roles.includes(role);
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Gewöhnlich',
  rare: 'Selten',
  epic: 'Episch',
  legendary: 'Legendär',
  champion: 'Champion',
};

export const ROLE_LABEL: Record<Role, string> = {
  win: 'Win-Condition',
  air: 'Luftabwehr',
  bigSpell: 'Großer Zauber',
  smallSpell: 'Kleiner Zauber',
  tank: 'Tank',
  building: 'Gebäude',
};
