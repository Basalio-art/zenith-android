import { CONFIG } from './config.js';
import { http, buildUrl } from './http.js';

export function buildProxyUrl(stream) {
  const params = { url: stream.url };
  if (stream.referer) params.referer = stream.referer;
  if (stream.origin) params.origin = stream.origin;
  if (stream.auth) params.auth = stream.auth;
  if (stream.playlistKey) params.playlist_key = stream.playlistKey;
  return buildUrl(CONFIG.PROXY_BASE, '/stream/proxy', params);
}

export function buildLegacyProxyUrl(stream) {
  const params = { url: stream.url };
  if (stream.referer) params.referer = stream.referer;
  if (stream.origin) params.origin = stream.origin;
  return buildUrl(CONFIG.PROXY_BASE, '/proxy/stream', params);
}

export function buildEmbedUrl(stream) {
  const params = { url: stream.url };
  if (stream.referer) params.referer = stream.referer;
  return buildUrl(CONFIG.PROXY_BASE, '/v1/embed', params);
}

export async function checkProxyHealth() {
  try {
    const data = await http.get(`${CONFIG.PROXY_BASE}/healthz`, {}, { timeout: 5000 });
    return data?.status === 'ok';
  } catch {
    return false;
  }
}

export async function getSourcesViaProxy(anilistId, provider, audio, episode) {
  const params = { anilist: anilistId, provider, audio, ep: episode };
  try {
    const data = await http.get(`${CONFIG.PROXY_BASE}/v1/sources`, params, { timeout: 15000 });
    return data;
  } catch (e) {
    console.warn('Proxy sources failed:', e);
    return null;
  }
}