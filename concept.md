# Konzept: Clash Royale Trainer

## Idee
Handy-App mit drei Features:
1. **Elixier-Counter-Trainer**: Man lernt, das Elixier des Gegners mitzuzählen.
2. **Best-Deck-Finder**: Zeigt starke Decks, passend zu den eigenen Karten und Levels.
3. **Zufallsdeck**: Erzeugt ein spielbares Zufallsdeck.

Die Werbung soll über TikTok laufen.

## Bewertung
| Kriterium | Einschätzung |
|---|---|
| Machbarkeit | Hoch. Die offizielle Clash Royale API (developer.clashroyale.com) liefert Karten, Spielerprofile und Battle-Logs. |
| Aufwand MVP | Gering bis mittel (2–4 Wochen) |
| Konkurrenz | Hoch bei Decks (RoyaleAPI, DeckShop, StatsRoyale). Beim Elixier-Training gibt es kaum etwas. |
| Differenzierung | Der Elixier-Trainer ist das Alleinstellungsmerkmal. Deck-Finder und Zufallsdeck sind Beiwerk. |
| Monetarisierung | Werbung oder Premium, eher klein. Supercells Fan Content Policy beachten: kein Paywall-Zwang für Spielinhalte, Disclaimer nötig. |
| Marketing | Passt sehr gut zu TikTok: kurze „Kannst du das Elixier zählen?“-Challenges, dazu Zufallsdeck-Challenges. |

**Fazit:** Gutes Einstiegsprojekt mit klarem USP und einem natürlichen Marketingkanal. Der Umsatz ist begrenzt, das Projekt eignet sich aber gut zum Lernen und für Reichweite.

## Umsetzungsideen
- **Elixier-Trainer**
  - Man sieht eine simulierte Sequenz von gegnerischen Karten (Icon und Zeit), während das Elixier im Hintergrund regeneriert (1 Elixier pro 2,8 s, bei doppeltem und dreifachem Elixier schneller).
  - Der Nutzer tippt, wie viel Elixier der Gegner gerade hat. Bewertet werden Abweichung und Reaktionszeit.
  - Schwierigkeitsstufen: Geschwindigkeit, Phase mit doppeltem Elixier, Spiegel- und Elixiersammler-Sonderfälle.
  - Später auch echte Battle-Logs aus der API nachspielen.
- **Deck-Finder**: Nutzer-Tag eingeben, Karten und Levels per API laden und mit Meta-Decks abgleichen (Top-Ladder-Decks aus Battle-Logs der Top-Spieler aggregieren).
- **Zufallsdeck**: Regeln wie „mindestens 1 Win-Condition, 1 Zauber, 1 Luftabwehr, Ø-Elixier zwischen 2,8 und 4,2“ einhalten, damit es spielbar bleibt.
- **Tech**: Flutter oder React Native (Expo), dazu ein kleines Backend (Supabase oder Cloudflare Worker) als API-Proxy, weil der API-Key an feste IPs gebunden ist.
- **MVP**: nur der Elixier-Trainer offline, ohne API. Danach Zufallsdeck, dann Deck-Finder.
