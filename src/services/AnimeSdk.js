import { CapacitorHttp } from '@capacitor/core';
import { CONFIG } from './manager/config.js';

const base = CONFIG.FALLBACK_BASE;

export async function SearchAnime(query, provider) {
  const endpoint = '/search?q=' + encodeURIComponent(query);
  try {
    const { data } = await CapacitorHttp.get({
      url: `${base}${endpoint}&provider=${provider.toLowerCase()}`
    });

    return {
      data
    };
  } catch (e) {
    console.log(e);
  }
}
