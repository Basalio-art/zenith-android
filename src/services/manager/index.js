export * from './config.js';
export * from './http.js';
export * from './errors.js';
export * from './health.js';
export * from './anilist.js';
export * from './anivexa.js';
export * from './streamproxy.js';
export * from './fallback.js';
export * from './normalizers/catalog.js';
export * from './normalizers/episodes.js';
export * from './normalizers/streams.js';

import * as health from './health.js';
import * as anilist from './anilist.js';
import * as anivexa from './anivexa.js';
import * as streamproxy from './streamproxy.js';
import * as fallback from './fallback.js';

export const services = {
  health,
  anilist,
  anivexa,
  playback: streamproxy,
  fallback,
};