import style from './Stream.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { useContext, useState, useEffect } from 'react';
import { AppContext } from './App.jsx';
import { CapacitorHttp } from '@capacitor/core';

export default function Stream() {
  const { providers, openStream, ZENITH_HEADERS } = useContext(AppContext);
  const [videoSource, setVideoSource] = useState(null);

  const getEpisode = async () => {
    try {
      const { data } = await CapacitorHttp.get({
        url: `http://localhost:9189/${providers.ally.episodes.sub[0].id}`,
        headers: ZENITH_HEADERS
      });

      const { data: text } = await CapacitorHttp.get({
        url: data.streams[0].url,
        headers: {
          Origin: data.streams[0].referer,
          Referer: data.streams[0].referer
        }
      });
      alert(text);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    if (!openStream) return;
    console.log(providers);

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
            <video src={videoSource} controls></video>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
