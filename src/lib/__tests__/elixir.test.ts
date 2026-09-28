import {
  checkpoints,
  elixirAt,
  explain,
  formatClock,
  gradeAnswer,
  MAX_ELIXIR,
  rateAt,
  regenBetween,
  SCHEDULES,
  simulateOpponent,
  START_ELIXIR,
  timeToGain,
} from '../elixir';

const HOG = ['hog-rider', 'musketeer', 'cannon', 'ice-golem', 'ice-spirit', 'skeletons', 'fireball', 'the-log'];

describe('regeneration', () => {
  it('regenerates one elixir per 2.8 s', () => {
    expect(regenBetween(SCHEDULES.single, 0, 2.8)).toBeCloseTo(1);
    expect(regenBetween(SCHEDULES.double, 0, 2.8)).toBeCloseTo(2);
    expect(regenBetween(SCHEDULES.triple, 0, 2.8)).toBeCloseTo(3);
  });

  it('integrates across phase boundaries', () => {
    // 118.6–120 s einfach (0,5), 120–121,4 s doppelt (1,0)
    expect(regenBetween(SCHEDULES.match, 118.6, 121.4)).toBeCloseTo(1.5);
    expect(rateAt(SCHEDULES.match, 119)).toBe(1);
    expect(rateAt(SCHEDULES.match, 130)).toBe(2);
    expect(rateAt(SCHEDULES.match, 250)).toBe(3);
  });

  it('timeToGain is the inverse of regenBetween', () => {
    for (const t0 of [0, 50, 118, 239]) {
      const dt = timeToGain(SCHEDULES.match, t0, 3.3);
      expect(regenBetween(SCHEDULES.match, t0, t0 + dt)).toBeCloseTo(3.3);
    }
  });
});

describe('simulateOpponent', () => {
  const sim = simulateOpponent({ deck: HOG, schedule: SCHEDULES.match, duration: 200, seed: 42 });

  it('is deterministic for a seed', () => {
    const again = simulateOpponent({ deck: HOG, schedule: SCHEDULES.match, duration: 200, seed: 42 });
    expect(again.events).toEqual(sim.events);
  });

  it('never goes negative or above the cap and pays the card cost', () => {
    const plays = sim.events.filter((e) => e.kind === 'play');
    expect(plays.length).toBeGreaterThan(20);
    for (const p of plays) {
      if (p.kind !== 'play') continue;
      expect(p.elixirBefore).toBeGreaterThanOrEqual(p.cost - 1e-9);
      expect(p.elixirBefore).toBeLessThanOrEqual(MAX_ELIXIR + 1e-9);
      expect(p.elixirAfter).toBeCloseTo(p.elixirBefore - p.cost);
    }
    for (let t = 0; t < 200; t += 0.37) {
      const e = elixirAt(sim, t);
      expect(e).toBeGreaterThanOrEqual(-1e-9);
      expect(e).toBeLessThanOrEqual(MAX_ELIXIR);
    }
  });

  it('starts at 5 elixir', () => {
    expect(elixirAt(sim, 0)).toBe(START_ELIXIR);
  });

  it('cycles cards: a card returns only after 4 others', () => {
    const plays = sim.events.flatMap((e) => (e.kind === 'play' ? [e.card] : []));
    for (let i = 0; i < plays.length; i++) {
      const next = plays.indexOf(plays[i], i + 1);
      if (next !== -1) expect(next - i).toBeGreaterThanOrEqual(5);
    }
  });

  it('prices mirror at the last card + 1', () => {
    const deck = ['mirror', 'hog-rider', 'elixir-collector', 'valkyrie', 'musketeer', 'ice-spirit', 'fireball', 'zap'];
    let found = 0;
    for (let seed = 1; seed < 30; seed++) {
      const s = simulateOpponent({ deck, schedule: SCHEDULES.single, duration: 150, seed });
      const plays = s.events.filter((e) => e.kind === 'play');
      plays.forEach((p, i) => {
        if (p.kind === 'play' && p.card === 'mirror') {
          const prev = plays[i - 1];
          expect(prev && prev.kind === 'play').toBe(true);
          if (prev.kind === 'play') {
            const prevCard = prev.mirrored ?? prev.card;
            expect(p.mirrored).toBe(prevCard);
          }
          expect(p.cost).toBeGreaterThanOrEqual(2);
          found++;
        }
      });
    }
    expect(found).toBeGreaterThan(0);
  });

  it('adds elixir from the collector', () => {
    const deck = ['elixir-collector', 'golem', 'night-witch', 'baby-dragon', 'lumberjack', 'mega-minion', 'tornado', 'lightning'];
    const s = simulateOpponent({ deck, schedule: SCHEDULES.single, duration: 200, seed: 7 });
    const ticks = s.events.filter((e) => e.kind === 'collector');
    expect(ticks.length).toBeGreaterThan(0);
    const tick = ticks[0];
    const before = elixirAt(s, tick.t - 1e-6);
    expect(elixirAt(s, tick.t)).toBeCloseTo(Math.min(MAX_ELIXIR, before + 1), 4);
  });
});

describe('checkpoints and grading', () => {
  it('generates the requested number of checkpoints in order', () => {
    const sim = simulateOpponent({ deck: HOG, schedule: SCHEDULES.single, duration: 200, seed: 3 });
    const cps = checkpoints(sim, 10, 3);
    expect(cps).toHaveLength(10);
    for (let i = 1; i < cps.length; i++) expect(cps[i]).toBeGreaterThan(cps[i - 1]);
  });

  it('rounds down and is lenient just before the next elixir', () => {
    expect(gradeAnswer(4, 4.3, 1000)).toMatchObject({ expected: 4, error: 0, points: 100 });
    expect(gradeAnswer(5, 4.3, 1000)).toMatchObject({ error: 1, points: 50 });
    expect(gradeAnswer(5, 4.9, 1000)).toMatchObject({ error: 0 });
    expect(gradeAnswer(0, 10, 1000)).toMatchObject({ expected: 10, error: 10, points: 0 });
  });

  it('reduces points for slow answers', () => {
    expect(gradeAnswer(4, 4.1, 8000).points).toBe(50);
    expect(gradeAnswer(4, 4.1, 5000).points).toBe(75);
  });

  it('explains the result from the last play', () => {
    const sim = simulateOpponent({ deck: HOG, schedule: SCHEDULES.single, duration: 100, seed: 11 });
    const t = 40;
    const ex = explain(sim, t);
    expect(ex.lastPlay).toBeDefined();
    expect(Math.min(MAX_ELIXIR, ex.lastPlay!.elixirAfter + ex.regen + ex.collectorTicks)).toBeCloseTo(ex.actual);
  });

  it('formats the clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(125.7)).toBe('2:05');
  });
});
