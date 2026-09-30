# Offene Punkte (brauchen den Besitzer)

Stand 2026-09-30. Alles, was ohne Konten und Entscheidungen möglich war, ist umgesetzt.

## 1. API-Proxy live schalten
Ohne Proxy laufen Trainer, Zufallsdeck und die Archetyp-Decks. Profil, Kartenbilder und Live-Decks brauchen ihn.

1. developer.clashroyale.com → My Account → Create New Key, erlaubte IP `45.79.218.79`.
2. Key selbst als Secret setzen (nie in Chat oder Repo):
   ```bash
   cd worker && npx wrangler secret put CR_API_TOKEN
   npx wrangler deploy
   ```
3. Worker-URL in der App unter Profil → Proxy-URL eintragen, „Proxy testen“, dann Tag laden.
4. Danach prüfen: `/health`, `/cards` (Icons), `/players/%23TAG`, `/meta/decks`. Diese Pfade sind bisher nur mit Mocks getestet.

## 2. Supercell
- Schriftlich nachfragen, ob ein Trainings-Minispiel unter die Fan Content Policy fällt (Guide/Tool vs. neues Spiel).
- Keine Supercell-Marken in App-Name, Domain und Social-Konten („Elixier-Trainer“ ist unkritisch).

## 3. Veröffentlichung
- Apple-Developer-Account (99 €/Jahr), dann `eas build --platform ios --profile production` und `eas submit`.
- Datenschutzerklärung und Store-Texte (die App sammelt nichts, der Proxy sieht nur Spieler-Tags).
- Bis dahin: unsignierte IPA (`npm run ios:ipa`) über LiveContainer, per iCloud Drive aufs iPhone (nicht AirDrop).

## 4. Test auf dem Gerät
Geprüft sind Unit-Tests, ein automatischer Durchlauf im Browser (`npm run e2e`) und der iOS-Release-Build. Auf dem iPhone selbst noch nicht: Gefühl für Tempo und Bewertung, Haptik, Lesbarkeit.
