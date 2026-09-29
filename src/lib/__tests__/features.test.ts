import { tradeInfo } from '../coach';
import { createDrill, gain } from '../drill';
import { elixirAt, MAX_ELIXIR, SCHEDULES, simulateOpponent } from '../elixir';
import { progressInfo } from '../progress';
import { createRng } from '../random';
import { applyPreset, createRound } from '../trainerConfig';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('trade estimate', () => {
  it('equals the opponent elixir whenever nobody hit the cap', () => {
    let reliable = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const round = createRound(applyPreset('easy'), seed);
      for (const t of round.checkpoints) {
        const info = tradeInfo(round.sim, round.own.sim, t);
        if (info.reliable) {
          reliable++;
          expect(info.estimate).toBeCloseTo(elixirAt(round.sim, t), 4);
        }
      }
    }
    expect(reliable).toBeGreaterThan(50);
  });

  it('marks capped simulations as unreliable', () => {
    const idle = simulateOpponent({ deck: ['golem', 'night-witch', 'baby-dragon', 'lumberjack', 'mega-minion', 'tornado', 'lightning', 'barbarian-barrel'], schedule: SCHEDULES.triple, duration: 60, seed: 4 });
    expect(tradeInfo(idle, idle, 59).reliable).toBe(false);
  });

  it('includes collector ticks', () => {
    const deck = ['elixir-collector', 'golem', 'night-witch', 'baby-dragon', 'lumberjack', 'mega-minion', 'tornado', 'lightning'];
    const opp = simulateOpponent({ deck, schedule: SCHEDULES.single, duration: 150, seed: 7 });
    const own = simulateOpponent({ deck: ['knight', 'archers', 'zap', 'ice-spirit', 'skeletons', 'hog-rider', 'musketeer', 'fireball'], schedule: SCHEDULES.single, duration: 150, seed: 8 });
    for (let t = 20; t < 150; t += 7) {
      const info = tradeInfo(opp, own, t);
      if (info.reliable) expect(info.estimate).toBeCloseTo(elixirAt(opp, t), 4);
    }
  });
});

describe('streak and daily goal', () => {
  const now = at(2026, 9, 29);

  it('counts consecutive days ending today', () => {
    const h = [at(2026, 9, 29, 8), at(2026, 9, 29, 9), at(2026, 9, 28), at(2026, 9, 27), at(2026, 9, 25)].map((x) => ({ at: x }));
    expect(progressInfo(h, now, 2)).toMatchObject({ streak: 3, bestStreak: 3, todayRounds: 2, goalReached: true, atRisk: false });
  });

  it('keeps the streak alive until the end of the next day', () => {
    const h = [at(2026, 9, 28), at(2026, 9, 27)].map((x) => ({ at: x }));
    expect(progressInfo(h, now)).toMatchObject({ streak: 2, todayRounds: 0, atRisk: true, goalReached: false });
  });

  it('resets after a missed day but remembers the best streak', () => {
    const h = [at(2026, 9, 20), at(2026, 9, 21), at(2026, 9, 22), at(2026, 9, 26)].map((x) => ({ at: x }));
    expect(progressInfo(h, now)).toMatchObject({ streak: 0, bestStreak: 3, atRisk: false });
  });

  it('handles an empty history', () => {
    expect(progressInfo([], now)).toMatchObject({ streak: 0, bestStreak: 0, todayRounds: 0 });
  });
});

describe('drill', () => {
  it('builds playable, consistent scenarios', () => {
    for (const level of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 100; seed++) {
        const d = createDrill(createRng(seed), level);
        expect(d.steps).toHaveLength(level === 1 ? 1 : 2);
        let elixir = d.start;
        for (const s of d.steps) {
          elixir = Math.min(MAX_ELIXIR, elixir + gain(s.waitBefore, d.rate));
          expect(s.elixirBefore).toBeCloseTo(elixir);
          expect(elixir).toBeGreaterThanOrEqual(s.cost - 1e-9);
          elixir -= s.cost;
        }
        expect(d.actual).toBeCloseTo(Math.min(MAX_ELIXIR, elixir + gain(d.finalWait, d.rate)));
        expect(d.rate).toBe(level === 3 ? d.rate : 1);
        if (level === 3) expect(d.rate).toBeGreaterThan(1);
      }
    }
  });
});
