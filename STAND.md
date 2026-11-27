# Stand: Elixier-Trainer

Stand 2026-11-28.

## Was funktioniert
- Elixier-Trainer (Seed-Simulation, Match-/Doppel-/Dreifach-Phasen, Spiegel, Sammler, Lernhilfe), Serie und Tagesziel.
- Übungsmodus „Ein Zug“ mit Rechenweg.
- NEU: Übung „Karten-Zyklus“ (`src/app/cycle.tsx`, `src/lib/cycle.ts`): 3 Stufen, ohne Zeitdruck, deterministisch per Seed.
- NEU: Statistik mit Verlauf (`src/app/stats.tsx`, `src/lib/stats.ts`): 14-Tage-Säulen, Kennzahlen, Trend, Auswertung nach Stufe. Zugang über „Dein Stand“ auf dem Trainer-Tab.
- Zufallsdeck, Deck-Finder mit Meta-Decks (offline kuratiert), Worker-Code für den Proxy.
- `npm run check` grün (Typecheck, Lint, 62 Tests). Nichts davon braucht die Live-API.

## Nächste Schritte
- Sobald der API-Key da ist: Worker deployen, Pfade `/health`, `/cards`, `/players/:tag`, `/meta/decks` gegen die echte API prüfen (bisher nur Mocks).
- Auf dem iPhone testen: Tempo und Bewertung, Lesbarkeit des neuen Zyklus-Bildschirms und des Diagramms (nur Unit-Tests, kein Gerät/Simulator in dieser Sitzung).
- Optional: tägliche Herausforderung mit festem Tages-Seed, Zyklus-Ergebnisse in die Statistik aufnehmen, Elixier-Trade-Quiz.
- Ältere Emoji-Reste (Serie-Anzeige, Rang-Texte) durch schlichte Linien-Icons ersetzen.

## Offene Fragen an Philipp
- Supercell-API-Key: schon eingetroffen? Ohne ihn bleiben Profil, Kartenbilder und Live-Meta aus.
- Gerätetest: Kannst du die neuen Übungen auf dem iPhone ausprobieren (Stufe 3 des Zyklus eher zu schwer oder passend)?
- Soll die Statistik künftig auch Übungsmodus und Zyklus-Treffer zählen?
- Weitere offene Punkte (Supercell-Rückfrage, Apple): `docs/OFFEN.md`.
