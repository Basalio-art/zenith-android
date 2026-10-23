import style from '../styles/Stream.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { useContext, useState, useEffect, useRef, memo, useMemo } from 'react';
import { AppContext } from '../App.jsx';
import { services, ANIVEXA_PROVIDERS } from '../services/manager/index.js';
import { MyPlayer } from '../components/Video/Video.jsx';
import { ArrowLeft } from 'lucide-react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// Case/whitespace-tolerant title normalization for the meta-title gate.
const normTitle = value =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const providerOrder = name => {
  const index = ANIVEXA_PROVIDERS.indexOf(name);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

// Dropdown "providers": providers with ≥1 non-empty audio list whose
// meta.title equals this anime (english or romaji, normalized) —
// wrong-series matches never appear. Kept as a pure helper so the list is
// derived on every render from App's live provider state.
function getVerifiedProviders(providers, titles) {
  const normalizedTitles = new Set(
    (titles || []).map(normTitle).filter(Boolean)
  );
  if (!normalizedTitles.size) return [];

  return Object.keys(providers || {})
    .filter(name => {
      const provider = providers[name];
      const hasEpisodes = Object.values(provider?.episodes || {}).some(
        list => Array.isArray(list) && list.length
      );
      return (
        hasEpisodes && normalizedTitles.has(normTitle(provider?.meta?.title))
      );
    })
    .sort((a, b) => providerOrder(a) - providerOrder(b));
}

function Stream({
  providers,
  providersLoading,
  anime,
  selProvider,
  selAudio,
  selVideoType
}) {
  const {
    setNavigatorOpen,
    setSelProvider,
    setSelAudio,
    setSelVideoType,
    navigate,
    handleBack
  } = useContext(AppContext);

  const [thumbnail, setThumbnail] = useState(null);
  const [episode, setEpisode] = useState(0);
  const [openDropdown, setOpenDropDown] = useState(null);
  const [availDropdown, setAvailDropdown] = useState({
    audios: [],
    videoTypes: []
  });
  const [videoSource, setVideoSource] = useState({
    src: null,
    type: null,
    kind: null,
    provider: null,
    audio: null,
    error: null
  });

  const animeTitleRef = useRef(null);
  const countDownRef = useRef(null);
  const getEpisodeDataId = useRef(0);

  const setDropdownState = dr => {
    if (openDropdown === dr) setOpenDropDown(null);
    else setOpenDropDown(dr);
  };

  const prevEpisodeData = useRef(null);

  // Live dropdown list: App merges provider waves into `providers` while
  // this page is mounted, so deriving from the prop keeps the list fresh
  // without a remount or a re-click.
  const availProviders = useMemo(
    () =>
      getVerifiedProviders(providers, [
        anime?.title?.english,
        anime?.title?.romaji
      ]),
    [providers, anime?.title?.english, anime?.title?.romaji]
  );

  // Displayed episode list = the SELECTED provider's longest audio list
  // (sub/dub can differ; the list changes only when the provider changes —
  // no global max across providers).
  const selectedProviderEpisodes = useMemo(() => {
    const lists = Object.values(
      providers?.[videoSource.provider]?.episodes || {}
    ).filter(list => Array.isArray(list));
    return lists.reduce((a, b) => (b.length > a.length ? b : a), []);
  }, [providers, videoSource.provider]);

  const getEpisodeData = async (PROVIDER, AUDIO, TYPE, EPISODE = 0) => {
    const providerList = availProviders;
    setAvailDropdown(prev => ({ ...prev, audios: [], videoTypes: [] }));

    // The selected provider is honored when valid; otherwise fall back to
    // the first verified provider (initial mount / provider gated out).
    const provider = providerList.includes(PROVIDER)
      ? PROVIDER
      : providerList[0];

    if (!provider) {
      prevEpisodeData.current = null;
      setVideoSource(prev => ({
        ...prev,
        src: null,
        kind: null,
        provider: null,
        audio: null,
        error:
          !providerList.length && Object.keys(providers || {}).length
            ? 'No verified providers for this title'
            : 'No providers with episodes available'
      }));
      return;
    }

    // Audio within the selected provider: requested if it holds the
    // episode, else any audio that does, else the first non-empty list.
    const audioEntries = Object.entries(
      providers[provider]?.episodes || {}
    ).filter(([, list]) => Array.isArray(list) && list.length);

    // Episode slots come only from the SELECTED provider: clamp the
    // requested index to its longest list (switching from a 10-episode
    // provider to a 9-episode one lands on its last episode).
    const providerMax = audioEntries.reduce(
      (max, [, list]) => Math.max(max, list.length),
      0
    );
    EPISODE = Math.max(0, Math.min(EPISODE, providerMax - 1));

    const audiosWithEp = audioEntries
      .filter(([, list]) => list[EPISODE])
      .map(([a]) => a);
    const audio = audiosWithEp.includes(AUDIO)
      ? AUDIO
      : audiosWithEp[0] || audioEntries[0][0];

    // Dedupe on the resolved tuple; failure paths clear the ref so
    // re-clicking retries.
    const prevData = prevEpisodeData.current;
    const newData = [provider, audio, TYPE, EPISODE];
    if (prevData && prevData.every((data, i) => data === newData[i])) return;
    prevEpisodeData.current = newData;
    setEpisode(EPISODE);

    const episodes = providers[provider]?.episodes?.[audio] || [];
    setAvailDropdown(prev => ({ ...prev, audios: audiosWithEp }));

    setThumbnail(
      episodes[EPISODE]?.image ??
        anime.bannerImage ??
        anime.coverImage.extraLarge ??
        undefined
    );

    setVideoSource(prev => ({
      ...prev,
      src: null,
      kind: null,
      provider,
      audio,
      error: null
    }));

    setSelProvider(provider);
    setSelAudio(audio);

    const id = ++getEpisodeDataId.current;

    const episodeObj = episodes[EPISODE];

    if (!episodeObj?.id) {
      prevEpisodeData.current = null;
      setVideoSource(prev => ({
        ...prev,
        src: null,
        error: `Episode ${
          EPISODE + 1
        } unavailable on ${provider} — try another provider`
      }));
      return;
    }

    try {
      // Episode ids are preserved exactly as Anivexa returned them:
      // watch/{provider}/{anilistId}/{audio}/{provider}-{ep}
      const streams = await services.anivexa.getWatchSources(
        episodeObj,
        provider
      );

      if (id !== getEpisodeDataId.current) return;

      if (!Array.isArray(streams) || streams.length === 0) {
        prevEpisodeData.current = null;
        setVideoSource(prev => ({
          ...prev,
          src: null,
          error: `No streams found for ${provider} — try another provider`
        }));
        return;
      }

      // Prefer streams the player can render (hls/mp4/embed); DASH entries
      // are filtered out unless nothing else is available.
      const playableStreams = streams.filter(s => s.playable !== false);
      const pool = playableStreams.length > 0 ? playableStreams : streams;

      const result = pool.reduce((acc, stream) => {
        const key = `${stream.server ? stream.server : ''} ${stream.type}`;
        if (!acc[key]) acc[key] = stream;
        return acc;
      }, {});

      const arrList = Object.keys(result);

      setAvailDropdown(prev => ({ ...prev, videoTypes: arrList }));

      // Match by trailing type token ("Streamsb hls" → "hls"); plain string
      // compare — no regex (server names may contain metacharacters).
      const tokenOf = v => (v || '').split(' ').at(-1);
      const typeToken = tokenOf(TYPE);
      const prevToken = tokenOf(selVideoType);
      const selectedItem =
        (typeToken && arrList.find(item => tokenOf(item) === typeToken)) ||
        (prevToken && arrList.find(item => tokenOf(item) === prevToken)) ||
        arrList[0];

      const streamResult = result[selectedItem];
      const playable = streamResult.playable !== false;

      // Playable streams go through stream-proxy /stream/proxy; the rare
      // non-playable (DASH) case falls back to stream-proxy's /v1/embed page.
      const src = playable
        ? services.playback.buildProxyUrl(streamResult)
        : services.playback.buildEmbedUrl(streamResult);
      const kind = playable
        ? streamResult.kind && streamResult.kind !== 'unknown'
          ? streamResult.kind
          : streamResult.type?.split(' ')?.at(-1)
        : 'embed';
      const displayType = playable
        ? selectedItem
        : `${streamResult.server || provider} embed`;

      setVideoSource(prev => ({
        ...prev,
        src,
        type: displayType,
        kind,
        error: null
      }));
      setSelVideoType(displayType);
    } catch (e) {
      prevEpisodeData.current = null;
      const cls = e?.errorClass || e?.class || 'network';
      setVideoSource(prev => ({
        ...prev,
        src: null,
        error: `Failed to load streams (${provider}): ${cls} — try another provider`
      }));
    }
  };

  const animeTitleDisplay = () => {
    const animeTitle = animeTitleRef.current;

    if (!animeTitle) return;

    const firstChild = animeTitle.children[0];

    if (animeTitle.clientWidth < firstChild.scrollWidth) {
      animeTitle.children[0].appendChild(
        firstChild.children[0].cloneNode(true)
      );

      animeTitle.children[0].animate(
        [
          {
            transform: 'translateX(0)',
            offset: 0.1
          },
          {
            transform: `translateX(-${
              firstChild.children[0].clientWidth + 50
            }px)`
          }
        ],
        {
          duration: 10000,
          easing: 'ease-in-out',
          iterations: Infinity
        }
      );
    }
  };

  const renderedEpisode = useMemo(
    () =>
      selectedProviderEpisodes.map((episode, idx) => {
        return (
          <div
            key={`ep-${idx}-${episode.title ?? ''}`}
            className={style.episodeItem}
            onClick={() => {
              const { provider, audio, type } = videoSource;
              getEpisodeData(provider, audio, type, idx);
            }}
          >
            {episode.image && (
              <img
                onError={e => {
                  e.target.outerHTML = `<div class="${style.noImage}">${episode.number}</div>`;
                }}
                src={episode.image}
              />
            )}

            <div className={style.wrapper}>
              <div className={style.episodeTitle}>
                {episode.number && `${episode.number}. `}
                {episode.title}
              </div>
              <div className={style.description}>{episode.description}</div>
            </div>
          </div>
        );
      }),
    [selectedProviderEpisodes, videoSource]
  );

  useEffect(() => {
    setNavigatorOpen(false);
    navigate('stream', 'preview');

    let PROVIDER = selProvider;
    let AUDIO = selAudio;

    // Mount-time player seeding is intentionally effect-driven.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getEpisodeData(PROVIDER, AUDIO, selVideoType);

    animeTitleDisplay();

    const nextAiring = anime.nextAiringEpisode;
    let countdownInterval = null;
    if (nextAiring) {
      const airingAt = nextAiring.airingAt;

      countdownInterval = setInterval(() => {
        const now = Date.now() / 1000;

        const remaining = new Date(Math.max(0, (airingAt - now) * 1000));

        const date = remaining.getUTCDate() - 1;
        const hours = remaining.getUTCHours();
        const minutes = remaining.getUTCMinutes();
        const seconds = remaining.getUTCSeconds();

        const time = [
          date && `${date}d`,
          hours && `${hours}h`,
          minutes && `${minutes}m`,
          `${seconds}s`
        ]
          .filter(Boolean)
          .join(' ');

        if (countDownRef.current)
          countDownRef.current.innerText = `Episode ${nextAiring.episode} in ${time}`;
      }, 1000);
    }

    return () => {
      setOpenDropDown(null);
      setThumbnail(null);
      setAvailDropdown({
        videoTypes: [],
        audios: []
      });
      countDownRef.current = null;
      prevEpisodeData.current = null;
      setVideoSource({
        src: null,
        type: null,
        kind: null,
        provider: null,
        audio: null,
        error: null
      });

      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    };
  }, []);

  useEffect(() => {
    // Providers keep landing while the user is already on this page. If the
    // first wave had no title-verified provider, auto-resolve as soon as a
    // matching one arrives instead of leaving the error screen up.
    if (videoSource.provider || !availProviders.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getEpisodeData(selProvider, selAudio, selVideoType, episode);
  }, [availProviders.length, videoSource.provider]);

  return (
    <div className={style.container}>
      <div className={style.animeTitle}>
        <div className={style.backBtn} onClick={handleBack}>
          <ArrowLeft size={27.5} />
        </div>
        <div className={style.title} ref={animeTitleRef}>
          <div className={style.wrapper}>
            <span>{anime.title.english || anime.title.romaji}</span>
          </div>
        </div>
      </div>
      <div
        className={style.videoWrapper}
        style={{ backgroundImage: `url(${thumbnail})` }}
      >
        {videoSource.error && !videoSource.src ? (
          <div className={style.errorOverlay}>
            <span>
              {providersLoading && !videoSource.provider
                ? 'Loading providers . . .'
                : videoSource.error}
            </span>
          </div>
        ) : (
          <MyPlayer
            videoType={videoSource.kind || videoSource.type?.split(' ')?.at(-1)}
            // src={videoSource.src}
            poster={thumbnail}
            onError={() => {
              // Player-level failure (HLS retries exhausted / media error):
              // surface it in the wrapper; clearing the dedupe ref lets the
              // user re-select the same stream to retry.
              prevEpisodeData.current = null;
              setVideoSource(prev => ({
                ...prev,
                src: null,
                error: `Playback failed (${
                  prev.type || prev.kind || 'stream'
                }) — try another stream`
              }));
            }}
          />
        )}
      </div>

      {(() => {
        const { provider, type, audio } = videoSource;
        if (!provider || !audio) return;

        const data = providers[provider]?.episodes?.[audio]?.[episode];
        if (!data) return;
        return (
          <div className={style.wrapper}>
            <div className={style.episodeTitle}>
              {episode + 1}. {data.title}
            </div>

            {data.description && (
              <div className={style.sypnosisContainer}>
                <div className={style.head}>Sypnosis</div>
                <div className={style.sypnosis}>{data.description}</div>
              </div>
            )}

            <div className={style.providerWrapper}>
              <motion.div
                layout
                className={style.provider}
                onClick={() => {
                  setDropdownState('provider');
                }}
              >
                {provider}
              </motion.div>
              <motion.div
                layout
                className={style.audio}
                onClick={() => {
                  setDropdownState('audio');
                }}
              >
                {audio || '-'}
              </motion.div>
              <motion.div
                layout
                className={style.videoType}
                onClick={() => {
                  setDropdownState('video-type');
                }}
              >
                {type || '-'}
              </motion.div>

              <AnimatePresence mode='wait'>
                <motion.div
                  className={style.dropdownWrapper}
                  key={openDropdown}
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                >
                  {openDropdown === 'provider' && (
                    <div className={style.providers} key='providers'>
                      {availProviders
                        .filter(i => i !== provider)
                        .map(p => (
                          <div
                            key={`provider-${p}`}
                            onClick={() => {
                              setDropdownState('provider');
                              getEpisodeData(p, audio, type, episode);
                            }}
                          >
                            {p}
                          </div>
                        ))}
                      {providersLoading && (
                        <div className={style.dropdownLoading}>
                          Checking more providers . . .
                        </div>
                      )}
                    </div>
                  )}
                  {openDropdown === 'audio' && (
                    <div className={style.audios}>
                      {availDropdown.audios
                        .filter(i => i !== audio)
                        .map(a => (
                          <div
                            key={`audio-${a}`}
                            onClick={() => {
                              setDropdownState('audio');
                              getEpisodeData(provider, a, type, episode);
                            }}
                          >
                            {a}
                          </div>
                        ))}
                    </div>
                  )}
                  {openDropdown === 'video-type' && (
                    <div className={style.videoTypes}>
                      {availDropdown.videoTypes
                        .filter(i => i !== type)
                        .map(t => (
                          <div
                            key={`video-type-${t}`}
                            onClick={() => {
                              setDropdownState('video-type');
                              getEpisodeData(provider, audio, t, episode);
                            }}
                          >
                            {t}
                          </div>
                        ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {anime.nextAiringEpisode && (
              <motion.div
                className={style.countDown}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                ref={countDownRef}
              ></motion.div>
            )}

            <div className={style.episodes}>
              {renderedEpisode ?? 'No avail episodes change provider'}
            </div>
          </div>
        );
      })()}

      <div className={style.safeBottom} />
    </div>
  );
}

export default memo(Stream);
