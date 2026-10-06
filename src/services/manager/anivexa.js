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