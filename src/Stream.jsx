import style from './Stream.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from './App.jsx';
import { CapacitorHttp } from '@capacitor/core';
import { MyPlayer } from './Video.jsx';
import { ArrowLeft } from 'lucide-react';

const ColorType = {
  hls: '#ffa000'
};

export default function Stream() {
  const {
    setNavigatorOpen,
    providers,
    openStream,
    setOpenStream,
    selStreamType,
    selProvider,
    selAudio,
    viewAnimeData: anime
  } = useContext(AppContext);

  const [tempProvider, setTempProvider] = useState(null);
  const [tempAudio, setTempAudio] = useState(null);
  const [tempVideoType, setTempVideoType] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [episode, setEpisode] = useState(1);
  const [openDropdown, setOpenDropDown] = useState(null);
  const [availDropdown, setAvailDropdown] = useState({
    providers: [],
    videoTypes: [],
    audios: []
  });
  const [videoSource, setVideoSource] = useState({
    src: null,
    type: null
  });

  const animeTitleRef = useRef(null);

  const setDropdown = dr => {
    if (openDropdown === dr) setOpenDropDown(null);
    else setOpenDropDown(dr);
  };

  const getEpisode = async (PROVIDER, AUDIO) => {
    const path = providers[PROVIDER].episodes[AUDIO][episode - 1];
    const options = {
      url: `http://localhost:9189/${path.id}`
    };

    try {
      const { data } = await CapacitorHttp.get(options);

      if (typeof data !== 'object') {
        setVideoSource({ src: null, type: null });
      }

      const group = data.streams.reduce((acc, stream) => {
        if (!acc[stream.type]) acc[stream.type] = [];
        acc[stream.type].push(stream);

        return acc;
      }, {});

      setAvailDropdown(prev => ({ ...prev, videoTypes: Object.keys(group) }));

      let VIDEOTYPE = selStreamType;
      if (!(VIDEOTYPE in group)) {
        VIDEOTYPE = Object.keys(group)[0];
      }

      setTempVideoType(VIDEOTYPE);

      const stream = group[VIDEOTYPE].at(-1);
      setVideoSource({
        src: `http://localhost:9189/proxy/stream?url=${encodeURIComponent(stream.url)}&referer=${encodeURIComponent(stream.referer)}`,
        type: stream.type
      });
    } catch (e) {
      console.log(e);
      setVideoSource({ src: null, type: null });
    }
  };

  useEffect(() => {
    if (!openStream) {
      setNavigatorOpen(true);
      return;
    }

    setNavigatorOpen(false);

    let PROVIDER = selProvider;
    let AUDIO = selAudio;


    if (!(selProvider in providers)) {
      PROVIDER = Object.keys(providers).at(-1);
    }

    console.log(providers, PROVIDER)
    const audios = providers[PROVIDER].episodes;

    if (!(selAudio in audios)) {
      AUDIO = Object.keys(audios)[0];
    }

    setTempProvider(PROVIDER);
    setTempAudio(AUDIO);
    setThumbnail(
      providers[PROVIDER].episodes[AUDIO][0].image ??
        anime.bannerImage ??
        anime.coverImage.extraLarge
    );
    setAvailDropdown(prev => ({
      ...prev,
      providers: Object.keys(providers),
      audios: Object.keys(audios)
    }));

    getEpisode(PROVIDER, AUDIO);

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

    animeTitleDisplay();
    return () => {
      setTempProvider(null);
      setTempAudio(null);
      setTempVideoType(null);
      setOpenDropDown(null);
      setThumbnail(null);
      setAvailDropdown({
        providers: [],
        videoTypes: [],
        audios: []
      });
      setVideoSource({ src: null, type: null });
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
              videoType={videoSource.type}
              src={videoSource.src}
              poster={thumbnail}
            ></MyPlayer>
          </div>

          {(() => {
            if (!tempProvider || !tempAudio) return;

            const data = providers[tempProvider].episodes[tempAudio][0];
            return (
              <div className={style.wrapper}>
                <div className={style.episodeTitle}>
                  {episode}. {data.title}
                </div>

                <div className={style.sypnosisContainer}>
                  <div className={style.head}>Sypnosis</div>
                  <div className={style.sypnosis}>{data.description}</div>
                </div>

                {videoSource.type && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={style.providerWrapper}
                  >
                    <div
                      className={style.provider}
                      onClick={() => {
                        setDropdown('provider');
                      }}
                    >
                      {tempProvider}
                    </div>
                    <div
                      className={style.videoType}
                      onClick={() => {
                        setDropdown('video-type');
                      }}
                    >
                      {videoSource.type}
                    </div>
                    <div
                      className={style.audio}
                      onClick={() => {
                        setDropdown('audio');
                      }}
                    >
                      {tempAudio}
                    </div>

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
                              .filter(i => i !== tempProvider)
                              .map((provider, idx) => (
                                <div key={`provider-${idx}`}>{provider}</div>
                              ))}
                          </div>
                        )}
                        {openDropdown === 'video-type' && (
                          <div className={style.videoTypes}>
                            {availDropdown.videoTypes
                              .filter(i => i !== tempVideoType)
                              .map((type, idx) => (
                                <div key={`video-type-${idx}`}>{type}</div>
                              ))}
                          </div>
                        )}
                        {openDropdown === 'audio' && (
                          <div className={style.audios}>
                            {availDropdown.audios
                              .filter(i => i !== tempAudio)
                              .map((audio, idx) => (
                                <div key={`audio-${idx}`}>{audio}</div>
                              ))}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
