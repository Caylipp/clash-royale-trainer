/** Übungsmodus „Ein Zug“: ohne Zeitdruck einzelne Elixier-Rechnungen üben. */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardTile, ElixirBar } from '../components/CardTile';
import { Button, Card, Segmented } from '../components/ui';
import { card } from '../data/cards';
import { createDrill, Drill, DRILL_LEVELS, DrillLevel, gain } from '../lib/drill';
import { gradeAnswer, REGEN_SECONDS } from '../lib/elixir';
import { createRng, randomSeed } from '../lib/random';
import { hapticResult } from '../platform/haptics';
import { useStore } from '../state/store';
import { colors, radius } from '../theme/colors';

const fmt = (n: number, d = 1) => n.toFixed(d).replace('.', ',');

export default function PracticeScreen() {
  const { settings } = useStore();
  const [level, setLevel] = useState<DrillLevel>(1);
  const [drill, setDrill] = useState<Drill>(() => createDrill(createRng(randomSeed()), 1));
  const [answer, setAnswer] = useState<number | null>(null);
  const [stats, setStats] = useState({ right: 0, total: 0, streak: 0 });

  const fresh = (l: DrillLevel) => {
    setDrill(createDrill(createRng(randomSeed()), l));
    setAnswer(null);
  };

  const choose = (n: number) => {
    if (answer !== null) return;
    const grade = gradeAnswer(n, drill.actual, 0);
    const ok = grade.error === 0;
    setAnswer(n);
    setStats((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }));
    if (settings.haptics) hapticResult(ok);
  };

  const grade = answer !== null ? gradeAnswer(answer, drill.actual, 0) : null;
  const ok = grade?.error === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Übung beenden" hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.muted} />
        </Pressable>
        <Text style={styles.title}>Übungsmodus</Text>
        <Text style={styles.score}>
          {stats.right}/{stats.total}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        <Segmented<DrillLevel>
          value={level}
          onChange={(l) => {
            setLevel(l);
            fresh(l);
          }}
          options={([1, 2, 3] as const).map((l) => ({ value: l, label: DRILL_LEVELS[l].label }))}
        />
        <Text style={styles.hint}>
          {DRILL_LEVELS[level].hint}. Kein Zeitdruck. Eine Serie richtiger Antworten: {stats.streak}
        </Text>

        <Card style={{ gap: 12 }}>
          <Text style={styles.label}>Der Gegner hat</Text>
          <ElixirBar value={drill.start} />
          <Text style={styles.big}>{drill.start} Elixier</Text>

          {drill.steps.map((s, i) => (
            <View key={i} style={{ gap: 8 }}>
              {s.waitBefore > 0 && (
                <Text style={styles.step}>
                  Dann vergehen <Text style={styles.bold}>{s.waitBefore} s</Text> bei {drill.rate}× Elixier.
                </Text>
              )}
              <View style={styles.playRow}>
                <CardTile cardKey={s.card} size="sm" />
                <Text style={styles.step}>
                  Er spielt <Text style={styles.bold}>{card(s.card).name}</Text> ({s.cost} Elixier).
                </Text>
              </View>
            </View>
          ))}

          <Text style={styles.step}>
            Danach vergehen <Text style={styles.bold}>{drill.finalWait} s</Text> bei {drill.rate}× Elixier.
          </Text>
        </Card>

        {answer === null ? (
          <View>
            <Text style={styles.question}>Wie viel Elixier hat er jetzt?</Text>
            <View style={styles.pad}>
              {Array.from({ length: 11 }, (_, n) => (
                <Pressable
                  key={n}
                  onPress={() => choose(n)}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} Elixier`}
                  style={({ pressed }) => [styles.padKey, n === 10 && styles.padKeyWide, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.padText}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <Card style={{ gap: 8 }}>
            <View style={styles.revealHead}>
              <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={28} color={ok ? colors.good : colors.bad} />
              <Text style={[styles.revealTitle, { color: ok ? colors.good : colors.bad }]}>
                {ok ? 'Richtig!' : `Richtig wäre ${grade?.expected}`}
              </Text>
            </View>
            <Steps drill={drill} />
            <Button label="Nächste Aufgabe" icon="arrow-forward" variant="primary" onPress={() => fresh(level)} />
          </Card>
        )}
        <Text style={styles.foot}>Merkhilfe: 1 Elixier alle {String(REGEN_SECONDS).replace('.', ',')} s, bei 2× alle 1,4 s.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Schrittweise Rechnung mit Zwischenständen. */
function Steps({ drill }: { drill: Drill }) {
  let elixir = drill.start;
  const lines: string[] = [`Start: ${elixir}`];
  for (const s of drill.steps) {
    if (s.waitBefore > 0) {
      const g = gain(s.waitBefore, drill.rate);
      lines.push(`${s.waitBefore} s · ${drill.rate} ÷ ${String(REGEN_SECONDS).replace('.', ',')} = +${fmt(g, 2)} → ${fmt(s.elixirBefore, 2)}`);
    }
    lines.push(`${card(s.card).name}: − ${s.cost} → ${fmt(s.elixirAfter, 2)}`);
    elixir = s.elixirAfter;
  }
  const g = gain(drill.finalWait, drill.rate);
  lines.push(`${drill.finalWait} s · ${drill.rate} ÷ ${String(REGEN_SECONDS).replace('.', ',')} = +${fmt(g, 2)}`);
  const capped = elixir + g > 10;
  lines.push(`Ergebnis: ${fmt(drill.actual, 2)}${capped ? ' (bei 10 gedeckelt)' : ''} → angezeigt ${Math.floor(drill.actual + 1e-9)}`);
  return (
    <View style={{ gap: 4 }}>
      {lines.map((l, i) => (
        <Text key={i} style={[styles.calc, i === lines.length - 1 && styles.calcLast]}>
          {l}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  score: { color: colors.accent, fontSize: 16, fontWeight: '800', minWidth: 60, textAlign: 'right' },
  page: { padding: 16, gap: 14, paddingBottom: 40 },
  hint: { color: colors.muted, fontSize: 13 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  big: { color: colors.text, fontSize: 24, fontWeight: '900' },
  step: { color: colors.text, fontSize: 15, flex: 1 },
  bold: { fontWeight: '900', color: colors.elixir },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  padKeyWide: { width: '38%', aspectRatio: undefined, height: 58 },
  padText: { color: colors.text, fontSize: 22, fontWeight: '900' },
  revealHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revealTitle: { fontSize: 20, fontWeight: '900', flex: 1 },
  calc: { color: colors.muted, fontSize: 14, fontVariant: ['tabular-nums'] },
  calcLast: { color: colors.text, fontWeight: '800', marginTop: 4 },
  foot: { color: colors.faint, fontSize: 12, textAlign: 'center' },
});
