/** Laufende Trainingsrunde: gegnerische Karten beobachten und Elixier schätzen. */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardTile, ElixirBar, ElixirDrop } from '../components/CardTile';
import { Button, Card } from '../components/ui';
import { card } from '../data/cards';
import { AnswerRecord, useTrainerSession } from '../hooks/useTrainerSession';
import { formatClock, rateAt, SimEvent } from '../lib/elixir';
import { rankFor, trainerShareText } from '../lib/rating';
import { PRESETS } from '../lib/trainerConfig';
import { hapticResult } from '../platform/haptics';
import { useStore } from '../state/store';
import { colors, radius } from '../theme/colors';

type Play = Extract<SimEvent, { kind: 'play' }>;

const FLASH_SECONDS = 1.6;

function fmt(n: number, digits = 1): string {
  return n.toFixed(digits).replace('.', ',');
}

function playLabel(p: Play): string {
  return p.mirrored ? `Spiegel → ${card(p.mirrored).name}` : card(p.card).name;
}

export default function TrainScreen() {
  useKeepAwake();
  const { settings, addResult, player } = useStore();
  const config = settings.trainer;
  const presetLabel = config.preset === 'custom' ? 'Eigene Einstellungen' : PRESETS[config.preset].label;
  const s = useTrainerSession(config, {
    onAnswer: (a) => settings.haptics && hapticResult(a.error === 0),
    onFinish: (answers) => {
      const n = answers.length;
      addResult({
        at: Date.now(),
        preset: config.preset,
        score: answers.reduce((x, a) => x + a.points, 0),
        maxScore: n * 100,
        exact: answers.filter((a) => a.error === 0).length,
        questions: n,
        avgError: n ? answers.reduce((x, a) => x + a.error, 0) / n : 0,
        avgReactionMs: n ? answers.reduce((x, a) => x + a.reactionMs, 0) / n : 0,
      });
    },
  }, player?.currentDeck);

  if (s.phase === 'done') {
    return (
      <Results
        answers={s.answers}
        score={s.score}
        presetLabel={presetLabel}
        deckName={s.round.deckName}
        onRestart={s.restart}
      />
    );
  }

  const rate = rateAt(s.round.sim.schedule, s.simTime);
  const lastPlay = s.plays[s.plays.length - 1];
  const showFlash = lastPlay && (config.showFeed || s.simTime - lastPlay.t < FLASH_SECONDS);
  const collectorLeft = s.collectorUntil - s.simTime;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Training beenden" hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.muted} />
        </Pressable>
        <Text style={styles.counter}>
          Frage {Math.min(s.qIndex + 1, s.total)}/{s.total}
        </Text>
        <Text style={styles.score}>{s.score} P</Text>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.phaseBadge, rate > 1 && { backgroundColor: colors.elixirDim, borderColor: colors.elixir }]}>
          <Text style={[styles.phaseText, rate > 1 && { color: colors.elixir }]}>
            {rate === 1 ? '1× Elixier' : `${rate}× ELIXIER!`}
          </Text>
        </View>
        <Text style={styles.clock}>{formatClock(s.simTime)}</Text>
        {config.speed !== 1 && <Text style={styles.speed}>{fmt(config.speed, 2).replace(/0$/, '')}× Tempo</Text>}
      </View>

      <View style={styles.arena}>
        {s.phase === 'countdown' ? (
          <View style={styles.center}>
            <Text style={styles.countdownHint}>Gegner startet mit 5 Elixier</Text>
            <Text style={styles.countdown}>{s.countdown > 0 ? s.countdown : 'Los!'}</Text>
            <Text style={styles.deckHint}>Gegnerdeck: {s.round.deckName}</Text>
          </View>
        ) : showFlash ? (
          <FlashCard key={`${lastPlay.t}`} play={lastPlay} simTime={s.simTime} />
        ) : (
          <View style={styles.center}>
            <Text style={styles.waiting}>{lastPlay ? 'Zähl weiter mit …' : 'Warte auf den ersten Zug …'}</Text>
          </View>
        )}
        {collectorLeft > 0 && s.phase !== 'countdown' && (
          <View style={styles.collector}>
            <Ionicons name="flask" size={14} color={colors.elixir} />
            <Text style={styles.collectorText}>Elixiersammler steht (noch {Math.ceil(collectorLeft)} s)</Text>
          </View>
        )}
      </View>

      {config.showFeed && (
        <ScrollView style={styles.feed} contentContainerStyle={{ gap: 6 }}>
          {[...s.plays].reverse().slice(0, 8).map((p) => (
            <View key={p.t} style={styles.feedRow}>
              <Text style={styles.feedTime}>{formatClock(p.t)}</Text>
              <CardTile cardKey={p.card} size="sm" />
              <Text style={styles.feedName} numberOfLines={1}>
                {playLabel(p)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
      {!config.showFeed && <View style={{ flex: 1 }} />}

      {s.phase !== 'countdown' && (
        <OwnPanel elixir={s.ownElixir} plays={s.ownPlays} deckName={s.round.own.deckName} />
      )}

      <View style={styles.bottom}>
        {s.phase === 'question' && <Question onAnswer={s.answer} />}
        {s.phase === 'reveal' && s.lastAnswer && (
          <Reveal answer={s.lastAnswer} onNext={s.next} last={s.qIndex + 1 >= s.total} />
        )}
        {(s.phase === 'running' || s.phase === 'countdown') && (
          <Text style={styles.hint}>Behalte das Elixier des Gegners im Kopf. Gleich kommt die Frage!</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

/** Dein eigenes Elixier und deine letzten Karten: im echten Match immer sichtbar. */
function OwnPanel({ elixir, plays, deckName }: { elixir: number; plays: Play[]; deckName: string }) {
  const recent = plays.slice(-4);
  return (
    <View style={styles.own}>
      <View style={styles.ownHead}>
        <Text style={styles.ownTitle}>Du · {deckName}</Text>
        <View style={styles.ownValue}>
          <ElixirDrop value={Math.floor(elixir)} size={24} fontSize={14} />
        </View>
      </View>
      <ElixirBar value={elixir} height={12} />
      <View style={styles.ownCards}>
        {recent.length === 0 ? (
          <Text style={styles.ownEmpty}>Du hast noch keine Karte gelegt.</Text>
        ) : (
          recent.map((p) => <CardTile key={p.t} cardKey={p.card} size="sm" />)
        )}
      </View>
    </View>
  );
}

function FlashCard({ play, simTime }: { play: Play; simTime: number }) {
  const [scale] = useState(() => new Animated.Value(0.6));
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [scale]);
  const ago = simTime - play.t;
  return (
    <View style={styles.center}>
      <Text style={styles.flashLabel}>Gegner spielt</Text>
      <Animated.View style={{ transform: [{ scale }] }}>
        <CardTile cardKey={play.card} size="lg" />
      </Animated.View>
      <Text style={styles.flashName}>{playLabel(play)}</Text>
      <Text style={styles.flashAgo}>vor {fmt(Math.max(0, ago))} s</Text>
    </View>
  );
}

function Question({ onAnswer }: { onAnswer: (n: number) => void }) {
  return (
    <View>
      <Text style={styles.question}>Wie viel Elixier hat der Gegner jetzt?</Text>
      <View style={styles.pad}>
        {Array.from({ length: 11 }, (_, n) => (
          <Pressable
            key={n}
            onPress={() => onAnswer(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n} Elixier`}
            style={({ pressed }) => [styles.padKey, n === 10 && styles.padKeyWide, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.padText}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Reveal({ answer, onNext, last }: { answer: AnswerRecord; onNext: () => void; last: boolean }) {
  const ok = answer.error === 0;
  const ex = answer.explanation;
  const capped = ex.lastPlay ? ex.lastPlay.elixirAfter + ex.regen + ex.collectorTicks > 10 : false;
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.revealHead}>
        <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={28} color={ok ? colors.good : colors.bad} />
        <Text style={[styles.revealTitle, { color: ok ? colors.good : colors.bad }]}>
          {ok ? 'Richtig!' : answer.error === 1 ? 'Knapp daneben' : 'Daneben'}
        </Text>
        <Text style={styles.revealPoints}>+{answer.points} P</Text>
      </View>
      <ElixirBar value={answer.actual} />
      <Text style={styles.revealText}>
        Gegner hatte <Text style={styles.bold}>{fmt(answer.actual)}</Text> Elixier (angezeigt: {answer.expected}) · du:{' '}
        {answer.answer} · {fmt(answer.reactionMs / 1000)} s
      </Text>
      {ex.lastPlay && (
        <Text style={styles.explain}>
          Rechenweg: nach {ex.lastPlay.mirrored ? `Spiegel (${card(ex.lastPlay.mirrored).name})` : card(ex.lastPlay.card).name}{' '}
          ({ex.lastPlay.cost}) bei {formatClock(ex.lastPlay.t)} blieben {fmt(ex.lastPlay.elixirAfter)}. Seitdem +
          {fmt(ex.regen)} regeneriert
          {ex.collectorTicks ? ` und +${ex.collectorTicks} vom Sammler` : ''}
          {capped ? ' (gedeckelt bei 10 – Elixier verschwendet!)' : ''}.
        </Text>
      )}
      <Button label={last ? 'Ergebnis ansehen' : 'Weiter'} variant="primary" icon="arrow-forward" onPress={onNext} />
    </View>
  );
}

function Results({
  answers,
  score,
  presetLabel,
  deckName,
  onRestart,
}: {
  answers: AnswerRecord[];
  score: number;
  presetLabel: string;
  deckName: string;
  onRestart: () => void;
}) {
  const max = answers.length * 100;
  const exact = answers.filter((a) => a.error === 0).length;
  const avgErr = answers.length ? answers.reduce((s, a) => s + a.error, 0) / answers.length : 0;
  const avgRt = answers.length ? answers.reduce((s, a) => s + a.reactionMs, 0) / answers.length : 0;
  const rank = rankFor(max ? score / max : 0);

  const share = () =>
    Share.share({ message: trainerShareText(score, max, exact, answers.length, presetLabel) }).catch(() => {});

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.results}>
        <Text style={styles.rankEmoji}>{rank.emoji}</Text>
        <Text style={styles.rankTitle}>{rank.title}</Text>
        <Text style={styles.resultScore}>
          {score} <Text style={styles.resultMax}>/ {max}</Text>
        </Text>
        <Text style={styles.muted}>
          {presetLabel} · Gegner: {deckName}
        </Text>

        <View style={styles.statRow}>
          <Stat label="Exakt" value={`${exact}/${answers.length}`} />
          <Stat label="Ø Abweichung" value={fmt(avgErr)} />
          <Stat label="Ø Reaktion" value={`${fmt(avgRt / 1000)} s`} />
        </View>

        <Card style={{ gap: 6, alignSelf: 'stretch' }}>
          {answers.map((a, i) => (
            <View key={i} style={styles.answerRow}>
              <Text style={styles.answerIdx}>{i + 1}.</Text>
              <Text style={styles.answerTime}>{formatClock(a.t)}</Text>
              <Text style={[styles.answerVal, { color: a.error === 0 ? colors.good : a.error === 1 ? colors.warn : colors.bad }]}>
                {a.answer} / {a.expected}
              </Text>
              <Text style={styles.answerPts}>{a.points} P</Text>
            </View>
          ))}
        </Card>

        <View style={styles.resultButtons}>
          <Button label="Nochmal" icon="refresh" variant="primary" onPress={onRestart} style={{ flex: 1 }} />
          <Button label="Teilen" icon="share-social" onPress={share} style={{ flex: 1 }} />
        </View>
        <Button label="Zurück" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  counter: { color: colors.text, fontSize: 16, fontWeight: '700' },
  score: { color: colors.accent, fontSize: 16, fontWeight: '800', minWidth: 60, textAlign: 'right' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  phaseText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  clock: { color: colors.text, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  speed: { color: colors.muted, fontSize: 12 },
  arena: {
    margin: 16,
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  countdownHint: { color: colors.muted, fontSize: 14 },
  countdown: { color: colors.accent, fontSize: 64, fontWeight: '900' },
  deckHint: { color: colors.faint, fontSize: 12 },
  waiting: { color: colors.muted, fontSize: 16 },
  flashLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  flashName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  flashAgo: { color: colors.muted, fontSize: 12 },
  collector: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  collectorText: { color: colors.elixir, fontSize: 12, fontWeight: '700' },
  own: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  ownHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ownTitle: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  ownValue: { flexDirection: 'row', alignItems: 'center' },
  ownCards: { flexDirection: 'row', gap: 6, minHeight: 72, alignItems: 'center' },
  ownEmpty: { color: colors.faint, fontSize: 13 },
  feed: { flex: 1, paddingHorizontal: 16 },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedTime: { color: colors.muted, width: 40, fontVariant: ['tabular-nums'] },
  feedName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  bottom: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
    justifyContent: 'center',
  },
  hint: { color: colors.muted, textAlign: 'center', fontSize: 14 },
  question: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  padKey: {
    width: '18%',
    aspectRatio: 1.3,
    borderRadius: radius.sm,
    backgroundColor: colors.elixirDim,
    borderWidth: 1,
    borderColor: colors.elixir,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padKeyWide: { width: '38%', aspectRatio: undefined },
  padText: { color: colors.text, fontSize: 22, fontWeight: '900' },
  revealHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revealTitle: { fontSize: 20, fontWeight: '900', flex: 1 },
  revealPoints: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  revealText: { color: colors.text, fontSize: 14 },
  bold: { fontWeight: '900', color: colors.elixir },
  explain: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  results: { padding: 20, alignItems: 'center', gap: 14 },
  rankEmoji: { fontSize: 56, marginTop: 20 },
  rankTitle: { color: colors.accent, fontSize: 24, fontWeight: '900' },
  resultScore: { color: colors.text, fontSize: 44, fontWeight: '900' },
  resultMax: { color: colors.muted, fontSize: 24 },
  muted: { color: colors.muted, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  answerIdx: { color: colors.muted, width: 24 },
  answerTime: { color: colors.muted, width: 44, fontVariant: ['tabular-nums'] },
  answerVal: { flex: 1, fontWeight: '800', fontSize: 15 },
  answerPts: { color: colors.text, fontWeight: '700' },
  resultButtons: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
});
