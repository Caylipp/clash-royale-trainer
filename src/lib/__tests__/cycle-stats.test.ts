import { CYCLE_LEVELS, createCycleTask, cycleSteps, DECK_SIZE, gradeCycle, handOf, nextOf, playCard, CycleLevel } from '../cycle';
import { createRng } from '../random';
import { byPreset, dailyStats, StatSession, summarize, trendMessage } from '../stats';

describe('card cycle', () => {
  const q = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  it('moves the preview card into the hand and the played card to the back', () => {
    expect(playCard(q, 'b')).toEqual(['a', 'c', 'd', 'e', 'f', 'g', 'h', 'b']);
    expect(playCard(q, 'a')).toEqual(['b', 'c', 'd', 'e', 'f', 'g', 'h', 'a']);
  });

  it('rejects cards that are not in the hand', () => {
    expect(() => playCard(q, 'e')).toThrow();
  });

  it('is deterministic per seed and keeps all 8 distinct cards', () => {
    for (const level of [1, 2, 3] as CycleLevel[]) {
      for (let seed = 1; seed <= 40; seed++) {
        const t = createCycleTask(createRng(seed), level);
        expect(t).toEqual(createCycleTask(createRng(seed), level));
        expect(t.start).toHaveLength(DECK_SIZE);
        expect(new Set(t.start).size).toBe(DECK_SIZE);
        expect([...t.end].sort()).toEqual([...t.start].sort());
        expect(t.plays).toHaveLength(CYCLE_LEVELS[level].plays);
        expect(t.start).not.toContain('mirror');
      }
    }
  });

  it('replays to the final state and each play was in the hand', () => {
    const t = createCycleTask(createRng(9), 3);
    let queue = t.start;
    for (const s of cycleSteps(t)) {
      expect(handOf(queue)).toContain(s.played);
      queue = s.queue;
    }
    expect(queue).toEqual(t.end);
  });

  it('grades hand and next-card answers', () => {
    const t = createCycleTask(createRng(3), 2);
    expect(gradeCycle(t, handOf(t.end)).correct).toBe(true);
    const wrong = [...handOf(t.end).slice(0, 3), nextOf(t.end)];
    const g = gradeCycle(t, wrong);
    expect(g.correct).toBe(false);
    expect(g.wrong).toEqual([nextOf(t.end)]);
    expect(g.missed).toHaveLength(1);

    const n = createCycleTask(createRng(3), 1);
    expect(gradeCycle(n, [nextOf(n.end)]).correct).toBe(true);
    expect(gradeCycle(n, [handOf(n.end)[0]]).correct).toBe(false);
  });
});

describe('training statistics', () => {
  const at = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h).getTime();
  const s = (when: number, score: number, over: Partial<StatSession> = {}): StatSession => ({
    at: when, preset: 'easy', score, maxScore: 100, exact: 5, questions: 10, avgError: 1, avgReactionMs: 3000, ...over,
  });

  it('builds a gap-free daily series ending today', () => {
    const now = at(11, 28);
    const days = dailyStats([s(at(11, 28, 9), 80), s(at(11, 28, 10), 60), s(at(11, 26), 50), s(at(10, 1), 99)], now, 7);
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ rounds: 2, ratio: 0.7 });
    expect(days[4]).toMatchObject({ rounds: 1, ratio: 0.5 });
    expect(days[5].rounds).toBe(0);
    expect(days.reduce((n, d) => n + d.rounds, 0)).toBe(3);
  });

  it('summarizes and detects an upward trend (newest first)', () => {
    const h = [90, 90, 90, 90, 90, 50, 50, 50, 50, 50].map((v, i) => s(at(11, 28) - i * 1000, v));
    const sum = summarize(h);
    expect(sum).toMatchObject({ rounds: 10, trend: 'up', bestRatio: 0.9 });
    expect(sum.trendDelta).toBeCloseTo(40);
    expect(sum.exactRate).toBeCloseTo(0.5);
    expect(trendMessage(sum)).toContain('Aufwärts');
  });

  it('stays gentle on a downward trend and unknown for few rounds', () => {
    const down = summarize([50, 50, 50, 50, 50, 90, 90].map((v, i) => s(1000 - i, v)));
    expect(down.trend).toBe('down');
    expect(trendMessage(down)).not.toMatch(/schlecht|Fehler/);
    expect(summarize([s(1, 50)]).trend).toBe('unknown');
    expect(trendMessage(summarize([]))).toContain('Noch keine');
  });

  it('handles empty history and groups by preset', () => {
    expect(summarize([])).toMatchObject({ rounds: 0, avgRatio: 0, exactRate: 0 });
    const g = byPreset([s(1, 50), s(2, 70), s(3, 90, { preset: 'pro' })]);
    expect(g[0]).toMatchObject({ preset: 'easy', rounds: 2, ratio: 0.6 });
  });
});
