const BASE_URL = import.meta.env.BASE_URL || '/';

function isAbsoluteUrl(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value) || value.startsWith('//');
}

export function resolveAssetPath(raw: string | undefined | null): string {
  const value = String(raw || '').trim();
  if (!value) return '';

  if (
    isAbsoluteUrl(value)
    || value.startsWith('data:')
    || value.startsWith('blob:')
    || value.startsWith('#')
  ) {
    return value;
  }

  if (!value.startsWith('/')) {
    return value;
  }

  const normalizedBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  if (!normalizedBase) return value;
  if (value === normalizedBase || value.startsWith(`${normalizedBase}/`)) return value;

  return `${normalizedBase}${value}`;
}
