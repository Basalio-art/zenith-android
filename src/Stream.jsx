import style from './Stream.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { useContext, useState, useEffect } from 'react';
import { AppContext } from './App.jsx';
import { CapacitorHttp } from '@capacitor/core';
import { MyPlayer } from './VideoJs.jsx';

export default function Stream() {
  const { providers, openStream, ZENITH_HEADERS, selProvider, selAudio } =
    useContext(AppContext);
  const [videoSource, setVideoSource] = useState({
    src: null,
    type: null
  });

  const getEpisode = async () => {
    try {
      const { data } = await CapacitorHttp.get({
        url: `http://localhost:9189/${providers[selProvider].episodes[selAudio][0].id}`,
        headers: ZENITH_HEADERS
      });

      console.log(data)
      setVideoSource({
        src: `http://localhost:9189/proxy/stream?url=${encodeURIComponent(data.streams[0].url)}&referer=${encodeURIComponent(data.streams[0].referer)}`,
        type: data.streams[0].type
      });
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    if (!openStream) return;
    getEpisode();
  }, [openStream]);

  return (
    <>
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
            <div className={style.videoWrapper}>
              <MyPlayer
                videoType={videoSource.type}
                src={videoSource.src}
                poster={providers.kiwi.episodes.sub[0].image}
              ></MyPlayer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
