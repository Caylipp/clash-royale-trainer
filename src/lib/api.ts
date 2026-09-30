/**
 * Zugriff auf die Clash Royale API über den eigenen Proxy (siehe worker/).
 * Der API-Key ist an feste IPs gebunden und gehört daher nicht in die App.
 */

import { card, findCard } from '../data/cards';
import type { MetaDeck } from '../data/metaDecks';
import { collectionFromApi, Collection } from './deckFinder';

export interface ApiCard {
  id?: number;
  name: string;
  level: number;
  maxLevel?: number;
  rarity?: string;
  elixirCost?: number;
}

export interface PlayerProfile {
  tag: string;
  name: string;
  trophies: number;
  expLevel: number;
  cards: ApiCard[];
  currentDeck: string[];
  fetchedAt: number;
}

/** Normalisiert Spieler-Tags: Großbuchstaben, führendes #, O → 0 (häufiger Tippfehler). */
export function normalizeTag(input: string): string {
  const body = input.trim().toUpperCase().replace(/^#/, '').replace(/O/g, '0').replace(/[^0-9A-Z]/g, '');
  return body ? `#${body}` : '';
}

export function isValidTag(tag: string): boolean {
  // Offizielle Tags bestehen nur aus diesen Zeichen.
  return /^#[0289PYLQGRJCUV]{3,12}$/.test(tag);
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`;
}

const TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
  } catch {
    if (controller.signal.aborted) throw new Error('Zeitüberschreitung: Der Proxy antwortet nicht.');
    throw new Error('Keine Verbindung zum Proxy. Stimmt die URL, und hast du Internet?');
  } finally {
    clearTimeout(timer);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    let reason = '';
    try {
      const body = await res.json();
      reason = body?.reason ?? body?.message ?? body?.error ?? '';
    } catch {
      // Antwort war kein JSON.
    }
    if (res.status === 404) throw new Error('Spieler nicht gefunden. Stimmt der Tag?');
    if (res.status === 403) throw new Error('Zugriff verweigert: API-Key oder IP-Freigabe des Proxys prüfen.');
    throw new Error(`Fehler ${res.status}${reason ? `: ${reason}` : ''}`);
  }
  return res.json() as Promise<T>;
}

interface RawPlayer {
  tag: string;
  name: string;
  trophies: number;
  expLevel: number;
  cards?: ApiCard[];
  currentDeck?: ApiCard[];
}

export function parsePlayer(raw: RawPlayer): PlayerProfile {
  return {
    tag: raw.tag,
    name: raw.name,
    trophies: raw.trophies,
    expLevel: raw.expLevel,
    cards: (raw.cards ?? []).map(({ id, name, level, maxLevel, rarity, elixirCost }) => ({
      id,
      name,
      level,
      maxLevel,
      rarity,
      elixirCost,
    })),
    currentDeck: (raw.currentDeck ?? [])
      .map((c) => findCard({ id: c.id, name: c.name })?.key)
      .filter((k): k is string => !!k),
    fetchedAt: Date.now(),
  };
}

export async function fetchPlayer(proxyUrl: string, tag: string): Promise<PlayerProfile> {
  const raw = await getJson<RawPlayer>(joinUrl(proxyUrl, `/players/${encodeURIComponent(tag)}`));
  return parsePlayer(raw);
}

export function playerCollection(player: PlayerProfile | null): Collection {
  return player ? collectionFromApi(player.cards) : new Map();
}

export interface RemoteMeta {
  generatedAt: string;
  sampleBattles: number;
  decks: { cards: { id?: number; name: string }[]; uses: number; wins: number }[];
}

/** Wandelt die aggregierten Top-Spieler-Decks in MetaDecks um (Stärke aus Winrate/Nutzung). */
export function remoteToMetaDecks(meta: RemoteMeta): MetaDeck[] {
  const maxUses = Math.max(1, ...meta.decks.map((d) => d.uses));
  const out: MetaDeck[] = [];
  for (const d of meta.decks) {
    const keys = d.cards.map((c) => findCard(c)?.key);
    if (keys.length !== 8 || keys.some((k) => !k)) continue;
    const cards = keys as string[];
    const winrate = d.uses ? d.wins / d.uses : 0.5;
    const popularity = d.uses / maxUses;
    const strength = Math.max(1, Math.min(5, Math.round(1 + (winrate - 0.4) * 15 + popularity * 1.5)));
    const wins = cards.filter((k) => card(k).roles.includes('win')).map((k) => card(k).name);
    out.push({
      name: `${wins.slice(0, 2).join(' + ') || card(cards[0]).name} · ${Math.round(winrate * 100)} % Siege`,
      archetype: 'Midladder',
      strength,
      cards,
    });
  }
  return out;
}

export async function fetchMeta(proxyUrl: string): Promise<{ decks: MetaDeck[]; raw: RemoteMeta }> {
  const raw = await getJson<RemoteMeta>(joinUrl(proxyUrl, '/meta/decks'));
  return { decks: remoteToMetaDecks(raw), raw };
}

interface RawCards {
  items?: { id?: number; name: string; iconUrls?: { medium?: string } }[];
}

/** Offizielle Icon-URLs pro Karten-Key. Die Bilder werden nur angezeigt, nie gespeichert oder weitergegeben. */
export async function fetchCardIcons(proxyUrl: string): Promise<Record<string, string>> {
  const raw = await getJson<RawCards>(joinUrl(proxyUrl, '/cards'));
  const out: Record<string, string> = {};
  for (const c of raw.items ?? []) {
    const url = c.iconUrls?.medium;
    const known = findCard({ id: c.id, name: c.name });
    if (known && url && /^https:\/\/api-assets\.clashroyale\.com\//.test(url)) out[known.key] = url;
  }
  return out;
}

export async function pingProxy(proxyUrl: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(joinUrl(proxyUrl, '/health'));
    return res.ok;
  } catch {
    return false;
  }
}
