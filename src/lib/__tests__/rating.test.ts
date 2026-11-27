import { deckShareText, rankFor, trainerShareText } from '../rating';

describe('rankFor', () => {
  it('trifft die Stufengrenzen genau', () => {
    expect(rankFor(1).title).toBe('Elixier-Genie');
    expect(rankFor(0.9).title).toBe('Elixier-Genie');
    expect(rankFor(0.89).title).toBe('Top-Ladder-Niveau');
    expect(rankFor(0.75).title).toBe('Top-Ladder-Niveau');
    expect(rankFor(0.55).title).toBe('Solider Zähler');
    expect(rankFor(0.35).title).toBe('Auf dem Weg');
    expect(rankFor(0.34).title).toBe('Frischling');
    expect(rankFor(0).title).toBe('Frischling');
  });
});

describe('trainerShareText', () => {
  it('enthält Punkte, Treffer, Preset und Rang', () => {
    const t = trainerShareText(90, 100, 8, 10, 'Normal');
    expect(t).toContain('90/100 Punkte');
    expect(t).toContain('(Normal)');
    expect(t).toContain('8/10 Mal');
    expect(t).toContain('Elixier-Genie');
  });

  it('teilt nicht durch 0 bei maxScore 0', () => {
    expect(trainerShareText(0, 0, 0, 0, 'X')).toContain('Frischling');
  });
});

describe('deckShareText', () => {
  it('listet Karten, Durchschnitt auf eine Nachkommastelle und optional den Link', () => {
    const base = deckShareText(['Ritter', 'Pekka'], 3.75, null);
    expect(base).toContain('Ritter · Pekka');
    expect(base).toContain('Ø 3.8 Elixier');
    expect(base).not.toContain('http');
    expect(deckShareText(['Ritter'], 4, 'https://x.example/d')).toContain('\nhttps://x.example/d\n');
  });
});
