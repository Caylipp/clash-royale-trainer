/**
 * App-weiter Zustand: Einstellungen, Trainingsverlauf, geladenes Spielerprofil
 * und Live-Meta, dauerhaft gespeichert in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { MetaDeck } from '../data/metaDecks';
import type { PlayerProfile } from '../lib/api';
import { DEFAULT_TRAINER, TrainerConfig } from '../lib/trainerConfig';

export interface Settings {
  trainer: TrainerConfig;
  /** Basis-URL des eigenen API-Proxys (Cloudflare Worker), leer = offline. */
  proxyUrl: string;
  playerTag: string;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  trainer: DEFAULT_TRAINER,
  proxyUrl: '',
  playerTag: '',
  haptics: true,
};

export interface SessionResult {
  at: number;
  preset: TrainerConfig['preset'];
  score: number;
  maxScore: number;
  exact: number;
  questions: number;
  avgError: number;
  avgReactionMs: number;
}

export interface LiveMeta {
  decks: MetaDeck[];
  generatedAt: string;
  sampleBattles: number;
  fetchedAt: number;
}

interface Store {
  loaded: boolean;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  updateTrainer: (patch: Partial<TrainerConfig>) => void;
  history: SessionResult[];
  addResult: (r: SessionResult) => void;
  clearHistory: () => void;
  player: PlayerProfile | null;
  setPlayer: (p: PlayerProfile | null) => void;
  liveMeta: LiveMeta | null;
  setLiveMeta: (m: LiveMeta | null) => void;
}

const KEY = 'cr.state.v1';
const MAX_HISTORY = 100;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<SessionResult[]>([]);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [liveMeta, setLiveMeta] = useState<LiveMeta | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const s = JSON.parse(raw);
          setSettings({
            ...DEFAULT_SETTINGS,
            ...s.settings,
            trainer: { ...DEFAULT_TRAINER, ...s.settings?.trainer },
          });
          setHistory(Array.isArray(s.history) ? s.history : []);
          setPlayer(s.player ?? null);
          setLiveMeta(s.liveMeta ?? null);
        }
      } catch (e) {
        console.warn('Gespeicherter Zustand konnte nicht geladen werden', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ settings, history, player, liveMeta })).catch(() => {});
  }, [loaded, settings, history, player, liveMeta]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateTrainer = useCallback((patch: Partial<TrainerConfig>) => {
    setSettings((prev) => ({ ...prev, trainer: { ...prev.trainer, ...patch } }));
  }, []);

  const addResult = useCallback((r: SessionResult) => {
    setHistory((prev) => [r, ...prev].slice(0, MAX_HISTORY));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const value = useMemo(
    () => ({
      loaded,
      settings,
      updateSettings,
      updateTrainer,
      history,
      addResult,
      clearHistory,
      player,
      setPlayer,
      liveMeta,
      setLiveMeta,
    }),
    [loaded, settings, updateSettings, updateTrainer, history, addResult, clearHistory, player, liveMeta],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore muss innerhalb von StoreProvider verwendet werden');
  return store;
}
