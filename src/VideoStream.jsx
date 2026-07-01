import style from "./VideoStream.module.css";
import { useState, useContext, useEffect } from "react";
import { AppContext } from "./App.jsx";
import { useAnime } from "./AnimeContext.jsx";
import { motion, AnimatePresence } from "motion/react";
import { MyPlayer } from "./MyPlayer.jsx";

function VideoStream() {
  const [activeServer, setActiveServer] = useState("kiwi");
  const [activeAudio, setActiveAudio] = useState("sub");
  const [servers, setServers] = useState([]);
  const [audios, setAudios] = useState([]);
  const [video, setVideo] = useState({
    src: null,
    poster: null
  });

  const { openPlayer } = useContext(AppContext);

  const { animeData, setEpisodeId } = useAnime();

  useEffect(() => {
    if (!openPlayer) return;
    console.log(animeData);

    const selectServer = () => {
      const availServers = Object.keys(animeData.providers);

      setServers(availServers);
      setActiveServer((prev) =>
        availServers.some((server) => server === prev) ? prev : availServers[0],
      );

      setEpisodeId(
        animeData.providers[activeServer].episodes[activeAudio][0].id,
      );
    };

    selectServer();
  }, [openPlayer]);

  useEffect(() => {
    if (!animeData.providers) return

    console.log(animeData)
    setVideo(prev => ({
      ...prev,
      src: animeData.streams,
      poster: animeData.providers[activeServer].episodes[activeAudio][0].image
    }))
  }, [animeData])

  return (
    <>
      <AnimatePresence>
        {openPlayer && (
          <motion.section
            className={style.videoStreamSection}
            key="video-stream"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5 }}
          >
            <div className={style.videoWrapper}>
              <MyPlayer src={video.src} thumbnail={video.poster} />
            </div>

            <div className={style.serversWrapper}>
              <div className={style.server}>{activeServer}</div>
              <div className={style.audio}>{activeAudio}</div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

export default VideoStream;
