import style from './Stream.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { useContext, useState, useEffect, useRef, memo, useMemo } from 'react';
import { AppContext } from './App.jsx';
import { CapacitorHttp } from '@capacitor/core';
import { MyPlayer } from './Video.jsx';
import { ArrowLeft } from 'lucide-react';

const ColorType = {
  hls: '#ffa000'
};

function Stream({
  providers,
  anime,
  openStream,
  selProvider,
  selAudio,
  selVideoType
}) {
  const { setNavigatorOpen, setOpenStream } = useContext(AppContext);

  const [thumbnail, setThumbnail] = useState(null);
  const [episode, setEpisode] = useState(0);
  const [episodeList, setEpisodeList] = useState([]);
  const [openDropdown, setOpenDropDown] = useState(null);
  const [availDropdown, setAvailDropdown] = useState({
    providers: [],
    audios: [],
    videoTypes: []
  });
  const [videoSource, setVideoSource] = useState({
    src: null,
    type: null,
    provider: null,
    audio: null
  });

  const animeTitleRef = useRef(null);
  const countDownRef = useRef(null);
  const getEpisodeDataId = useRef(0);

  const setDropdownState = dr => {
    if (openDropdown === dr) setOpenDropDown(null);
    else setOpenDropDown(dr);
  };

  const prevEpisodeData = useRef(null)
  const getEpisodeData = async (PROVIDER, AUDIO, TYPE, EPISODE = 0) => {
    const prevData = prevEpisodeData.current
    const newData = [PROVIDER, AUDIO, TYPE, EPISODE]
    if (prevData && prevData.every((data, i) => data === newData[i])) return
    prevEpisodeData.current = newData
    
    setAvailDropdown(prev => ({
      ...prev,
      audios: [],
      videoTypes: []
    }));

    console.log(newData)

    PROVIDER = autoSelectProvider(PROVIDER);
    AUDIO = autoSelectAudio(PROVIDER, AUDIO, EPISODE);

    setThumbnail(
      providers[PROVIDER].episodes[AUDIO][EPISODE].image ??
        anime.bannerImage ??
        anime.coverImage.extraLarge
    );

    setEpisodeList(providers[PROVIDER].episodes.sub);

    setVideoSource(prev => ({
      ...prev,
      src: null,
      provider: PROVIDER,
      audio: AUDIO
    }));

    const id = ++getEpisodeDataId.current;

    const path = providers[PROVIDER].episodes[AUDIO];

    const option = {
      url: `http://localhost:9189/${path[EPISODE].id}`
    };
    try {
      const { data } = await CapacitorHttp.get(option);

      if (id !== getEpisodeDataId.current) return;

      if (typeof data !== 'object' || !('streams' in data))
        throw new Error('invalid data');

      const result = data.streams.reduce((acc, stream) => {
        const key = `${stream.server} ${stream.type}`;
        acc[key] = stream;
        return acc;
      }, {});

      const arrList = Object.keys(result);

      setAvailDropdown(prev => ({ ...prev, videoTypes: arrList }));

      const selectedItem =
        arrList.find(item => new RegExp(`\\b${TYPE}\\b`).test(item)) ??
        arrList.find(item => new RegExp(`\\b${selVideoType}\\b`).test(item)) ??
        arrList[0];

      const streamResult = result[selectedItem];

      setVideoSource(prev => ({
        ...prev,
        src:
          `http://localhost:9189/proxy/stream` +
          `?url=${streamResult.url}` +
          `&referer=${streamResult.referer}` +
          `&origin=${streamResult.referer}`,
        type: selectedItem
      }));
    } catch (e) {
      console.log(e);
    }
  };

  const autoSelectProvider = PROVIDER => {
    let provider = PROVIDER;

    let list = Object.keys(providers).filter(
      p => Object.keys(providers[p].episodes).length !== 0
    );

    if (!list.includes(provider)) {
      provider = list[0];
    }

    setAvailDropdown(prev => ({ ...prev, providers: list }));
    return provider;
  };

  const autoSelectAudio = (PROVIDER, AUDIO, EPISODE = 0) => {
    const provider = autoSelectProvider(PROVIDER);
    let audio = AUDIO;
    const list = Object.entries(providers[provider].episodes)
      .filter(audio => audio[1][EPISODE])
      .map(audio => audio[0]);

    if (!list.includes(audio)) {
      audio = list[0];
    }

    setAvailDropdown(prev => ({
      ...prev,
      audios: list
    }));

    return audio;
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
      episodeList.map((episode, idx) => {
        return (
          <div
            key={episode.title}
            className={style.episodeItem}
            onClick={() => {
              const { provider, audio, type } = videoSource;
              getEpisodeData(provider, audio, type, idx);
              setEpisode(idx);
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
    [videoSource]
  );

  useEffect(() => {
    if (!openStream) {
      setNavigatorOpen(true);
      return;
    }

    setNavigatorOpen(false);

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
          seconds && `${seconds}s`
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
      setVideoSource({ src: null, type: null, provider: null, audio: null });
      setEpisodeList([]);

      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    };
  }, [openStream]);

  return (
    <AnimatePresence>
      {openStream && (
        <motion.div
          className={style.container}
          key='stream-container'
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.5 }}
        >
          <div className={style.animeTitle}>
            <div className={style.backBtn} onClick={() => setOpenStream(false)}>
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
            <MyPlayer
              videoType={videoSource.type?.split(' ')?.at(-1)}
              src={videoSource.src}
              poster={thumbnail}
            ></MyPlayer>
          </div>

          {(() => {
            const { provider, type, audio } = videoSource;
            if (!provider || !audio) return;

            const data = providers[provider].episodes[audio][episode];
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
                            .map((provider, idx) => (
                              <div
                                key={`provider-${idx}`}
                                onClick={e => {
                                  setDropdownState('provider');
                                  getEpisodeData(
                                    e.target.innerText,
                                    audio,
                                    type,
                                    episode
                                  );
                                }}
                              >
                                {provider}
                              </div>
                            ))}
                        </div>
                      )}
                      {openDropdown === 'audio' && (
                        <div className={style.audios}>
                          {availDropdown.audios
                            .filter(i => i !== audio)
                            .map((audio, idx) => (
                              <div
                                key={`audio-${idx}`}
                                onClick={e => {
                                  setDropdownState('audio');
                                  getEpisodeData(
                                    provider,
                                    e.target.innerText,
                                    type,
                                    episode
                                  );
                                }}
                              >
                                {audio}
                              </div>
                            ))}
                        </div>
                      )}
                      {openDropdown === 'video-type' && (
                        <div className={style.videoTypes}>
                          {availDropdown.videoTypes
                            .filter(i => i !== type)
                            .map((type, idx) => (
                              <div
                                key={`video-type-${idx}`}
                                onClick={e => {
                                  setDropdownState('video-type');
                                  getEpisodeData(
                                    provider,
                                    audio,
                                    e.target.innerText,
                                    episode
                                  );
                                }}
                              >
                                {type}
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

                <div className={style.episodes}>{renderedEpisode}</div>
              </div>
            );
          })()}

          <div className={style.safeBottom} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(Stream);
