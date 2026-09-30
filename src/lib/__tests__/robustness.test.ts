import { CARDS } from '../../data/cards';
import { META_DECKS } from '../../data/metaDecks';
import { fetchCardIcons, fetchPlayer, pingProxy } from '../api';
import { elixirAt, MAX_ELIXIR, SCHEDULES, ScheduleKind, simulateOpponent } from '../elixir';
import { tradeInfo } from '../coach';
import { applyPreset, createRound, TrainerConfig } from '../trainerConfig';

describe('simulation invariants', () => {
  const kinds = Object.keys(SCHEDULES) as ScheduleKind[];

  it('holds for every meta deck, schedule and many seeds', () => {
    for (const deck of META_DECKS) {
      for (const schedule of kinds) {
        for (let seed = 1; seed <= 6; seed++) {
          const sim = simulateOpponent({ deck: deck.cards, schedule: SCHEDULES[schedule], duration: 240, seed });
          let prevT = -1;
          for (const e of sim.events) {
            expect(e.t).toBeGreaterThanOrEqual(prevT);
            prevT = e.t;
            expect(Number.isFinite(e.t)).toBe(true);
            expect(e.elixirAfter).toBeGreaterThanOrEqual(-1e-9);
            expect(e.elixirAfter).toBeLessThanOrEqual(MAX_ELIXIR + 1e-9);
            if (e.kind === 'play') expect(e.elixirBefore).toBeGreaterThanOrEqual(e.cost - 1e-9);
          }
          for (let t = 0; t <= 240; t += 13.7) {
            const x = elixirAt(sim, t);
            expect(x).toBeGreaterThanOrEqual(-1e-9);
            expect(x).toBeLessThanOrEqual(MAX_ELIXIR);
          }
        }
      }
    }
  });

  it('does not crash with mirror or collector as first cards', () => {
    const deck = ['mirror', 'elixir-collector', 'golem', 'zap', 'knight', 'archers', 'hog-rider', 'fireball'];
    for (let seed = 1; seed <= 100; seed++) {
      const sim = simulateOpponent({ deck, schedule: SCHEDULES.match, duration: 200, seed });
      expect(sim.events.length).toBeGreaterThan(5);
    }
  });
});

describe('round construction', () => {
  it('yields exactly the requested number of ascending checkpoints for every setting', () => {
    const presets = [applyPreset('easy'), applyPreset('normal'), applyPreset('pro')];
    const custom: TrainerConfig[] = [3, 10, 25].flatMap((questions) =>
      (['single', 'double', 'triple', 'match'] as const).map((schedule) => ({
        ...applyPreset('normal'),
        preset: 'custom' as const,
        questions,
        schedule,
        speed: 0.5,
      })),
    );
    for (const cfg of [...presets, ...custom]) {
      for (let seed = 1; seed <= 25; seed++) {
        const r = createRound(cfg, seed);
        expect(r.checkpoints).toHaveLength(cfg.questions);
        for (let i = 1; i < r.checkpoints.length; i++) expect(r.checkpoints[i]).toBeGreaterThan(r.checkpoints[i - 1]);
        expect(r.checkpoints[r.checkpoints.length - 1]).toBeLessThan(r.sim.duration);
        expect(r.deck).toHaveLength(8);
        expect(new Set(r.deck).size).toBe(8);
        r.deck.concat(r.own.deck).forEach((k) => expect(CARDS.some((c) => c.key === k)).toBe(true));
      }
    }
  });

  it('coach estimate is exact at every checkpoint when nobody wasted elixir', () => {
    let exact = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = createRound(applyPreset('normal'), seed);
      for (const t of r.checkpoints) {
        const info = tradeInfo(r.sim, r.own.sim, t);
        if (info.reliable) {
          exact++;
          expect(info.estimate).toBeCloseTo(elixirAt(r.sim, t), 4);
        }
      }
    }
    expect(exact).toBeGreaterThan(30);
  });
});

describe('api error handling', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });
  const respond = (status: number, body: unknown) =>
    (globalThis.fetch = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }) as never);

  it('maps status codes to readable messages', async () => {
    respond(404, {});
    await expect(fetchPlayer('https://p.example', '#ABC')).rejects.toThrow(/nicht gefunden/);
    respond(403, {});
    await expect(fetchPlayer('https://p.example', '#ABC')).rejects.toThrow(/Zugriff verweigert/);
    respond(500, { reason: 'boom' });
    await expect(fetchPlayer('https://p.example', '#ABC')).rejects.toThrow(/500: boom/);
  });

  it('reports an unreachable proxy and never throws from ping', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as never;
    await expect(fetchPlayer('https://p.example', '#ABC')).rejects.toThrow(/Keine Verbindung/);
    await expect(pingProxy('https://p.example')).resolves.toBe(false);
  });

  it('encodes the tag and trims the trailing slash', async () => {
    const fn = respond(200, { tag: '#ABC', name: 'X', trophies: 1, expLevel: 1, cards: [] });
    await fetchPlayer('https://p.example/', '#ABC');
    expect(fn).toHaveBeenCalledWith('https://p.example/players/%23ABC', expect.anything());
  });

  it('keeps only icons from the official asset host', async () => {
    respond(200, {
      items: [
        { id: 26000021, name: 'Hog Rider', iconUrls: { medium: 'https://api-assets.clashroyale.com/cards/300/x.png' } },
        { id: 26000000, name: 'Knight', iconUrls: { medium: 'https://evil.example/knight.png' } },
        { id: 1, name: 'Unbekannt', iconUrls: { medium: 'https://api-assets.clashroyale.com/cards/300/y.png' } },
        { id: 26000001, name: 'Archers' },
      ],
    });
    await expect(fetchCardIcons('https://p.example')).resolves.toEqual({
      'hog-rider': 'https://api-assets.clashroyale.com/cards/300/x.png',
    });
  });
});
