import style from '../styles/Stream.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { useContext, useState, useEffect, useRef, memo, useMemo } from 'react';
import { AppContext } from '../App.jsx';
import { services } from '../services/manager/index.js';
import { MyPlayer } from '../components/Video/Video.jsx';
import { ArrowLeft } from 'lucide-react';

const ColorType = {
  hls: '#ffa000'
};

function Stream({ providers, anime, selProvider, selAudio, selVideoType }) {
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
    providers: [],
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

  // Global episode-slot template: the longest audio list ANY provider has
  // (e.g. P1=9 eps, P2=10 eps → display 10 slots). Playback follows the
  // selected provider; clicking a slot it lacks auto-switches provider.
  const episodeSlots = useMemo(() => {
    let template = [];
    let max = 0;
    for (const pv of Object.values(providers || {})) {
      for (const list of Object.values(pv?.episodes || {})) {
        if (Array.isArray(list) && list.length > max) {
          max = list.length;
          template = list;
        }
      }
    }
    return { max, template };
  }, [providers]);

  // Resolve (provider, audio) holding episodeIdx, honoring the current
  // selection: same provider+audio → same provider/other audio → other
  // provider/same audio → any. Null when no provider has the slot.
  const resolveEpisodeSlot = (requestedProvider, requestedAudio, episodeIdx) => {
    const has = (p, a) => !!providers?.[p]?.episodes?.[a]?.[episodeIdx];
    const pick = p => {
      const audios = Object.keys(providers?.[p]?.episodes || {}).filter(a => has(p, a));
      if (!audios.length) return null;
      return { provider: p, audio: audios.includes(requestedAudio) ? requestedAudio : audios[0] };
    };

    if (requestedProvider && has(requestedProvider, requestedAudio)) {
      return { provider: requestedProvider, audio: requestedAudio };
    }
    if (requestedProvider) {
      const r = pick(requestedProvider);
      if (r) return r;
    }
    for (const p of Object.keys(providers || {})) {
      if (p === requestedProvider) continue;
      const r = pick(p);
      if (r) return r;
    }
    return null;
  };

  const getEpisodeData = async (PROVIDER, AUDIO, TYPE, EPISODE = 0) => {
    // Dropdown "providers": only providers with ≥1 non-empty audio list —
    // episode-less providers never appear.
    const providerList = Object.keys(providers || {}).filter(p =>
      Object.values(providers[p]?.episodes || {}).some(
        list => Array.isArray(list) && list.length
      )
    );
    setAvailDropdown(prev => ({ ...prev, providers: providerList, audios: [], videoTypes: [] }));

    const resolved = resolveEpisodeSlot(PROVIDER, AUDIO, EPISODE);
    if (!resolved) {
      prevEpisodeData.current = null;
      setVideoSource(prev => ({
        ...prev,
        src: null,
        kind: null,
        provider: null,
        audio: null,
        error: `No provider has episode ${EPISODE + 1}`
      }));
      return;
    }

    const { provider, audio } = resolved;

    // Dedupe on the RESOLVED tuple: auto-switching never double-fetches,
    // and failure paths clear the ref so re-clicking retries.
    const prevData = prevEpisodeData.current;
    const newData = [provider, audio, TYPE, EPISODE];
    if (prevData && prevData.every((data, i) => data === newData[i])) return;
    prevEpisodeData.current = newData;
    setEpisode(EPISODE);

    const episodes = providers[provider]?.episodes?.[audio] || [];
    setAvailDropdown(prev => ({
      ...prev,
      audios: Object.entries(providers[provider]?.episodes || {})
        .filter(([, list]) => Array.isArray(list) && list[EPISODE])
        .map(([a]) => a)
    }));

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
        error: `Episode ${EPISODE + 1} unavailable on ${provider} — try another provider`
      }));
      return;
    }

    try {
      // Episode ids are preserved exactly as Anivexa returned them:
      // watch/{provider}/{anilistId}/{audio}/{provider}-{ep}
      const streams = await services.anivexa.getWatchSources(episodeObj, provider);

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
      const displayType = playable ? selectedItem : `${streamResult.server || provider} embed`;

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
            transform: `translateX(-${firstChild.children[0].clientWidth + 50}px)`
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
      episodeSlots.template.map((episode, idx) => {
        return (
          <div
            key={`ep-${idx}-${episode.title ?? ''}`}
            className={style.episodeItem}
            onClick={() => {
              const { provider, audio, type } = videoSource;
              getEpisodeData(provider, audio, type, idx);
            }}
          >
            {episode.image && <img src={episode.image} />}
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
    [episodeSlots.template, videoSource]
  );

  useEffect(() => {
    setNavigatorOpen(false);
    navigate('stream', 'preview');

    let PROVIDER = selProvider;
    let AUDIO = selAudio;

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
        providers: [],
        videoTypes: [],
        audios: []
      });
      countDownRef.current = null;
      prevEpisodeData.current = null;
      setVideoSource({ src: null, type: null, kind: null, provider: null, audio: null, error: null });

      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    };
  }, []);

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
            <span>{videoSource.error}</span>
          </div>
        ) : (
          <MyPlayer
            videoType={videoSource.kind || videoSource.type?.split(' ')?.at(-1)}
            src={videoSource.src}
            poster={thumbnail}
            onError={() => {
              // Player-level failure (HLS retries exhausted / media error):
              // surface it in the wrapper; clearing the dedupe ref lets the
              // user re-select the same stream to retry.
              prevEpisodeData.current = null;
              setVideoSource(prev => ({
                ...prev,
                src: null,
                error: `Playback failed (${prev.type || prev.kind || 'stream'}) — try another stream`
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
                      {availDropdown.providers
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
