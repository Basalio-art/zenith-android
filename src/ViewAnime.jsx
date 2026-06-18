import style from './ViewAnime.module.css';
import { motion } from 'motion/react';
import { ChevronUp } from 'lucide-react';
import { useState, useContext, useEffect } from 'react';
import { AppContext } from './App.jsx';

function ViewAnime() {
  const {
    viewerOpen,
    setViewerOpen,
    viewAnimeData: anime
  } = useContext(AppContext);

  useEffect(() => {
    if (!anime) return;
    console.log(anime);
  }, [anime]);

  return (
    <>
      <motion.section
        className={style.viewAnimeSection}
        initial={{ y: '100%', borderTopWidth: 0 }}
        animate={{
          y: viewerOpen ? 0 : '100%',
          borderTopWidth: viewerOpen ? 1 : 0,
          transition: { duration: 0.5 }
        }}
      >
        <motion.div
          initial={{ y: '-100%', rotateX: 0 }}
          animate={{
            rotateX: viewerOpen ? 180 : 0,
            y: viewerOpen ? 0 : '-100%',
            transition: {
              duration: 0.5
            }
          }}
          className={style.chevronUp}
          onClick={() => {
            if (viewerOpen) {
              setViewerOpen(false);
            } else {
              setViewerOpen(true);
            }
          }}
        >
          <ChevronUp size={30} />
        </motion.div>

        {viewerOpen && anime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={style.container}
          >
            <div className={style.trailerWrapper}>
              <iframe
                src={`https://www.youtube.com/embed/${anime.trailer.id}`}
                title={`${anime.title.english || anime.title.romaji} Trailer`}
                frameBorder='0'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                allowFullScreen
                className={style.trailerVideo}
              />
            </div>
          </motion.div>
        )}
      </motion.section>
    </>
  );
}

export default ViewAnime;
