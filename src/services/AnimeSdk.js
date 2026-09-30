import { CapacitorHttp } from '@capacitor/core';

const base = 'http://localhost:9190';

export async function SearchAnime(query, provider) {
  const endpoint = '/search?q=' + encodeURIComponent(query);
  try {
    const { data } = await CapacitorHttp.get({
      url: `${base}${endpoint}&provider=${provider.toLowerCase()}`
    })

    console.log(provider.toLowerCase())
    
    return {
      data
    };
  } catch (e) {
    console.log(e);
  }
}
