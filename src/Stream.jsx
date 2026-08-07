import style from './Stream.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from './App.jsx';
import { CapacitorHttp } from '@capacitor/core';
import { MyPlayer } from './Video.jsx';
import { ArrowLeft } from 'lucide-react';

export default function Stream() {
  const {
    setNavigatorOpen,
    providers,
    openStream,
    setOpenStream,
    ZENITH_HEADERS,
    selProvider,
    selAudio,
    viewAnimeData: anime
  } = useContext(AppContext);

  const [tempProvider, setTempProvider] = useState(null);
  const [tempAudio, setTempAudio] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [videoSource, setVideoSource] = useState({
    src: null,
    type: null
  });

  const animeTitleRef = useRef(null);

  const getEpisode = async (PROVIDER, AUDIO) => {
    console.log(providers);
    const path = providers[PROVIDER].episodes[AUDIO][0];
    const options = {
      url: `http://localhost:9189/${path.id}`,
      headers: ZENITH_HEADERS
    };

    try {
      const { data } = await CapacitorHttp.get(options);

      const group = data.streams.reduce((acc, stream) => {
        if (!acc[stream.type]) acc[stream.type] = [];
        acc[stream.type].push(stream);

        return acc;
      }, {});

      const stream = group['hls'].at(-1);
      setVideoSource({
        src: `http://localhost:9189/proxy/stream?url=${encodeURIComponent(stream.url)}&referer=${encodeURIComponent(stream.referer)}`,
        type: stream.type
      });
    } catch (e) {
      console.log(e);
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
      PROVIDER = Object.keys(providers)[0];
    }

    const audios = providers[PROVIDER].episodes;

    if (!(selAudio in audios)) {
      AUDIO = Object.keys(audios)[0];
    }

    setTempProvider(PROVIDER);
    setTempAudio(AUDIO);
    setThumbnail(providers[PROVIDER].episodes[AUDIO][0].image);

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
      setTempProvider(null)
      setTempAudio(null)
      setThumbnail(null)
    }
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
          <div className={style.videoWrapper}>
            <MyPlayer
              videoType={videoSource.type}
              src={videoSource.src}
              poster={thumbnail}
            ></MyPlayer>
          </div>

          {(() => {
            if (!tempProvider || !tempAudio) return;

            return (
              <div className={style.wrapper}>
                <div className={style.episodeTitle}>
                  {providers[tempProvider].episodes[tempAudio][0].title}
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
