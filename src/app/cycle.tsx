/** Übung „Karten-Zyklus“: Welche Karte kommt als nächste bzw. was hat der Gegner auf der Hand? Ohne Zeitdruck. */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardTile } from '../components/CardTile';
import { Button, Card, Segmented } from '../components/ui';
import { card } from '../data/cards';
import { createCycleTask, CYCLE_LEVELS, CycleLevel, cycleSteps, gradeCycle, HAND_SIZE, nextOf, CycleTask } from '../lib/cycle';
import { createRng, randomSeed, shuffle } from '../lib/random';
import { hapticResult } from '../platform/haptics';
import { useStore } from '../state/store';
import { colors } from '../theme/colors';

const newTask = (l: CycleLevel) => createCycleTask(createRng(randomSeed()), l);

export default function CycleScreen() {
  const { settings } = useStore();
  const [level, setLevel] = useState<CycleLevel>(1);
  const [task, setTask] = useState<CycleTask>(() => newTask(1));
  const [memorized, setMemorized] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ right: 0, total: 0 });

  const cfg = CYCLE_LEVELS[level];
  const need = task.question === 'next' ? 1 : HAND_SIZE;
  // Auswahlkarten in fester, aber zufälliger Reihenfolge, damit die Position nichts verrät.
  const options = useMemo(() => shuffle(createRng(task.start.join('').length * 7919 + task.plays.length + task.start[0].length), task.start), [task]);
  const hidden = !cfg.showOrder && memorized;

  const fresh = (l: CycleLevel) => {
    setTask(newTask(l));
    setMemorized(false);
    setPicked([]);
    setDone(false);
  };

  const toggle = (key: string) => {
    if (done) return;
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : need === 1 ? [key] : p.length < need ? [...p, key] : p));
  };

  const check = () => {
    const g = gradeCycle(task, picked);
    setDone(true);
    setStats((s) => ({ right: s.right + (g.correct ? 1 : 0), total: s.total + 1 }));
    if (settings.haptics) hapticResult(g.correct);
  };

  const grade = done ? gradeCycle(task, picked) : null;
  const expected = task.question === 'next' ? [nextOf(task.end)] : task.end.slice(0, HAND_SIZE);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Übung beenden" hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.muted} />
        </Pressable>
        <Text style={styles.title}>Karten-Zyklus</Text>
        <Text style={styles.score}>
          {stats.right}/{stats.total}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        <Segmented<CycleLevel>
          value={level}
          onChange={(l) => {
            setLevel(l);
            fresh(l);
          }}
          options={([1, 2, 3] as const).map((l) => ({ value: l, label: CYCLE_LEVELS[l].label }))}
        />
        <Text style={styles.hint}>{cfg.hint}. Kein Zeitdruck.</Text>

        <Card style={{ gap: 10 }}>
          <Text style={styles.label}>Zyklus des Gegners zu Beginn</Text>
          {hidden ? (
            <Text style={styles.step}>Die Reihenfolge ist jetzt verdeckt. Merke dir, was du gesehen hast.</Text>
          ) : (
            <CycleRow queue={task.start} />
          )}
          <Text style={styles.small}>Hand: die ersten vier. Danach folgt die Vorschaukarte, dann die übrigen drei.</Text>
        </Card>

        {!cfg.showOrder && !memorized ? (
          <Button label="Gemerkt, weiter" icon="eye-off-outline" variant="primary" onPress={() => setMemorized(true)} />
        ) : (
          <>
            <Card style={{ gap: 8 }}>
              <Text style={styles.label}>Er spielt nacheinander</Text>
              <View style={styles.playsRow}>
                {task.plays.map((k, i) => (
                  <View key={i} style={styles.playItem}>
                    <Text style={styles.small}>{i + 1}.</Text>
                    <CardTile cardKey={k} size="sm" />
                  </View>
                ))}
              </View>
            </Card>

            <Text style={styles.question}>
              {task.question === 'next' ? 'Welche Karte ist jetzt die Vorschaukarte?' : `Welche ${HAND_SIZE} Karten hat er jetzt auf der Hand?`}
            </Text>
            <View style={styles.grid}>
              {options.map((k) => {
                const sel = picked.includes(k);
                const mark = done ? (expected.includes(k) ? 'richtig' : sel ? 'falsch' : undefined) : sel ? 'gewählt' : undefined;
                return (
                  <CardTile
                    key={k}
                    cardKey={k}
                    size="sm"
                    dimmed={!sel && !done ? false : !sel && !expected.includes(k)}
                    badge={mark}
                    onPress={() => toggle(k)}
                  />
                );
              })}
            </View>

            {!done ? (
              <Button label={`Prüfen (${picked.length}/${need})`} icon="checkmark" variant="primary" disabled={picked.length !== need} onPress={check} />
            ) : (
              <Card style={{ gap: 8 }}>
                <View style={styles.revealHead}>
                  <Ionicons name={grade?.correct ? 'checkmark-circle' : 'close-circle'} size={28} color={grade?.correct ? colors.good : colors.bad} />
                  <Text style={[styles.revealTitle, { color: grade?.correct ? colors.good : colors.bad }]}>
                    {grade?.correct ? 'Richtig!' : 'Fast, hier der Ablauf'}
                  </Text>
                </View>
                {!grade?.correct && (
                  <Text style={styles.step}>
                    Gesucht: {expected.map((k) => card(k).name).join(', ')}
                  </Text>
                )}
                {cycleSteps(task).map((s, i) => (
                  <Text key={i} style={styles.calc}>
                    {i + 1}. {card(s.played).name} gespielt → Hand: {s.queue.slice(0, HAND_SIZE).map((k) => card(k).name).join(', ')} | Vorschau: {card(s.queue[HAND_SIZE]).name}
                  </Text>
                ))}
                <Button label="Nächste Aufgabe" icon="arrow-forward" variant="primary" onPress={() => fresh(level)} />
              </Card>
            )}
          </>
        )}
        <Text style={styles.foot}>Merkhilfe: Die gespielte Karte hängt immer ganz hinten im Zyklus an.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function CycleRow({ queue }: { queue: string[] }) {
  return (
    <View style={styles.cycleRow}>
      {queue.map((k, i) => (
        <View key={k} style={[styles.cycleItem, i === HAND_SIZE && styles.preview]}>
          <CardTile cardKey={k} size="sm" badge={i === HAND_SIZE ? 'Vorschau' : i < HAND_SIZE ? 'Hand' : undefined} />
        </View>
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
  step: { color: colors.text, fontSize: 15 },
  small: { color: colors.muted, fontSize: 12 },
  cycleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cycleItem: { borderRadius: 10 },
  preview: { opacity: 0.8 },
  playsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  playItem: { alignItems: 'center', gap: 4 },
  question: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  revealHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revealTitle: { fontSize: 20, fontWeight: '900', flex: 1 },
  calc: { color: colors.muted, fontSize: 13 },
  foot: { color: colors.faint, fontSize: 12, textAlign: 'center' },
});
