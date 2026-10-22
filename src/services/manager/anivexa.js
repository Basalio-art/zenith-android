import { http } from './http.js';
import { CONFIG } from './config.js';
import { ServiceError, ERROR_CLASSES } from './errors.js';
import { normalizeEpisodes } from './normalizers/episodes.js';
import { normalizeStreams } from './normalizers/streams.js';

export async function getEpisodes(anilistId) {
  try {
    const data = await http.get(`${CONFIG.ANIVEXA_BASE}/episodes/${anilistId}`, {}, { timeout: 15000 });
    return normalizeEpisodes(data);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Episodes fetch failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}

export async function getEpisodesFiltered(anilistId, providerNames) {
  // Filtered route scrapes ONLY the requested providers (seconds, not the
  // full ~10s all-provider sweep); map=false skips the id-mapping fetch
  // the app never reads. Names are validated — they become URL path segments.
  const names = (providerNames || [])
    .filter(n => typeof n === 'string' && /^[\w-]+$/.test(n))
    .join('/');
  if (!names) return null;
  try {
    const data = await http.get(
      `${CONFIG.ANIVEXA_BASE}/episodes/${names}/${anilistId}?map=false`,
      {},
      { timeout: 20000 }
    );
    return normalizeEpisodes(data);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Episodes fetch failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}

// Provider results are small (episode lists only, no stream URLs) and stay
// valid for a few minutes. The cache lets ViewAnime repaint instantly when
// the user goes back to an anime; the progressive sweep below retries any
// provider that is missing or past its TTL.
const PROVIDER_CACHE_TTL = 5 * 60_000;
const PROVIDER_CACHE_MAX = 300;

const providerInflight = new Map();
const providerCache = new Map();

function cacheProviderData(key, data) {
  if (!providerCache.has(key) && providerCache.size >= PROVIDER_CACHE_MAX) {
    const oldest = providerCache.keys().next().value;
    if (oldest !== undefined) providerCache.delete(oldest);
  }
  providerCache.set(key, {
    data,
    expiresAt: Date.now() + PROVIDER_CACHE_TTL,
  });
}

export async function getEpisodesForProvider(
  anilistId,
  providerName,
  { timeout = 15000 } = {}
) {
  if (!anilistId || typeof providerName !== 'string' || !/^[\w-]+$/.test(providerName)) {
    return null;
  }

  const key = `${anilistId}:${providerName}`;
  const cached = providerCache.get(key);
  if (cached) {
    if (Date.now() < cached.expiresAt) return cached.data;
    providerCache.delete(key);
  }

  const inflight = providerInflight.get(key);
  if (inflight) return inflight;

  const request = http
    .get(
      `${CONFIG.ANIVEXA_BASE}/episodes/${providerName}/${anilistId}`,
      { map: 'false' },
      { timeout }
    )
    .then(data => {
      const providerData = normalizeEpisodes(data)?.providers?.[providerName];
      if (!providerData) return null;
      cacheProviderData(key, providerData);
      return providerData;
    })
    .catch(() => null)
    .finally(() => providerInflight.delete(key));

  providerInflight.set(key, request);
  return request;
}

// Loads each provider independently and reports it the moment it settles,
// instead of waiting for the slowest provider in one batched /episodes call.
// Individual failures are expected (provider down, no match, timeout) and
// simply never reach the callback.
export async function loadProvidersProgressively(
  anilistId,
  providerNames,
  onProvider,
  { concurrency = 5 } = {}
) {
  const names = (providerNames || []).filter(
    name => typeof name === 'string' && /^[\w-]+$/.test(name)
  );
  if (!names.length) return { loaded: 0, failed: 0 };

  let cursor = 0;
  let loaded = 0;
  let failed = 0;

  const worker = async () => {
    while (cursor < names.length) {
      const name = names[cursor++];
      const providerData = await getEpisodesForProvider(anilistId, name);
      if (!providerData) {
        failed += 1;
        continue;
      }
      loaded += 1;
      try {
        onProvider?.(name, providerData);
      } catch (e) {
        console.warn(`Provider merge failed (${name}):`, e);
      }
    }
  };

  const workers = Math.max(1, Math.min(concurrency, names.length));
  await Promise.all(Array.from({ length: workers }, worker));

  return { loaded, failed };
}

// Synchronous snapshot of every cached provider for an anime, so a remount
// can paint the dropdown before the network sweep even starts.
export function getCachedProviders(anilistId) {
  const now = Date.now();
  const prefix = `${anilistId}:`;
  const merged = {};

  for (const [key, entry] of providerCache) {
    if (now >= entry.expiresAt) {
      providerCache.delete(key);
      continue;
    }
    if (!key.startsWith(prefix)) continue;
    const providerName = key.slice(prefix.length);
    if (providerName) merged[providerName] = entry.data;
  }

  return Object.keys(merged).length ? merged : null;
}

export async function getWatchSources(episode, provider) {
  if (!episode?.id) {
    throw new ServiceError('Episode missing id', { class: ERROR_CLASSES.INVALID });
  }
  const watchUrl = `${CONFIG.ANIVEXA_BASE}/${episode.id}`;
  try {
    const data = await http.get(watchUrl, {}, { timeout: 20000 });
    return normalizeStreams(data, episode, provider);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Sources fetch failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}

export async function getAnivexaInfo() {
  try {
    const data = await http.get(`${CONFIG.ANIVEXA_BASE}/`, {}, { timeout: 5000 });
    return data;
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Anivexa info failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}

export async function checkAnivexaLiveness() {
  try {
    await http.head(`${CONFIG.ANIVEXA_BASE}/`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}