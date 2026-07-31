export const colors = {
  bg: '#030C1A',
  card: '#0B1729',
  cardAlt: '#111E35',
  blue: '#2962FF',
  purple: '#7C4DFF',
  purpleLight: '#A78BFA',
  green: '#10B981',
  red: '#EF4444',
  yellow: '#F59E0B',
  cyan: '#00BCD4',
  foreground: '#E2EAF7',
  muted: '#5D7EA6',
  border: 'rgba(255,255,255,0.07)',
  white: '#FFFFFF',
};

/**
 * Avatar colours are picked from this palette by hashing the user's name, so
 * every real account gets a stable gradient without a hand-maintained map.
 */
export const AVATAR_PALETTE: [string, string][] = [
  ['#2962FF', '#00BCD4'],
  ['#FF6F00', '#FFC107'],
  ['#00897B', '#26C6DA'],
  ['#E91E63', '#FF5252'],
  ['#7C4DFF', '#9C27B0'],
  ['#00897B', '#66BB6A'],
  ['#3949AB', '#5C6BC0'],
  ['#D81B60', '#8E24AA'],
];

export const AVATAR_GRADIENTS: Record<string, [string, string]> = {
  SC: AVATAR_PALETTE[0],
  MJ: AVATAR_PALETTE[1],
  AR: AVATAR_PALETTE[2],
  ED: AVATAR_PALETTE[3],
  JS: AVATAR_PALETTE[4],
  LW: AVATAR_PALETTE[5],
};
