/** Deck-Finder: Meta-Decks nach eigener Sammlung und Kartenleveln sortiert. */

import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeckGrid } from '../../components/CardTile';
import { Button, Card, Segmented } from '../../components/ui';
import { card } from '../../data/cards';
import { META_DECKS } from '../../data/metaDecks';
import { fetchMeta, playerCollection } from '../../lib/api';
import { DeckMatch, findBestDecks } from '../../lib/deckFinder';
import { averageElixir, deckLink } from '../../lib/deckGen';
import { useStore } from '../../state/store';
import { colors } from '../../theme/colors';

type Source = 'curated' | 'live';

export default function DeckFinderScreen() {
  const { player, settings, liveMeta, setLiveMeta } = useStore();
  const [source, setSource] = useState<Source>(liveMeta ? 'live' : 'curated');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const collection = useMemo(() => playerCollection(player), [player]);

  const decks = source === 'live' && liveMeta ? liveMeta.decks : META_DECKS;
  const matches = useMemo(() => findBestDecks(decks, collection, 15), [decks, collection]);

  const loadLive = async () => {
    if (!settings.proxyUrl) {
      setError('Für Live-Decks im Tab „Profil“ eine Proxy-URL eintragen.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { decks: live, raw } = await fetchMeta(settings.proxyUrl);
      if (!live.length) throw new Error('Keine Decks erhalten.');
      setLiveMeta({ decks: live, generatedAt: raw.generatedAt, sampleBattles: raw.sampleBattles, fetchedAt: Date.now() });
      setSource('live');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <View>
          <Text style={styles.title}>Deck-Finder</Text>
          <Text style={styles.subtitle}>
            {player
              ? `Passend zu ${player.name}: ${collection.size} Karten berücksichtigt.`
              : 'Ohne Profil nach Stärke sortiert. Lade dein Profil im Tab „Profil“.'}
          </Text>
        </View>

        <Segmented<Source>
          value={source}
          onChange={(v) => (v === 'live' && !liveMeta ? loadLive() : setSource(v))}
          options={[
            { value: 'curated', label: 'Archetypen (offline)' },
            { value: 'live', label: 'Top-Spieler (live)' },
          ]}
        />
        {source === 'live' && liveMeta && (
          <View style={styles.liveRow}>
            <Text style={styles.liveInfo}>
              {liveMeta.sampleBattles} Matches · Stand {new Date(liveMeta.generatedAt).toLocaleString('de-DE')}
            </Text>
            <Button label="Aktualisieren" icon="refresh" variant="ghost" onPress={loadLive} />
          </View>
        )}
        {loading && <ActivityIndicator color={colors.accent} />}
        {error && <Text style={styles.error}>{error}</Text>}

        {matches.map((m, i) => (
          <DeckCard key={`${m.deck.name}-${i}`} match={m} rank={i + 1} hasCollection={collection.size > 0} levels={collection} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function DeckCard({
  match,
  rank,
  hasCollection,
  levels,
}: {
  match: DeckMatch;
  rank: number;
  hasCollection: boolean;
  levels: Map<string, { level: number }>;
}) {
  const [copied, setCopied] = useState(false);
  const link = deckLink(match.cards);
  const highlight = Object.fromEntries(
    match.substitutions.filter((s) => s.replacement).map((s) => [s.replacement!, 'Ersatz']),
  );
  const levelMap = hasCollection ? Object.fromEntries(match.cards.map((k) => [k, levels.get(k)?.level ?? 0])) : undefined;

  const copy = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    setCopied(true);
  };

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.cardHead}>
        <Text style={styles.rank}>#{rank}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.deckName}>{match.deck.name}</Text>
          <Text style={styles.deckMeta}>
            {match.deck.archetype} · Ø {averageElixir(match.cards).toFixed(1).replace('.', ',')} Elixier ·{' '}
            {'★'.repeat(match.deck.strength)}
            {'☆'.repeat(5 - match.deck.strength)}
          </Text>
        </View>
      </View>
      <DeckGrid cards={match.cards} size="sm" levels={levelMap} highlight={highlight} />
      {hasCollection && (
        <Text style={styles.deckMeta}>
          {match.ownedCount}/8 Karten vorhanden · Ø Level {match.avgLevel.toFixed(1).replace('.', ',')}
        </Text>
      )}
      {match.substitutions.map((s) => (
        <Text key={s.missing} style={[styles.sub, !s.replacement && { color: colors.bad }]}>
          {s.replacement
            ? `Fehlt: ${card(s.missing).name} → ersetzt durch ${card(s.replacement).name}`
            : `Fehlt: ${card(s.missing).name} (kein passender Ersatz)`}
        </Text>
      ))}
      <View style={styles.actions}>
        <Button label="Im Spiel öffnen" icon="open-outline" onPress={() => link && Linking.openURL(link)} disabled={!link} style={{ flex: 1 }} />
        <Button label={copied ? 'Kopiert' : 'Link'} icon="copy-outline" onPress={copy} disabled={!link} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 16, gap: 14, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveInfo: { color: colors.muted, fontSize: 12, flex: 1 },
  error: { color: colors.bad },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { color: colors.accent, fontSize: 20, fontWeight: '900', width: 38 },
  deckName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  deckMeta: { color: colors.muted, fontSize: 13 },
  sub: { color: colors.warn, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
});
