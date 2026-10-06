export const CONFIG = {
  ANIVEXA_BASE: import.meta.env.VITE_ANIVEXA_URL || 'http://localhost:9189',
  PROXY_BASE: import.meta.env.VITE_PROXY_URL || 'http://localhost:9190',
  FALLBACK_BASE: import.meta.env.VITE_FALLBACK_URL || 'http://localhost:9191',
  ANILIST_GQL: 'https://graphql.anilist.co',

  CONNECT_TIMEOUT: 5000,
  READ_TIMEOUT: 10000,

  USE_PROXY_SOURCES: false,
  STRICT_VERSION_GATE: false,

  ANILIST_RATE_LIMIT_MS: 500,
};

// Fields the frontend reads from list/home/search cards, ViewAnime's first
// paint, and Stream (which receives the RAW list item — needs airingAt for
// its countdown). Verified against Home/Search/ViewAnime/Stream usage.
export const MEDIA_CARD_FIELDS = `
  id
  title { romaji english }
  coverImage { extraLarge color }
  bannerImage
  description
  genres
  format
  seasonYear
  episodes
  status
  averageScore
  countryOfOrigin
  nextAiringEpisode { episode airingAt }
`;

// Detail = every card field + ViewAnime stats-only fields (progressive
// getInfo fetch overlays these over the list item via mergeMedia).
export const MEDIA_DETAIL_FIELDS = `
  ${MEDIA_CARD_FIELDS}
  studios { edges { isMain node { name } } }
  tags { name isGeneralSpoiler }
  externalLinks { url site }
  trailer { id site thumbnail }
  startDate { year month day }
  endDate { year month day }
`;