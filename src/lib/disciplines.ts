export const MAX_PROJECT_DISCIPLINES = 4;
export const MAX_PROJECT_CARD_DISCIPLINES = 3;

export function normalizeDisciplines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const discipline = String(item || '').trim();
    if (!discipline || seen.has(discipline)) continue;
    seen.add(discipline);
    normalized.push(discipline);
    if (normalized.length >= MAX_PROJECT_DISCIPLINES) break;
  }

  return normalized;
}
