import { http } from './http.js';
import { CONFIG, MEDIA_CARD_FIELDS, MEDIA_DETAIL_FIELDS } from './config.js';
import { ServiceError, ERROR_CLASSES } from './errors.js';
import { normalizeCatalog } from './normalizers/catalog.js';

const GQL_SEARCH = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) { ${MEDIA_CARD_FIELDS} }
    }
  }
`;

const GQL_LIST = (sort, status) => `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(type: ANIME${status ? `, status: ${status}` : ''}, sort: [${sort}], isAdult: false) { ${MEDIA_CARD_FIELDS} }
    }
  }
`;

const GQL_INFO = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) { ${MEDIA_DETAIL_FIELDS} }
  }
`;

async function gqlRequest(variables, query) {
  const body = await http.post(CONFIG.ANILIST_GQL, { query, variables }, { timeout: 15000 });
  // AniList envelope: { data: {...}, errors?: [...] } — unwrap here once so
  // every adapter reads data.Page / data.Media directly.
  if (body && typeof body.data !== 'undefined') return body.data;
  throw new ServiceError('AniList returned no data', {
    class: ERROR_CLASSES.UPSTREAM,
    payload: body?.errors,
  });
}

let nextSlot = 0;
async function rateLimitedRequest(variables, query) {
  // Serialize request spacing even when callers fire in parallel.
  const now = Date.now();
  const scheduled = Math.max(now, nextSlot);
  nextSlot = scheduled + CONFIG.ANILIST_RATE_LIMIT_MS;
  if (scheduled > now) await new Promise(r => setTimeout(r, scheduled - now));

  try {
    return await gqlRequest(variables, query);
  } catch (e) {
    // AniList rate limit: back off once and retry.
    if (e?.status === 429) {
      const retryAfter = Number(e?.payload?.['Retry-After']) || 3;
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return await gqlRequest(variables, query);
    }
    throw e;
  }
}

export async function searchAnime(query, page = 1, perPage = 50) {
  try {
    const data = await rateLimitedRequest({ search: query, page, perPage }, GQL_SEARCH);
    return normalizeCatalog(data?.Page);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Search failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}

export async function getTrending(page = 1, perPage = 20) {
  try {
    const data = await rateLimitedRequest({ page, perPage }, GQL_LIST('TRENDING_DESC'));
    return normalizeCatalog(data?.Page);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Trending failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}

export async function getPopular(page = 1, perPage = 20) {
  try {
    const data = await rateLimitedRequest({ page, perPage }, GQL_LIST('POPULARITY_DESC'));
    return normalizeCatalog(data?.Page);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Popular failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}

export async function getRecent(page = 1, perPage = 20) {
  try {
    // "Recent" rail = currently-airing anime, newest premieres first.
    // Live-verified: every RELEASING result carries nextAiringEpisode, so
    // Home cards render the "N EP" release badge. (AniList has no
    // NEXT_AIRING sort — it is not a valid MediaSort value.)
    const data = await rateLimitedRequest({ page, perPage }, GQL_LIST('START_DATE_DESC', 'RELEASING'));
    return normalizeCatalog(data?.Page);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Recent failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}

export async function getInfo(anilistId) {
  try {
    const data = await rateLimitedRequest({ id: anilistId }, GQL_INFO);
    return data?.Media ? normalizeCatalog({ media: [data.Media], pageInfo: { currentPage: 1, perPage: 1, total: 1, hasNextPage: false } })?.results[0] : null;
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Info failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}

export async function getSuggestions(query) {
  const gql = `
    query ($search: String) {
      Page(perPage: 10) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
          id title { romaji english native } coverImage { large extraLarge }
        }
      }
    }
  `;
  try {
    const data = await rateLimitedRequest({ search: query }, gql);
    return data?.Page?.media || [];
  } catch {
    return [];
  }
}

export async function getSchedule() {
  try {
    // Was sort:[NEXT_AIRING_DESC] — not a valid MediaSort enum (live 400).
    // Same valid airing-anime query as getRecent until a dedicated schedule
    // UI needs different semantics.
    const data = await rateLimitedRequest({ page: 1, perPage: 20 }, GQL_LIST('START_DATE_DESC', 'RELEASING'));
    return normalizeCatalog(data?.Page);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError('Schedule failed', { class: ERROR_CLASSES.NETWORK, cause: e });
  }
}