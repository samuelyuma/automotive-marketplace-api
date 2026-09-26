// Ignore empty or punctuation-only terms before building a text search query.
export function normalizeListingSearchTerm(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed && /[\p{L}\p{N}]/u.test(trimmed) ? trimmed : undefined;
}
