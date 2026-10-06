export function normalizeCatalog(pageData) {
  if (!pageData || !pageData.media) {
    return { page: 1, perPage: 20, total: 0, hasNextPage: false, results: [] };
  }

  const pageInfo = pageData.pageInfo || {};
  const media = (pageData.media || []).filter(Boolean);

  const results = media.map(m => ({
    ...m,
    externalLinks: m.externalLinks || [],
    studios: m.studios || { edges: [] },
    tags: m.tags || [],
    genres: m.genres || [],
    description: m.description || '',
    title: m.title || { romaji: '', english: '', native: '' },
    coverImage: m.coverImage || { large: '', extraLarge: '', color: '' },
    startDate: m.startDate || { year: null, month: null, day: null },
    endDate: m.endDate || { year: null, month: null, day: null },
    trailer: m.trailer || null,
    nextAiringEpisode: m.nextAiringEpisode || null,
  }));

  return {
    page: pageInfo.currentPage || 1,
    perPage: pageInfo.perPage || 20,
    total: pageInfo.total || 0,
    hasNextPage: pageInfo.hasNextPage || false,
    results,
  };
}

export function normalizeMediaItem(m) {
  return {
    ...m,
    externalLinks: m.externalLinks || [],
    studios: m.studios || { edges: [] },
    tags: m.tags || [],
    genres: m.genres || [],
    description: m.description || '',
    title: m.title || { romaji: '', english: '', native: '' },
    coverImage: m.coverImage || { large: '', extraLarge: '', color: '' },
    startDate: m.startDate || { year: null, month: null, day: null },
    endDate: m.endDate || { year: null, month: null, day: null },
    trailer: m.trailer || null,
    nextAiringEpisode: m.nextAiringEpisode || null,
  };
}

// Merge a freshly fetched detail item over the list-item the UI already has.
// - detail wins, except null/''/undefined never clobber a non-empty base value
// - a mismatched id means stale/crossed data → base is returned untouched
// - base.id is always enforced on the result
export function mergeMedia(base, detail) {
  if (!detail || typeof detail !== 'object') return base;
  if (!base || typeof base !== 'object') return detail;
  if (base.id !== undefined && detail.id !== undefined && String(base.id) !== String(detail.id)) {
    return base;
  }

  const out = { ...detail };
  for (const [key, value] of Object.entries(base)) {
    const current = out[key];
    if (current === null || current === undefined || current === '') {
      if (value !== null && value !== undefined && value !== '') {
        out[key] = value;
      }
    }
  }
  out.id = base.id;
  return out;
}