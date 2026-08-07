import style from './Stream.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { useContext, useState, useEffect } from 'react';
import { AppContext } from './App.jsx';
import { CapacitorHttp } from '@capacitor/core';
import { MyPlayer } from './Video.jsx';
import { ArrowLeft } from "lucide-react"

export default function Stream() {
  const {
    setNavigatorOpen,
    providers,
    openStream,
    ZENITH_HEADERS,
    selProvider,
    selAudio
  } = useContext(AppContext);

  const [tempProvider, setTempProvider] = useState(null);
  const [tempAudio, setTempAudio] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [videoSource, setVideoSource] = useState({
    src: null,
    type: null
  });

  const getEpisode = async () => {
    const path = providers[tempProvider].episodes[tempAudio][0];
    const options = {
      url: `http://localhost:9189/${path.id}`,
      headers: ZENITH_HEADERS
    };

    try {
      const { data } = await CapacitorHttp.get(options);

      console.log(data)

      const group = data.streams.reduce((acc, stream) => {
        if (!acc[stream.type]) acc[stream.type] = [];
        acc[stream.type].push(stream);

        return acc;
      }, {});

      console.log(tempProvider,group);

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
    if (!tempProvider || !tempAudio) return;
    getEpisode();
  }, [tempProvider, tempAudio]);

  useEffect(() => {
    if (!openStream) {
      setNavigatorOpen(true);
      return;
    }
    console.log(providers);
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
            <ArrowLeft />
          </div>
          <div className={style.videoWrapper}>
            <MyPlayer
              videoType={videoSource.type}
              src={videoSource.src}
              poster={thumbnail}
            ></MyPlayer>
          </div>

          {tempAudio && tempProvider && (
            <>
              <div>{providers[tempProvider].episodes[tempAudio][0].title}</div>
              <div className={style.streamTypes}>
                <div className={style.providers}>{tempProvider}</div>
                <div className={style.audios}>{tempAudio}</div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
