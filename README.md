# Clash Royale Trainer

Handy-App (Expo/React Native) mit drei Features:

1. **Elixier-Trainer** (USP): Ein simulierter Gegner spielt Karten aus. Zwischendurch hält das Spiel an und du schätzt, wie viel Elixier er gerade hat. Bewertet werden Abweichung und Reaktionszeit.
2. **Zufallsdeck**: Würfelt spielbare Decks (Win-Condition, Zauber, Luftabwehr, Ø-Elixier im Bereich) und bietet Karten fixieren, Challenge teilen und einen Direktlink ins Spiel.
3. **Deck-Finder**: Sortiert Meta-Decks nach deiner Sammlung und deinen Kartenleveln und schlägt Ersatzkarten für fehlende Karten vor.

Konzept und Bewertung: [concept.md](concept.md)

## Starten

```bash
npm install
npx expo start        # QR-Code mit Expo Go scannen, oder w für Web
npm test              # Unit-Tests der Logik (Simulation, Decks, API-Parsing)
npm run typecheck
npm run lint
```

Der Elixier-Trainer und das Zufallsdeck laufen komplett offline. Nur für Profil und Live-Meta braucht die App den Proxy.

## Elixier-Trainer

- Der Gegner startet mit 5 Elixier (max. 10) und regeneriert 1 Elixier pro 2,8 s, bei doppeltem/dreifachem Elixier schneller.
- **Match-Modus**: 0–2:00 einfach, 2:00–4:00 doppelt, danach dreifach.
- Der Gegner spielt ein Meta-Deck mit echter Kartenrotation (4 Handkarten). Er reagiert mal sofort, mal wartet er und lässt gelegentlich Elixier verfallen.
- Sonderfälle: **Spiegel** (kostet 1 mehr als die zuletzt gespielte Karte) und **Elixiersammler** (vereinfacht: +1 alle 9 s, 70 s Laufzeit).
- Bewertung: Richtig ist der abgerundete Wert (so zeigt ihn das Spiel an). Bei ≥ 0,8 Nachkomma zählt auch der nächste Wert. Exakt = 100 P, ±1 = 50 P, ±2 = 15 P. Ab 2 s Reaktionszeit sinken die Punkte bis auf die Hälfte bei 8 s.
- Nach jeder Frage wird der Rechenweg gezeigt (letzter Zug, Regeneration, Sammler, Deckelung).
- Ergebnis mit Rang und Share-Text für TikTok-Challenges.

Die Simulation wird pro Runde vorab deterministisch aus einem Seed berechnet ([src/lib/elixir.ts](src/lib/elixir.ts)).

## API-Proxy (Cloudflare Worker)

Der offizielle API-Key (developer.clashroyale.com) ist an feste IPs gebunden und gehört nicht in die App. Der Worker in [worker/](worker/) leitet Anfragen über den RoyaleAPI-Proxy weiter und aggregiert Top-Decks.

1. Auf developer.clashroyale.com einen Key anlegen und als IP **45.79.218.79** eintragen (RoyaleAPI-Proxy).
2. Worker deployen:
   ```bash
   cd worker
   npm install
   npx wrangler secret put CR_API_TOKEN
   npx wrangler deploy
   ```
3. Die Worker-URL in der App unter **Profil → Proxy-URL** eintragen und den Spieler-Tag laden.

Endpunkte: `/health`, `/players/:tag`, `/players/:tag/battlelog`, `/meta/decks` (Top-40-Spieler, Battle-Logs aggregiert, 6 h gecacht).

## Struktur

```
src/app/            Screens (Expo Router): Tabs Trainer, Zufallsdeck, Deck-Finder, Profil; train.tsx = laufende Runde
src/lib/            Reine Logik mit Tests: elixir, deckGen, deckFinder, api, trainerConfig, rating
src/data/           Kartendatenbank (IDs der offiziellen API) und kuratierte Meta-Decks
src/components/     UI-Bausteine, Kartenkacheln (ohne Supercell-Grafiken)
worker/             Cloudflare Worker als API-Proxy
```

## Bekannte Vereinfachungen

- Kartenkacheln statt Original-Artwork (offline, keine Asset-Rechte nötig).
- Neuere Karten ohne gesicherte API-ID haben keinen Deck-Link. Die Zuordnung aus der API läuft dann über den Namen.
- Die Stärke der kuratierten Decks ist geschätzt. Live-Decks bewerten Winrate und Nutzung der Top-Spieler.
- Elixiersammler-Werte und Elixier-Golem-Effekte sind vereinfacht bzw. nicht modelliert.
- Noch offen: echte Battle-Logs nachspielen (die API liefert keine Zeitstempel pro Karte).

## Rechtliches

Diese App ist kein offizielles Produkt von Supercell. Sie folgt der [Fan Content Policy](https://www.supercell.com/fan-content-policy): kostenlos nutzbar, Disclaimer in der App.
