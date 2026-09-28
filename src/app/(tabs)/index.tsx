/** Startseite des Elixier-Trainers: Schwierigkeit wählen und Runde starten. */

import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ElixirBar } from '../../components/CardTile';
import { AppSwitch, Button, Card, Row, SectionTitle, Segmented, Stepper } from '../../components/ui';
import { REGEN_SECONDS } from '../../lib/elixir';
import { applyPreset, Preset, PRESETS, SCHEDULE_LABEL, TrainerConfig } from '../../lib/trainerConfig';
import { useStore } from '../../state/store';
import { colors, radius } from '../../theme/colors';

const PRESET_KEYS = ['easy', 'normal', 'pro'] as const;

export default function TrainerHome() {
  const { settings, updateSettings, updateTrainer, history } = useStore();
  const cfg = settings.trainer;

  const choosePreset = (p: Preset) => {
    if (p === 'custom') updateTrainer({ preset: 'custom' });
    else updateSettings({ trainer: applyPreset(p) });
  };
  const custom = (patch: Partial<TrainerConfig>) => updateTrainer({ ...patch, preset: 'custom' });

  const best = history.reduce((m, r) => Math.max(m, r.maxScore ? r.score / r.maxScore : 0), 0);
  const recent = history.slice(0, 5);
  const recentAvg = recent.length ? recent.reduce((s, r) => s + r.score / r.maxScore, 0) / recent.length : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <View>
          <Text style={styles.title}>Elixier-Trainer</Text>
          <Text style={styles.subtitle}>Lerne, das Elixier deines Gegners mitzuzählen.</Text>
        </View>

        <Card style={{ gap: 8 }}>
          <Text style={styles.howTitle}>So funktioniert&apos;s</Text>
          <ElixirBar value={5} height={12} />
          <Text style={styles.how}>
            Der Gegner startet mit 5 Elixier (max. 10) und bekommt alle {String(REGEN_SECONDS).replace('.', ',')} s eins
            dazu, bei doppeltem Elixier doppelt so schnell. Jede gespielte Karte kostet ihn Elixier. Zwischendurch hält
            das Spiel an und du schätzt, wie viel er gerade hat.
          </Text>
        </Card>

        <View>
          <SectionTitle>Schwierigkeit</SectionTitle>
          <View style={{ gap: 8 }}>
            {PRESET_KEYS.map((p) => (
              <PresetCard
                key={p}
                active={cfg.preset === p}
                title={PRESETS[p].label}
                hint={PRESETS[p].hint}
                onPress={() => choosePreset(p)}
              />
            ))}
            <PresetCard
              active={cfg.preset === 'custom'}
              title="Eigene Einstellungen"
              hint="Alles selbst festlegen"
              onPress={() => choosePreset('custom')}
            />
          </View>
        </View>

        {cfg.preset === 'custom' && (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Elixier-Phase</Text>
            <Segmented
              value={cfg.schedule}
              onChange={(v) => custom({ schedule: v })}
              options={(['single', 'double', 'triple', 'match'] as const).map((v) => ({ value: v, label: SCHEDULE_LABEL[v] }))}
            />
            <Row label="Tempo" hint="Spielzeit im Verhältnis zur Echtzeit">
              <Stepper
                value={cfg.speed}
                min={0.5}
                max={2}
                step={0.25}
                format={(v) => `${v.toFixed(2).replace(/0$/, '').replace('.', ',')}×`}
                onChange={(v) => custom({ speed: v })}
              />
            </Row>
            <Row label="Fragen pro Runde">
              <Stepper value={cfg.questions} min={3} max={25} onChange={(v) => custom({ questions: v })} />
            </Row>
            <Row label="Kartenverlauf anzeigen" hint="Aus: Karten erscheinen nur kurz">
              <AppSwitch label="Kartenverlauf" value={cfg.showFeed} onChange={(v) => custom({ showFeed: v })} />
            </Row>
            <Row label="Spiegel im Gegnerdeck" hint="Kostet 1 mehr als die zuletzt gespielte Karte">
              <AppSwitch label="Spiegel" value={cfg.mirror} onChange={(v) => custom({ mirror: v })} />
            </Row>
            <Row label="Elixiersammler im Gegnerdeck" hint="Bringt dem Gegner alle 9 s +1 Elixier">
              <AppSwitch label="Elixiersammler" value={cfg.collector} onChange={(v) => custom({ collector: v })} />
            </Row>
          </Card>
        )}

        <Button label="Training starten" icon="play" variant="primary" onPress={() => router.push('/train')} style={styles.start} />

        {history.length > 0 && (
          <View>
            <SectionTitle>Dein Stand</SectionTitle>
            <View style={styles.stats}>
              <MiniStat label="Runden" value={String(history.length)} />
              <MiniStat label="Bestwert" value={`${Math.round(best * 100)} %`} />
              <MiniStat label="Ø letzte 5" value={`${Math.round(recentAvg * 100)} %`} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PresetCard({ active, title, hint, onPress }: { active: boolean; title: string; hint: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.preset, active && styles.presetActive, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.radio, active && styles.radioActive]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.presetTitle}>{title}</Text>
        <Text style={styles.presetHint}>{hint}</Text>
      </View>
    </Pressable>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 16, gap: 18, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 4 },
  howTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  how: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  preset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.faint },
  radioActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  presetTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  presetHint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  start: { paddingVertical: 16 },
  stats: { flexDirection: 'row', gap: 10 },
  miniStat: { flex: 1, alignItems: 'center' },
  miniValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  miniLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
