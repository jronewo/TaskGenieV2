import { AVATAR_PALETTE } from '../theme';

/** "Nguyen Van An" → "NA", "Sarah" → "SA", null → "?" */
export function getInitials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Stable gradient for a user — same name always yields the same colours. */
export function gradientFor(name: string | null | undefined): [string, string] {
  return AVATAR_PALETTE[hash(name ?? '') % AVATAR_PALETTE.length];
}
