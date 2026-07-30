import style from './Stream.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { useContext, useState, useEffect } from 'react';
import { AppContext } from './App.jsx';
import { CapacitorHttp } from '@capacitor/core'

export default function Stream() {
  const { providers, openStream, ZENITH_HEADERS } = useContext(AppContext);
  const [videoSource, setVideoSource] = useState(null)

  const getEpisode = async () => {
    const {data} = await CapacitorHttp.get({
      url: `http://localhost:9189/${providers.hop.episodes.sub[0].id}`,
      header: ZENITH_HEADERS
    })

    console.log(`http://localhost:9189/${providers.hop.episodes.sub[0].id}`)
    console.log(data)
  }

  useEffect(() => {
    if (!openStream) return
    console.log(providers)

    getEpisode()
    
  }, [openStream])

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
