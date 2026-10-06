import { CapacitorHttp } from '@capacitor/core';
import { CONFIG } from './config.js';
import { ServiceError, ERROR_CLASSES } from './errors.js';

function withParams(url, params) {
  if (!params) return url;
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (!entries.length) return url;
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return url + (url.includes('?') ? '&' : '?') + qs;
}

function buildUrl(base, path, params = {}) {
  return withParams(base.replace(/\/$/, '') + path, params);
}

async function request({ url, method = 'GET', params, data, headers = {}, timeout = CONFIG.READ_TIMEOUT }) {
  const fullUrl = withParams(url, params);

  let response;
  try {
    response = await CapacitorHttp.request({
      url: fullUrl,
      method,
      data: data !== undefined ? JSON.stringify(data) : undefined,
      headers: { 'Content-Type': 'application/json', ...headers },
      connectTimeout: CONFIG.CONNECT_TIMEOUT,
      readTimeout: timeout,
    });
  } catch (e) {
    if (e?.name === 'AbortError' || e?.code === 'ECONNABORTED' || /timeout/i.test(e?.message || '')) {
      throw new ServiceError('Request timeout', { class: ERROR_CLASSES.NETWORK, cause: e });
    }
    if (/failed to fetch|network|load failed/i.test(e?.message || '')) {
      throw new ServiceError('Network error', { class: ERROR_CLASSES.NETWORK, cause: e });
    }
    throw new ServiceError(e?.message || 'Unknown error', { class: ERROR_CLASSES.UNKNOWN, cause: e });
  }

  const { data: payload, status } = response || {};
  if (status && status >= 400) {
    throw new ServiceError(`HTTP ${status}`, {
      class: ERROR_CLASSES.UPSTREAM,
      service: (() => { try { return new URL(fullUrl).host; } catch { return undefined; } })(),
      status,
      payload,
    });
  }
  return payload;
}

export const http = {
  get: (url, params, options) => request({ url, method: 'GET', params, ...options }),
  post: (url, body, options) => request({ url, method: 'POST', data: body, ...options }),
  head: (url, options) => request({ url, method: 'HEAD', ...options }),
};

export { buildUrl, withParams };
