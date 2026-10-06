import { http } from './http.js';
import { CONFIG } from './config.js';

export async function checkAniList() {
  try {
    const data = await http.post(CONFIG.ANILIST_GQL, {
      query: '{ Media(id: 1) { id } }',
    }, { timeout: 5000 });
    return !!data?.data?.Media?.id;
  } catch {
    return false;
  }
}

// Anivexa serves a static HTML landing page on GET /; any unmatched path
// (e.g. /version) falls through to its info JSON payload:
// { name: "Anivexa API 2.2.1", cache, providers, routes }  (no `version` key)
export async function checkAnivexa() {
  try {
    const data = await http.get(`${CONFIG.ANIVEXA_BASE}/version`, {}, { timeout: 5000 });
    return !!(data && typeof data === 'object' && typeof data.name === 'string' && data.name.includes('Anivexa'));
  } catch {
    return false;
  }
}

export async function checkProxy() {
  try {
    const data = await http.get(`${CONFIG.PROXY_BASE}/healthz`, {}, { timeout: 5000 });
    return data?.status === 'ok';
  } catch {
    return false;
  }
}

export function parseBackendInfo(info) {
  if (!info || typeof info !== 'object') return null;
  const name = info.name || '';
  const match = name.match(/Anivexa API ([\d.]+)/);
  return match ? match[1] : null;
}

export async function getBackendVersion() {
  try {
    const data = await http.get(`${CONFIG.ANIVEXA_BASE}/version`, {}, { timeout: 5000 });
    return parseBackendInfo(data);
  } catch {
    return null;
  }
}

export async function checkAllServices() {
  const [anilist, anivexa, proxy] = await Promise.all([
    checkAniList(),
    checkAnivexa(),
    checkProxy(),
  ]);
  return { anilist, anivexa, proxy, all: anilist && anivexa && proxy };
}

export async function versionGate(remoteVersion) {
  if (!CONFIG.STRICT_VERSION_GATE) return { ok: true, reason: 'strict gate disabled' };
  if (!remoteVersion) return { ok: true, reason: 'no remote version configured' };

  const localVersion = await getBackendVersion();
  if (!localVersion) return { ok: true, reason: 'could not determine local version' };

  return {
    ok: localVersion === remoteVersion,
    localVersion,
    remoteVersion,
    reason: localVersion === remoteVersion ? 'match' : 'mismatch',
  };
}