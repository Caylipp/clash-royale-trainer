# Elixir Trainer

[Deutsche Version](README.de.md)

A mobile training app for Clash Royale players (Expo / React Native, TypeScript) with a Cloudflare Worker backend.

1. **Elixir Trainer**: a simulated opponent plays cards from a real meta deck. The game pauses at random moments and you estimate how much elixir the opponent has left. Your answer is scored on accuracy and reaction time.
2. **Random Deck**: rolls *playable* decks (win condition, spells, air defense, average elixir within a range), with card locking and shareable challenges.
3. **Deck Finder**: ranks meta decks against your card collection and levels and suggests replacements for missing cards.

## Engineering notes

- **Deterministic simulation**: each round is precomputed from a seed ([src/lib/elixir.ts](src/lib/elixir.ts)): elixir regeneration (1 per 2.8 s, 2×/3× in overtime), 4-card hand rotation, opponent behavior (reacts immediately, waits, or occasionally wastes elixir), special cards like Mirror and Elixir Collector. This makes rounds reproducible and testable.
- **Teaching mode**: explains elixir trading (opponent ≈ your elixir + your spending − their spending) and shows the calculation after every question.
- **API proxy**: the official API key is bound to fixed IPs and must not ship in the app. A Cloudflare Worker ([worker/](worker/)) forwards requests, aggregates top-player battle logs into live meta decks and caches them for 6 hours.
- **Quality**: TypeScript, ESLint, Jest unit tests and an end-to-end run in Chrome (`npm run e2e`).

```bash
npm install
npx expo start      # Expo Go or press w for web
npm run check       # typecheck, lint, unit tests
npm run e2e         # web export + automated browser run
```

## Legal

Unofficial fan project. This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: www.supercell.com/fan-content-policy. No original game assets are stored in this repository; the app icon is an original drawing.
