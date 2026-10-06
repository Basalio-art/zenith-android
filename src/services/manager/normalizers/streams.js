function inferKind(url, type = '') {
  if (!url) return 'unknown';
  const t = type.toLowerCase();
  if (t.includes('hls') || t.includes('m3u8') || url.includes('.m3u8')) return 'hls';
  if (t.includes('mp4') || url.includes('.mp4')) return 'mp4';
  if (t.includes('dash') || t.includes('mpd') || url.includes('.mpd')) return 'dash';
  if (t.includes('embed') || t.includes('iframe')) return 'embed';
  return 'unknown';
}

function extractReferer(stream) {
  if (stream.referer) return stream.referer;
  if (stream.headers?.Referer) return stream.headers.Referer;
  if (stream.headers?.referer) return stream.headers.referer;
  return undefined;
}

function extractAuth(stream) {
  if (stream.auth) return stream.auth;
  if (stream.headers?.Authorization) return stream.headers.Authorization;
  if (stream.headers?.authorization) return stream.headers.authorization;
  return undefined;
}

function extractHeaders(stream) {
  const h = stream.headers || {};
  const out = {};
  for (const [k, v] of Object.entries(h)) {
    if (k.toLowerCase() !== 'referer' && k.toLowerCase() !== 'authorization') {
      out[k] = v;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeMkissaSources(sources, provider, episode) {
  if (!Array.isArray(sources)) return [];
  return sources.map(s => ({
    server: s.name || provider,
    type: s.type || 'hls',
    url: s.url || s.extractedUrl,
    referer: s.headers?.Referer,
    headers: extractHeaders(s),
    auth: extractAuth(s),
    subtitles: undefined,
    priority: s.priority ?? 0,
    isActive: true,
    provider,
    episode: episode.number,
    playable: inferKind(s.url || s.extractedUrl, s.type) !== 'dash',
    kind: inferKind(s.url || s.extractedUrl, s.type),
    raw: s,
  })).filter(s => s.url);
}

function normalizeStreamsArray(streams, provider, episode) {
  if (!Array.isArray(streams)) return [];
  return streams.map(s => ({
    server: s.server || provider,
    type: s.type || 'hls',
    url: s.url,
    referer: extractReferer(s),
    headers: extractHeaders(s),
    auth: extractAuth(s),
    subtitles: s.subtitles,
    priority: s.priority ?? 0,
    isActive: s.isActive !== false,
    provider,
    episode: episode.number,
    playable: inferKind(s.url, s.type) !== 'dash',
    kind: inferKind(s.url, s.type),
    raw: s,
  })).filter(s => s.url);
}

function normalizeReanime(watchData, provider, episode) {
  const candidates = [];
  if (Array.isArray(watchData.streams)) {
    candidates.push(...normalizeStreamsArray(watchData.streams, provider, episode));
  }
  if (watchData.stream_url) {
    candidates.push({
      server: provider,
      type: 'hls',
      url: watchData.stream_url,
      referer: undefined,
      headers: undefined,
      auth: undefined,
      subtitles: undefined,
      priority: 10,
      isActive: true,
      provider,
      episode: episode.number,
      playable: true,
      kind: 'hls',
      raw: watchData,
    });
  }
  if (Array.isArray(watchData.embeds)) {
    watchData.embeds.forEach(e => {
      candidates.push({
        server: e.server || provider,
        type: 'embed',
        url: e.url || e.iframe,
        referer: undefined,
        headers: undefined,
        auth: undefined,
        subtitles: undefined,
        priority: 5,
        isActive: true,
        provider,
        episode: episode.number,
        playable: true,
        kind: 'embed',
        raw: e,
      });
    });
  }
  return candidates;
}

function normalizeSenshi(watchData, provider, episode) {
  const candidates = [];
  if (Array.isArray(watchData.streams)) {
    candidates.push(...normalizeStreamsArray(watchData.streams, provider, episode));
  }
  if (Array.isArray(watchData.downloads)) {
    watchData.downloads.forEach(d => {
      candidates.push({
        server: d.server || provider,
        type: d.type || 'mp4',
        url: d.url,
        referer: extractReferer(d),
        headers: extractHeaders(d),
        auth: extractAuth(d),
        subtitles: undefined,
        priority: d.priority ?? 0,
        isActive: true,
        provider,
        episode: episode.number,
        playable: inferKind(d.url, d.type) !== 'dash',
        kind: inferKind(d.url, d.type),
        raw: d,
      });
    });
  }
  return candidates;
}

export function normalizeStreams(watchData, episode, explicitProvider) {
  if (!watchData || typeof watchData !== 'object') return [];

  // Episode ids look like: watch/{provider}/{anilistId}/{audio}/{provider}-{ep}
  const provider =
    explicitProvider ||
    episode?.provider ||
    (typeof episode?.id === 'string' ? episode.id.split('/')[1] : null) ||
    'unknown';
  let candidates = [];

  if (Array.isArray(watchData.sources)) {
    candidates.push(...normalizeMkissaSources(watchData.sources, provider, episode));
  } else if (provider === 'reanime' && (watchData.streams || watchData.stream_url || watchData.embeds)) {
    candidates.push(...normalizeReanime(watchData, provider, episode));
  } else if (provider === 'senshi' && (watchData.streams || watchData.downloads)) {
    candidates.push(...normalizeSenshi(watchData, provider, episode));
  } else if (Array.isArray(watchData.streams)) {
    candidates.push(...normalizeStreamsArray(watchData.streams, provider, episode));
  }

  if (candidates.length === 0 && watchData.error) {
    console.warn(`Provider ${provider} returned error:`, watchData.error);
  }

  return candidates
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .map((c, i) => ({ ...c, index: i }));
}