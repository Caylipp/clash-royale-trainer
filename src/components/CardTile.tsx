/**
 * Kartendarstellung ohne Originalgrafiken: Seltenheitsfarbe, Kurzname und
 * Elixierkosten. So bleibt die App offline und frei von Supercell-Assets.
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { card } from '../data/cards';
import { useStore } from '../state/store';
import { colors, radius, rarityColors } from '../theme/colors';

const SIZES = {
  sm: { w: 58, h: 72, name: 10, drop: 18, dropFont: 11 },
  md: { w: 74, h: 92, name: 11, drop: 22, dropFont: 13 },
  lg: { w: 120, h: 150, name: 16, drop: 34, dropFont: 19 },
} as const;

/** Kurzname: Sonderzeichen raus, lange Namen auf zwei Zeilen verteilt. */
function shortName(name: string): string {
  return name.replace('P.E.K.K.A', 'PEKKA').replace('The ', '');
}

export function ElixirDrop({ value, size = 22, fontSize = 13 }: { value: number | string; size?: number; fontSize?: number }) {
  return (
    <View style={[styles.drop, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.dropText, { fontSize }]}>{value}</Text>
    </View>
  );
}

export function CardTile({
  cardKey,
  size = 'md',
  level,
  locked,
  dimmed,
  badge,
  costLabel,
  onPress,
}: {
  cardKey: string;
  size?: keyof typeof SIZES;
  level?: number;
  locked?: boolean;
  dimmed?: boolean;
  badge?: string;
  /** Überschreibt die angezeigten Kosten (z. B. „?“ beim Spiegel). */
  costLabel?: string;
  onPress?: () => void;
}) {
  const c = card(cardKey);
  const s = SIZES[size];
  const { cardIcons } = useStore();
  const [failed, setFailed] = useState(false);
  const iconUrl = failed ? undefined : cardIcons[cardKey];
  const tint = rarityColors[c.rarity];
  const body = (
    <View
      style={[
        styles.tile,
        { width: s.w, height: s.h, borderColor: tint, backgroundColor: `${tint}22` },
        dimmed && { opacity: 0.35 },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: tint }]} />
      {iconUrl ? (
        <Image
          source={{ uri: iconUrl }}
          style={styles.icon}
          resizeMode="contain"
          accessibilityLabel={c.name}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.name, { fontSize: s.name }]} numberOfLines={3} adjustsFontSizeToFit>
          {shortName(c.name)}
        </Text>
      )}
      {level !== undefined && level > 0 && (
        <Text style={[styles.level, { fontSize: s.name - 1 }]}>Lvl {level}</Text>
      )}
      <View style={styles.dropPos}>
        <ElixirDrop value={costLabel ?? (c.key === 'mirror' ? '+1' : c.elixir)} size={s.drop} fontSize={s.dropFont} />
      </View>
      {locked && (
        <View style={styles.lock}>
          <Ionicons name="lock-closed" size={12} color={colors.bg} />
        </View>
      )}
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${c.name}, ${c.elixir} Elixier${locked ? ', fixiert' : ''}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      {body}
    </Pressable>
  );
}

export function DeckGrid({
  cards,
  size = 'md',
  levels,
  locked,
  highlight,
  onPressCard,
}: {
  cards: string[];
  size?: keyof typeof SIZES;
  levels?: Record<string, number>;
  locked?: string[];
  /** Karten, die markiert werden (z. B. Ersatzkarten). */
  highlight?: Record<string, string>;
  onPressCard?: (key: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {cards.map((k) => (
        <CardTile
          key={k}
          cardKey={k}
          size={size}
          level={levels?.[k]}
          locked={locked?.includes(k)}
          badge={highlight?.[k]}
          onPress={onPressCard ? () => onPressCard(k) : undefined}
        />
      ))}
    </View>
  );
}

/** Elixierleiste mit 10 Segmenten, auch für gebrochene Werte. */
export function ElixirBar({ value, height = 18 }: { value: number; height?: number }) {
  return (
    <View style={styles.bar}>
      {Array.from({ length: 10 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <View key={i} style={[styles.segment, { height }]}>
            <View style={{ width: `${fill * 100}%`, height: '100%', backgroundColor: colors.elixir }} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingTop: 8,
    overflow: 'hidden',
  },
  icon: { position: 'absolute', top: 4, left: 0, right: 0, bottom: 0 },
  stripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  name: { color: colors.text, fontWeight: '800', textAlign: 'center' },
  level: { color: colors.muted, fontWeight: '700', marginTop: 2 },
  dropPos: { position: 'absolute', top: 5, left: 4 },
  drop: {
    backgroundColor: colors.elixir,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff6',
  },
  dropText: { color: '#fff', fontWeight: '900' },
  lock: {
    position: 'absolute',
    top: 5,
    right: 4,
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: 2,
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.warn,
    paddingVertical: 1,
  },
  badgeText: { color: colors.bg, fontSize: 9, fontWeight: '800', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  bar: { flexDirection: 'row', gap: 3, width: '100%' },
  segment: { flex: 1, backgroundColor: colors.surfaceHigh, borderRadius: 3, overflow: 'hidden' },
});
