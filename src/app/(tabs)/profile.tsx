/** Profil: Spieler-Tag, API-Proxy, Trainingsverlauf, Einstellungen und Disclaimer. */

import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeckGrid } from '../../components/CardTile';
import { AppSwitch, Button, Card, ProgressBar, Row, SectionTitle, Stepper } from '../../components/ui';
import { fetchPlayer, isValidTag, normalizeTag, pingProxy } from '../../lib/api';
import { PRESETS } from '../../lib/trainerConfig';
import { useStore } from '../../state/store';
import { colors, radius } from '../../theme/colors';

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert('Bist du sicher?', message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Löschen', style: 'destructive', onPress: onYes },
  ]);
}

export default function ProfileScreen() {
  const { settings, updateSettings, player, setPlayer, history, clearHistory } = useStore();
  const [tag, setTag] = useState(settings.playerTag);
  const [proxy, setProxy] = useState(settings.proxyUrl);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    const normalized = normalizeTag(tag);
    const proxyUrl = proxy.trim();
    updateSettings({ playerTag: normalized, proxyUrl });
    setTag(normalized);
    if (!isValidTag(normalized)) {
      setStatus({ ok: false, text: 'Ungültiger Tag. Er steht im Spiel unter deinem Namen (z. B. #2PP).' });
      return;
    }
    if (!proxyUrl) {
      setStatus({ ok: false, text: 'Bitte zuerst die Proxy-URL eintragen (siehe README).' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const p = await fetchPlayer(proxyUrl, normalized);
      setPlayer(p);
      setStatus({ ok: true, text: `${p.name} geladen: ${p.cards.length} Karten.` });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : 'Laden fehlgeschlagen.' });
    } finally {
      setLoading(false);
    }
  };

  const test = async () => {
    const url = proxy.trim();
    updateSettings({ proxyUrl: url });
    const ok = url ? await pingProxy(url) : false;
    setStatus({ ok, text: ok ? 'Proxy erreichbar.' : 'Proxy nicht erreichbar.' });
  };

  const recent = history.slice(0, 20).reverse();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Profil</Text>

        <View>
          <SectionTitle>Clash-Royale-Konto</SectionTitle>
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>Spieler-Tag</Text>
            <TextInput
              value={tag}
              onChangeText={setTag}
              placeholder="#ABC123"
              placeholderTextColor={colors.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={styles.label}>Proxy-URL</Text>
            <TextInput
              value={proxy}
              onChangeText={setProxy}
              placeholder="https://dein-worker.workers.dev"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.input}
            />
            <View style={styles.actions}>
              <Button label="Profil laden" icon="download-outline" variant="primary" onPress={load} style={{ flex: 1 }} disabled={loading} />
              <Button label="Proxy testen" icon="pulse" onPress={test} style={{ flex: 1 }} />
            </View>
            {loading && <ActivityIndicator color={colors.accent} />}
            {status && <Text style={{ color: status.ok ? colors.good : colors.bad }}>{status.text}</Text>}
          </Card>
        </View>

        {player && (
          <Card style={{ gap: 10 }}>
            <View style={styles.playerHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.muted}>
                  {player.tag} · Level {player.expLevel} · 🏆 {player.trophies}
                </Text>
              </View>
              <Button icon="log-out-outline" variant="ghost" onPress={() => setPlayer(null)} accessibilityLabel="Profil entfernen" />
            </View>
            {player.currentDeck.length === 8 && (
              <>
                <Text style={styles.label}>Aktuelles Deck</Text>
                <DeckGrid cards={player.currentDeck} size="sm" />
              </>
            )}
          </Card>
        )}

        <View>
          <SectionTitle>Trainingsverlauf</SectionTitle>
          <Card style={{ gap: 10 }}>
            {recent.length === 0 ? (
              <Text style={styles.muted}>Noch keine Runden gespielt.</Text>
            ) : (
              <>
                <View style={styles.chart}>
                  {recent.map((r) => {
                    const ratio = r.maxScore ? r.score / r.maxScore : 0;
                    return (
                      <View key={r.at} style={styles.barWrap}>
                        <View
                          style={[
                            styles.bar,
                            { height: `${Math.max(4, ratio * 100)}%`, backgroundColor: ratio >= 0.75 ? colors.good : ratio >= 0.5 ? colors.accent : colors.bad },
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
                {history.slice(0, 5).map((r) => (
                  <View key={r.at} style={styles.histRow}>
                    <Text style={styles.histDate}>{new Date(r.at).toLocaleDateString('de-DE')}</Text>
                    <Text style={styles.histPreset}>{r.preset === 'custom' ? 'Eigene' : PRESETS[r.preset].label}</Text>
                    <View style={{ flex: 1 }}>
                      <ProgressBar value={r.maxScore ? r.score / r.maxScore : 0} />
                    </View>
                    <Text style={styles.histScore}>
                      {r.exact}/{r.questions}
                    </Text>
                  </View>
                ))}
                <Button label="Verlauf löschen" variant="ghost" icon="trash-outline" onPress={() => confirm('Gesamten Trainingsverlauf löschen?', clearHistory)} />
              </>
            )}
          </Card>
        </View>

        <View>
          <SectionTitle>Einstellungen</SectionTitle>
          <Card>
            <Row label="Tagesziel" hint="Runden pro Tag für deine Serie">
              <Stepper value={settings.dailyGoal} min={1} max={10} onChange={(v) => updateSettings({ dailyGoal: v })} />
            </Row>
            <Row label="Haptisches Feedback">
              <AppSwitch label="Haptik" value={settings.haptics} onChange={(v) => updateSettings({ haptics: v })} />
            </Row>
          </Card>
        </View>

        <Text style={styles.disclaimer}>
          This material is unofficial and is not endorsed by Supercell. For more information see Supercell&apos;s Fan
          Content Policy:{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://www.supercell.com/fan-content-policy')}>
            www.supercell.com/fan-content-policy
          </Text>
          .
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 16, gap: 18, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900' },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  actions: { flexDirection: 'row', gap: 8 },
  muted: { color: colors.muted },
  playerHead: { flexDirection: 'row', alignItems: 'center' },
  playerName: { color: colors.text, fontSize: 20, fontWeight: '900' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4 },
  barWrap: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 3, width: '100%' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  histDate: { color: colors.muted, fontSize: 12, width: 78 },
  histPreset: { color: colors.text, fontSize: 12, width: 92 },
  histScore: { color: colors.text, fontWeight: '700', width: 40, textAlign: 'right' },
  disclaimer: { color: colors.faint, fontSize: 11, lineHeight: 16 },
  link: { color: colors.muted, textDecorationLine: 'underline' },
});
