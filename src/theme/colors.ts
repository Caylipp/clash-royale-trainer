/** Dunkles Farbschema mit Gold- und Elixier-Akzent, angelehnt an die Arena. */
export const colors = {
  bg: '#0B1020',
  surface: '#141B30',
  surfaceHigh: '#1D2642',
  border: '#2A3558',
  text: '#EEF1FA',
  muted: '#8E98B8',
  faint: '#4A5578',
  accent: '#FFC83D',
  accentDim: 'rgba(255, 200, 61, 0.16)',
  elixir: '#E046F0',
  elixirDim: 'rgba(224, 70, 240, 0.18)',
  good: '#3DD68C',
  goodDim: 'rgba(61, 214, 140, 0.16)',
  bad: '#FF6369',
  badDim: 'rgba(255, 99, 105, 0.16)',
  warn: '#FF9F43',
} as const;

export const rarityColors = {
  common: '#7FA7D6',
  rare: '#F29D38',
  epic: '#B45CF0',
  legendary: '#4FE0CF',
  champion: '#FFD24A',
} as const;

export const radius = { sm: 8, md: 14, lg: 22 } as const;
