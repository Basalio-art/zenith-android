import { http } from './http.js';
import { CONFIG } from './config.js';
import { ServiceError, ERROR_CLASSES } from './errors.js';

export async function fallbackSearch(query, provider) {
  const base = CONFIG.FALLBACK_BASE;
  try {
    const data = await http.get(`${base}/search`, { q: query, provider: provider.toLowerCase() }, { timeout: 15000 });
    return data;
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Fallback search failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}

export async function checkFallbackHealth() {
  try {
    await http.get(`${CONFIG.FALLBACK_BASE}/search`, { q: 'test', provider: 'gogoanime' }, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}