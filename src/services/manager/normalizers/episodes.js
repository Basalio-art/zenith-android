const EXCLUDE_KEYS = ['page', 'type', 'mappings', '_unknownProviders'];

export function normalizeEpisodes(data) {
  if (!data || typeof data !== 'object') return null;

  const providers = {};
  let hasValidProvider = false;

  for (const [key, value] of Object.entries(data)) {
    if (EXCLUDE_KEYS.includes(key)) continue;
    if (!value || typeof value !== 'object') continue;
    if (!value.episodes || typeof value.episodes !== 'object') continue;

    const episodes = value.episodes;
    const audioEntries = Object.entries(episodes).filter(
      ([, list]) => Array.isArray(list)
    );
    const hasEpisodes = audioEntries.some(([, list]) => list.length > 0);
    if (!hasEpisodes) continue;

    providers[key] = {
      meta: value.meta || {},
      episodes: Object.fromEntries(audioEntries),
    };
    hasValidProvider = true;
  }

  return hasValidProvider ? { providers } : null;
}