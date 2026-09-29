/**
 * Lernhilfe „Elixier-Handel“: Beide Spieler regenerieren gleich schnell und
 * starten mit 5. Der Unterschied der Ausgaben verrät also den Unterschied im
 * Elixier: Gegner = du + (deine Ausgaben − seine Ausgaben) (reine Logik).
 */

import { regenBetween, Simulation, START_ELIXIR, elixirAt } from './elixir';

export interface TradeInfo {
  ownElixir: number;
  spentOwn: number;
  spentOpp: number;
  /** Sammler-Ticks, die dem jeweiligen Spieler zusätzlich Elixier gebracht haben. */
  collectorOwn: number;
  collectorOpp: number;
  estimate: number;
  /** false, sobald bei einem der beiden Elixier über 10 verfallen ist. Dann stimmt die Rechnung nur ungefähr. */
  reliable: boolean;
}

function stats(sim: Simulation, t: number) {
  let spent = 0;
  let collectors = 0;
  let capped = false;
  for (const e of sim.events) {
    if (e.t > t) break;
    const uncapped = START_ELIXIR - spent + regenBetween(sim.schedule, 0, e.t) + collectors;
    if (e.kind === 'play') {
      if (Math.abs(uncapped - e.elixirBefore) > 1e-6) capped = true;
      spent += e.cost;
    } else {
      if (e.wasted || Math.abs(uncapped - (e.elixirAfter - 1)) > 1e-6) capped = true;
      collectors++;
    }
  }
  const uncappedNow = START_ELIXIR - spent + regenBetween(sim.schedule, 0, t) + collectors;
  if (Math.abs(uncappedNow - elixirAt(sim, t)) > 1e-6) capped = true;
  return { spent, collectors, capped };
}

export function tradeInfo(opp: Simulation, own: Simulation, t: number): TradeInfo {
  const o = stats(own, t);
  const p = stats(opp, t);
  const ownElixir = elixirAt(own, t);
  const estimate = Math.max(0, Math.min(10, ownElixir + o.spent - p.spent + p.collectors - o.collectors));
  return {
    ownElixir,
    spentOwn: o.spent,
    spentOpp: p.spent,
    collectorOwn: o.collectors,
    collectorOpp: p.collectors,
    estimate,
    reliable: !o.capped && !p.capped,
  };
}
