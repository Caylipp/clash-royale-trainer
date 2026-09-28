/** Einstufung und Share-Texte für Ergebnisse (reine Logik). */

export function rankFor(ratio: number): { title: string; emoji: string } {
  if (ratio >= 0.9) return { title: 'Elixier-Genie', emoji: '🧠' };
  if (ratio >= 0.75) return { title: 'Top-Ladder-Niveau', emoji: '🏆' };
  if (ratio >= 0.55) return { title: 'Solider Zähler', emoji: '⚔️' };
  if (ratio >= 0.35) return { title: 'Auf dem Weg', emoji: '💪' };
  return { title: 'Frischling', emoji: '🐣' };
}

export function trainerShareText(score: number, maxScore: number, exact: number, questions: number, presetLabel: string): string {
  const ratio = maxScore ? score / maxScore : 0;
  const rank = rankFor(ratio);
  return (
    `${rank.emoji} ${score}/${maxScore} Punkte im Elixier-Trainer (${presetLabel})\n` +
    `${exact}/${questions} Mal das Gegner-Elixier exakt gezählt – ${rank.title}!\n` +
    `Kannst du das Elixier zählen? #ClashRoyale #ElixirChallenge`
  );
}

export function deckShareText(deckNames: string[], avg: number, link: string | null): string {
  return (
    `🎲 Zufallsdeck-Challenge: Gewinn 3 Matches mit diesem Deck!\n` +
    `${deckNames.join(' · ')}\nØ ${avg.toFixed(1)} Elixier` +
    (link ? `\n${link}` : '') +
    `\n#ClashRoyale #RandomDeckChallenge`
  );
}
