/** Zufallsdeck: spielbares Deck würfeln, Karten fixieren, teilen oder im Spiel öffnen. */

import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeckGrid } from '../../components/CardTile';
import { AppSwitch, Button, Card, Row, SectionTitle, Stepper } from '../../components/ui';
import { card } from '../../data/cards';
import { playerCollection } from '../../lib/api';
import { averageElixir, checkDeck, cycleCost, deckLink, DEFAULT_RULES, DeckRules, generateDeck } from '../../lib/deckGen';
import { createRng, randomSeed } from '../../lib/random';
import { deckShareText } from '../../lib/rating';
import { hapticTap } from '../../platform/haptics';
import { useStore } from '../../state/store';
import { colors } from '../../theme/colors';

function fmt(n: number) {
  return n.toFixed(1).replace('.', ',');
}

export default function RandomDeckScreen() {
  const { player, settings } = useStore();
  const collection = useMemo(() => playerCollection(player), [player]);
  const [rules, setRules] = useState<DeckRules>(DEFAULT_RULES);
  const [ownOnly, setOwnOnly] = useState(false);
  const [locked, setLocked] = useState<string[]>([]);
  const [deck, setDeck] = useState<string[]>(() => generateDeck(createRng(randomSeed())) ?? []);
  const [message, setMessage] = useState<string | null>(null);

  const effectiveRules: DeckRules = {
    ...rules,
    locked,
    pool: ownOnly && collection.size ? [...collection.keys()] : undefined,
  };

  const reroll = () => {
    const next = generateDeck(createRng(randomSeed()), effectiveRules);
    if (next) {
      setDeck(next);
      setMessage(null);
      if (settings.haptics) hapticTap();
    } else {
      setMessage('Mit diesen Regeln (und fixierten Karten) ließ sich kein spielbares Deck finden. Lockere die Regeln.');
    }
  };

  const toggleLock = (k: string) =>
    setLocked((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const link = deckLink(deck);
  const avg = averageElixir(deck);
  const checks = checkDeck(deck, rules);
  const levels = collection.size
    ? Object.fromEntries(deck.map((k) => [k, collection.get(k)?.level ?? 0]))
    : undefined;

  const share = () =>
    Share.share({ message: deckShareText(deck.map((k) => card(k).name), avg, link) }).catch(() => {});

  const copy = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    setMessage('Deck-Link kopiert.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <View>
          <Text style={styles.title}>Zufallsdeck</Text>
          <Text style={styles.subtitle}>Tippe auf eine Karte, um sie beim Neuwürfeln zu behalten.</Text>
        </View>

        <DeckGrid cards={deck} locked={locked} levels={levels} onPressCard={toggleLock} />

        <View style={styles.statsRow}>
          <Text style={styles.stat}>
            Ø <Text style={styles.statStrong}>{fmt(avg)}</Text> Elixier
          </Text>
          <Text style={styles.stat}>
            Cycle <Text style={styles.statStrong}>{cycleCost(deck)}</Text>
          </Text>
        </View>

        <Button label="Neu würfeln" icon="dice" variant="primary" onPress={reroll} style={{ paddingVertical: 14 }} />
        {message && <Text style={styles.message}>{message}</Text>}

        <View style={styles.actions}>
          <Button label="Im Spiel öffnen" icon="open-outline" onPress={() => link && Linking.openURL(link)} disabled={!link} style={{ flex: 1 }} />
          <Button label="Link" icon="copy-outline" onPress={copy} disabled={!link} style={{ flex: 1 }} />
          <Button label="Challenge" icon="share-social" onPress={share} style={{ flex: 1 }} />
        </View>

        <View>
          <SectionTitle>Spielbarkeit</SectionTitle>
          <Card style={{ gap: 6 }}>
            {checks.map((c) => (
              <Text key={c.label} style={[styles.check, { color: c.ok ? colors.good : colors.bad }]}>
                {c.ok ? '✓' : '✗'} {c.label}
              </Text>
            ))}
          </Card>
        </View>

        <View>
          <SectionTitle>Regeln</SectionTitle>
          <Card style={{ gap: 6 }}>
            <Row label="Min. Ø-Elixier">
              <Stepper
                value={rules.minAvg}
                min={2}
                max={rules.maxAvg - 0.2}
                step={0.1}
                format={fmt}
                onChange={(v) => setRules({ ...rules, minAvg: v })}
              />
            </Row>
            <Row label="Max. Ø-Elixier">
              <Stepper
                value={rules.maxAvg}
                min={rules.minAvg + 0.2}
                max={6}
                step={0.1}
                format={fmt}
                onChange={(v) => setRules({ ...rules, maxAvg: v })}
              />
            </Row>
            <Row label="Champions erlauben" hint="Höchstens einer pro Deck">
              <AppSwitch label="Champions" value={rules.allowChampion} onChange={(v) => setRules({ ...rules, allowChampion: v })} />
            </Row>
            <Row
              label="Nur meine Karten"
              hint={collection.size ? `${collection.size} Karten aus deinem Profil` : 'Profil im Tab „Profil“ laden'}
            >
              <AppSwitch label="Nur meine Karten" value={ownOnly && collection.size > 0} onChange={setOwnOnly} />
            </Row>
            {locked.length > 0 && <Button label={`${locked.length} fixierte Karten lösen`} variant="ghost" onPress={() => setLocked([])} />}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 16, gap: 16, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  stat: { color: colors.muted, fontSize: 15 },
  statStrong: { color: colors.elixir, fontWeight: '900', fontSize: 18 },
  message: { color: colors.warn, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  check: { fontSize: 14, fontWeight: '600' },
});
