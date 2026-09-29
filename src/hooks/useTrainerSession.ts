/**
 * Ablauf einer Trainingsrunde: Countdown → Simulation läuft → Abfrage (Zeit
 * pausiert) → Auflösung → … → Ergebnis. Die Spielzeit läuft mit `speed` × Echtzeit.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { COLLECTOR_LIFETIME, elixirAt, explain, Explanation, Grade, gradeAnswer, playsUntil } from '../lib/elixir';
import { randomSeed } from '../lib/random';
import { createRound, Round, TrainerConfig } from '../lib/trainerConfig';

export type SessionPhase = 'countdown' | 'running' | 'question' | 'reveal' | 'done';

export interface AnswerRecord extends Grade {
  answer: number;
  actual: number;
  reactionMs: number;
  t: number;
  explanation: Explanation;
}

const TICK_MS = 50;
const COUNTDOWN_S = 3;

export interface SessionCallbacks {
  onAnswer?: (record: AnswerRecord) => void;
  onFinish?: (answers: AnswerRecord[]) => void;
}

export function useTrainerSession(config: TrainerConfig, callbacks: SessionCallbacks = {}, profileDeck?: string[]) {
  const [round, setRound] = useState<Round>(() => createRound(config, randomSeed(), profileDeck));
  const [phase, setPhase] = useState<SessionPhase>('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_S);
  const [simTime, setSimTime] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const questionStart = useRef(0);
  const lastTick = useRef(0);
  const simRef = useRef(0);

  // Countdown vor dem Start.
  useEffect(() => {
    if (phase !== 'countdown') return;
    const id = setTimeout(() => {
      if (countdown <= 1) setPhase('running');
      else setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  // Spielzeit fortschreiben und an Abfragepunkten anhalten.
  useEffect(() => {
    if (phase !== 'running') return;
    lastTick.current = Date.now();
    const target = round.checkpoints[qIndex];
    const id = setInterval(() => {
      const now = Date.now();
      const dt = ((now - lastTick.current) / 1000) * config.speed;
      lastTick.current = now;
      const next = simRef.current + dt;
      if (target !== undefined && next >= target) {
        simRef.current = target;
        questionStart.current = now;
        setPhase('question');
      } else {
        simRef.current = next;
      }
      setSimTime(simRef.current);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, qIndex, round, config.speed]);

  const answer = useCallback(
    (value: number) => {
      if (phase !== 'question') return;
      const t = round.checkpoints[qIndex];
      const actual = elixirAt(round.sim, t);
      const reactionMs = Date.now() - questionStart.current;
      const record = { ...gradeAnswer(value, actual, reactionMs), answer: value, actual, reactionMs, t, explanation: explain(round.sim, t) };
      setAnswers((prev) => [...prev, record]);
      setPhase('reveal');
      callbacks.onAnswer?.(record);
    },
    [phase, qIndex, round, callbacks],
  );

  const next = useCallback(() => {
    if (phase !== 'reveal') return;
    if (qIndex + 1 >= round.checkpoints.length) {
      setPhase('done');
      callbacks.onFinish?.(answers);
    } else {
      setQIndex((i) => i + 1);
      setPhase('running');
    }
  }, [phase, qIndex, round, answers, callbacks]);

  const restart = useCallback(() => {
    setRound(createRound(config, randomSeed(), profileDeck));
    setAnswers([]);
    setQIndex(0);
    simRef.current = 0;
    setSimTime(0);
    setCountdown(COUNTDOWN_S);
    setPhase('countdown');
  }, [config, profileDeck]);

  const plays = useMemo(() => playsUntil(round.sim, simTime), [round, simTime]);
  const collectorUntil = useMemo(() => {
    // Ende der Laufzeit des zuletzt gebauten Sammlers (für die Anzeige in der Arena).
    const built = plays.filter((p) => (p.mirrored ?? p.card) === 'elixir-collector');
    const last = built[built.length - 1];
    return last ? last.t + COLLECTOR_LIFETIME : 0;
  }, [plays]);

  const ownPlays = useMemo(() => playsUntil(round.own.sim, simTime), [round, simTime]);
  const ownElixir = elixirAt(round.own.sim, simTime);

  const score = answers.reduce((s, a) => s + a.points, 0);

  return {
    round,
    phase,
    countdown,
    simTime,
    qIndex,
    total: round.checkpoints.length,
    answers,
    lastAnswer: answers[answers.length - 1],
    score,
    plays,
    ownPlays,
    ownElixir,
    collectorUntil,
    answer,
    next,
    restart,
  };
}
