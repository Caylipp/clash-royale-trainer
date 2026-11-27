/** Trainingsstatistik: Verlauf der letzten 14 Tage, Trend und Kennzahlen. */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, SectionTitle } from '../components/ui';
import { dailyStats, byPreset, summarize, trendMessage } from '../lib/stats';
import { PRESETS } from '../lib/trainerConfig';
import { useStore } from '../state/store';
import { colors } from '../theme/colors';

const pct = (r: number) => `${Math.round(r * 100)} %`;
const dec = (n: number, d = 1) => n.toFixed(d).replace('.', ',');
const BAR_H = 90;

export default function StatsScreen() {
  const { history } = useStore();
  const [now] = useState(() => Date.now());
  const sum = summarize(history);
  const days = dailyStats(history, now, 14);
  const presets = byPreset(history);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Statistik schließen" hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.muted} />
        </Pressable>
        <Text style={styles.title}>Statistik</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        <Card style={{ gap: 6 }}>
          <Text style={styles.trend}>{trendMessage(sum)}</Text>
          {history.length === 0 && <Text style={styles.small}>Spiele eine Runde im Trainer, dann erscheint hier dein Verlauf.</Text>}
        </Card>

        {history.length > 0 && (
          <>
            <View>
              <SectionTitle>Letzte 14 Tage (Ø Punkte je Tag)</SectionTitle>
              <Card>
                <View style={styles.chart} accessibilityLabel="Säulendiagramm der Tagesergebnisse">
                  {days.map((d) => (
                    <View key={d.day} style={styles.col}>
                      <View style={styles.barBox}>
                        {d.rounds > 0 ? (
                          <View style={[styles.bar, { height: Math.max(4, d.ratio * BAR_H) }]} />
                        ) : (
                          <View style={styles.dot} />
                        )}
                      </View>
                      <Text style={styles.count}>{d.rounds > 0 ? d.rounds : ''}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.small}>Zahl unter der Säule = Runden an dem Tag. Punkt = kein Training.</Text>
              </Card>
            </View>

            <View>
              <SectionTitle>Kennzahlen</SectionTitle>
              <View style={styles.grid}>
                <Stat label="Runden" value={String(sum.rounds)} />
                <Stat label="Fragen" value={String(sum.questions)} />
                <Stat label="Ø Punkte" value={pct(sum.avgRatio)} />
                <Stat label="Bestwert" value={pct(sum.bestRatio)} />
                <Stat label="Exakt gezählt" value={pct(sum.exactRate)} />
                <Stat label="Ø Abweichung" value={dec(sum.avgError)} />
                <Stat label="Ø Reaktion" value={`${dec(sum.avgReactionMs / 1000)} s`} />
              </View>
            </View>

            <View>
              <SectionTitle>Nach Stufe</SectionTitle>
              <Card style={{ gap: 8 }}>
                {presets.map((p) => (
                  <View key={p.preset} style={styles.presetRow}>
                    <Text style={styles.presetName}>{p.preset in PRESETS ? PRESETS[p.preset as keyof typeof PRESETS].label : 'Eigene Einstellungen'}</Text>
                    <Text style={styles.small}>{p.rounds} Runden</Text>
                    <Text style={styles.presetVal}>{pct(p.ratio)}</Text>
                  </View>
                ))}
              </Card>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.small}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  page: { padding: 16, gap: 18, paddingBottom: 40 },
  trend: { color: colors.text, fontSize: 16, fontWeight: '700' },
  small: { color: colors.muted, fontSize: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 8 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  barBox: { height: BAR_H, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '70%', backgroundColor: colors.accent, borderRadius: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.faint },
  count: { color: colors.muted, fontSize: 10, height: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '47%', alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  presetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  presetName: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  presetVal: { color: colors.accent, fontSize: 15, fontWeight: '800', minWidth: 52, textAlign: 'right' },
});
