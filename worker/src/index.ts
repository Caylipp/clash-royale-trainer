/**
 * Cloudflare Worker als API-Proxy für die Clash Royale App.
 *
 * Der offizielle API-Key ist an IP-Adressen gebunden, Workers haben aber keine
 * feste IP. Deshalb geht die Anfrage standardmäßig über den RoyaleAPI-Proxy
 * (proxy.royaleapi.dev); dafür muss der Key die IP 45.79.218.79 freigeben.
 *
 * Routen:
 *   GET /health
 *   GET /players/:tag
 *   GET /players/:tag/battlelog
 *   GET /cards          Kartenliste mit offiziellen Icon-URLs (24 h gecacht)
 *   GET /meta/decks     Top-Decks aus den Battle-Logs der Top-Spieler (6 h gecacht)
 */

export interface Env {
  CR_API_TOKEN: string;
  UPSTREAM?: string;
  ALLOWED_ORIGIN?: string;
}

const DEFAULT_UPSTREAM = 'https://proxy.royaleapi.dev/v1';
const PLAYER_TTL = 60;
const META_TTL = 6 * 60 * 60;
const CARDS_TTL = 24 * 60 * 60;
const TOP_PLAYERS = 30; // bleibt unter dem Limit von 50 Unteranfragen pro Aufruf

interface BattleCard {
  id: number;
  name: string;
}
interface Battle {
  type: string;
  team: { crowns: number; cards: BattleCard[] }[];
  opponent: { crowns: number }[];
}

function cors(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body: unknown, env: Env, status = 200, ttl = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(ttl ? { 'Cache-Control': `public, max-age=${ttl}` } : {}),
      ...cors(env),
    },
  });
}

async function upstream<T>(env: Env, path: string): Promise<{ status: number; body: T }> {
  const res = await fetch(`${env.UPSTREAM ?? DEFAULT_UPSTREAM}${path}`, {
    headers: { Authorization: `Bearer ${env.CR_API_TOKEN}`, Accept: 'application/json' },
  });
  return { status: res.status, body: (await res.json()) as T };
}

function tagPath(tag: string): string {
  const clean = decodeURIComponent(tag).toUpperCase().replace(/^#/, '');
  if (!/^[0289PYLQGRJCUV]{3,12}$/.test(clean)) throw new Error('invalid tag');
  return `%23${clean}`;
}

async function topPlayerTags(env: Env): Promise<string[]> {
  // Path of Legend ist die aktuelle Top-Rangliste; ältere Trophäen-Rangliste als Fallback.
  for (const path of ['/locations/global/pathoflegend/players', '/locations/global/rankings/players']) {
    const { status, body } = await upstream<{ items?: { tag: string }[] }>(env, `${path}?limit=${TOP_PLAYERS}`);
    if (status === 200 && body.items?.length) return body.items.map((p) => p.tag);
  }
  return [];
}

async function aggregateMeta(env: Env) {
  const tags = await topPlayerTags(env);
  const decks = new Map<string, { cards: BattleCard[]; uses: number; wins: number }>();
  let sampleBattles = 0;
  // In kleinen Gruppen abfragen, um das Rate-Limit zu schonen.
  for (let i = 0; i < tags.length; i += 8) {
    const logs = await Promise.all(
      tags.slice(i, i + 8).map((t) =>
        upstream<Battle[]>(env, `/players/${tagPath(t)}/battlelog`)
          .then((r) => (r.status === 200 && Array.isArray(r.body) ? r.body : []))
          .catch(() => [] as Battle[]),
      ),
    );
    for (const battle of logs.flat()) {
      if (!['PvP', 'pathOfLegend', 'ladder'].includes(battle.type)) continue;
      const me = battle.team?.[0];
      const opp = battle.opponent?.[0];
      if (!me || !opp || me.cards?.length !== 8) continue;
      sampleBattles++;
      const cards = [...me.cards].sort((a, b) => a.id - b.id).map(({ id, name }) => ({ id, name }));
      const key = cards.map((c) => c.id).join(',');
      const entry = decks.get(key) ?? { cards, uses: 0, wins: 0 };
      entry.uses++;
      if (me.crowns > opp.crowns) entry.wins++;
      decks.set(key, entry);
    }
  }
  const sorted = [...decks.values()]
    .filter((d) => d.uses >= 2)
    .sort((a, b) => b.uses - a.uses || b.wins / b.uses - a.wins / a.uses)
    .slice(0, 30);
  return { generatedAt: new Date().toISOString(), sampleBattles, decks: sorted };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, env, 405);

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    try {
      if (parts[0] === 'health') return json({ ok: true }, env);

      if (parts[0] === 'players' && parts[1]) {
        const suffix = parts[2] === 'battlelog' ? '/battlelog' : '';
        const { status, body } = await upstream(env, `/players/${tagPath(parts[1])}${suffix}`);
        return json(body, env, status, status === 200 ? PLAYER_TTL : 0);
      }

      if (parts[0] === 'cards' && !parts[1]) {
        const { status, body } = await upstream(env, '/cards');
        return json(body, env, status, status === 200 ? CARDS_TTL : 0);
      }

      if (parts[0] === 'meta' && parts[1] === 'decks') {
        const cache = caches.default;
        const cacheKey = new Request(`${url.origin}/meta/decks`);
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
        const meta = await aggregateMeta(env);
        const res = json(meta, env, 200, META_TTL);
        if (meta.decks.length) ctx.waitUntil(cache.put(cacheKey, res.clone()));
        return res;
      }

      return json({ error: 'not found' }, env, 404);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown error';
      return json({ error: message }, env, message === 'invalid tag' ? 400 : 502);
    }
  },
};
