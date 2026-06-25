import style from './ViewAnime.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp } from 'lucide-react';
import { useState, useContext, useEffect } from 'react';
import { AppContext } from './App.jsx';

function ViewAnime() {
  const {
    viewerOpen,
    setViewerOpen,
    viewAnimeData: anime,
  } = useContext(AppContext);

  const [mainStudio, setMainStudio] = useState(null);
  const [officialSiteUrl, setOfficialSiteUrl] = useState(null);
  const [trailerLoaded, setTrailerLoaded] = useState(false);
  const [expandDescription, setExpandDescription] = useState(false);

  const embededLink = () => {
    if (anime.trailer.site === 'youtube') {
      return `https://www.youtube.com/embed/${anime.trailer.id}`;
    } else if (anime.trailer.site === 'dailymotion') {
      return `https://www.dailymotion.com/embed/video/${anime.trailer.id}`;
    }
  };

  const CapitalizeWords = (words) => {
    return words
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const dateFormat = (date) => {
    const year = date.year;
    const monthIndex = date.month ? date.month - 1 : null;
    const day = date.day;

    if (!monthIndex && !day) {
      return year;
    } else {
      return new Date(year, monthIndex, day).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        day: 'numeric',
      });
    }
  };

  useEffect(() => {
    if (!anime) return;
    console.log(anime);
  }, [anime]);

  useEffect(() => {
    let timeout;
    if (!viewerOpen) {
      timeout = setTimeout(() => {
        setTrailerLoaded(false);
      }, 700);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [viewerOpen]);

  useEffect(() => {
    if (!viewerOpen) return;
    const mainStudio = anime.studios.edges.find((studio) => studio.isMain);
    setMainStudio(mainStudio?.node.name || 'Unknown');

    const officialSite = anime.externalLinks.find(
      (link) => link.site === 'Official Site',
    );
    setOfficialSiteUrl(officialSite?.url || 'Unknown');

    setExpandDescription(false);
  }, [anime]);

  return (
    <>
      {anime && (
        <AnimatePresence>
          <motion.section
            key='view-Anime-Section'
            className={style.viewAnimeSection}
            initial={{ y: '110%', borderTopWidth: 0 }}
            animate={{
              y: viewerOpen ? 0 : '100%',
              borderTopWidth: viewerOpen ? 1 : 0,
              transition: { duration: 0.5 },
            }}
          >
            <motion.div
              initial={{ y: '-100%', rotateX: 0 }}
              animate={{
                rotateX: viewerOpen ? 180 : 0,
                y: viewerOpen ? 0 : '-100%',
                transition: {
                  duration: 0.5,
                },
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

            <AnimatePresence>
              {viewerOpen && anime && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { delay: 0.5 } }}
                  className={style.container}
                >
                  <div
                    className={style.trailerWrapper}
                    data-view-type={`${anime.trailer ? 'video' : anime.bannerImage ? 'banner' : 'cover'}`}
                    style={{
                      background: !anime.bannerImage
                        ? anime.coverImage.color
                        : undefined,
                      backgroundImage: anime.bannerImage
                        ? `url(${anime.bannerImage})`
                        : undefined,
                    }}
                  >
                    <AnimatePresence>
                      {anime.trailer && !trailerLoaded && (
                        <motion.img
                          key={`${anime.id}-thumbnail`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={style.thumbnail}
                          src={anime.trailer.thumbnail}
                        />
                      )}
                    </AnimatePresence>

                    {anime.trailer ? (
                      <iframe
                        src={embededLink()}
                        onLoad={() => {
                          setTrailerLoaded(true);
                        }}
                        title={`${anime.title.english || anime.title.romaji} Trailer`}
                        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                        allowFullScreen
                        className={style.trailerVideo}
                        style={{ border: 'none' }}
                      />
                    ) : (
                      !anime.bannerImage && (
                        <img
                          className={style.coverImage}
                          src={anime.coverImage.extraLarge}
                        />
                      )
                    )}
                  </div>

                  <div className={style.title}>
                    <span className={style.main}>
                      {anime.title.english
                        ? anime.title.english
                        : anime.title.romaji}
                    </span>
                    {anime.title.english && (
                      <span className={style.fallback}>
                        {anime.title.romaji}
                      </span>
                    )}
                  </div>

                  {anime.genres.length > 0 && (
                    <div className={style.genres}>
                      {anime.genres.map((genre, idx) => (
                        <span key={`genres-${idx}`}>{genre}</span>
                      ))}
                    </div>
                  )}

                  <motion.p
                    className={style.description}
                    initial={false}
                    animate={{
                      height: expandDescription ? 'auto' : 72,
                      transition: { duration: 0.5, ease: 'easeOut' },
                    }}
                    style={{ WebkitLineClamp: expandDescription ? 'none' : 4 }}
                    onClick={() => {
                      setExpandDescription(true);
                    }}
                    dangerouslySetInnerHTML={{
                      __html:
                        anime.description ||
                        '<i>No description available for this title.</i>',
                    }}
                  ></motion.p>

                  <div className={style.stats}>
                    {anime.tags.length > 0 && (
                      <p>
                        Tags:{' '}
                        <span>
                          {anime.tags
                            .filter((tag) => !tag.isGeneralSpoiler)
                            .map((tag) => tag.name)
                            .join(', ')}
                        </span>
                      </p>
                    )}

                    <p>
                      Format: <span>{anime.format?.replace('_', ' ') || 'Unknown'}</span>
                    </p>

                    <p>
                      Status:{' '}
                      <span>
                        {anime.status === 'RELEASING'
                          ? 'Airing'
                          : CapitalizeWords(anime.status.replace(/(_)/g, ' '))}
                      </span>
                    </p>

                    <p>
                      Episode:{' '}
                      <span>
                        {anime.nextAiringEpisode
                          ? Math.max(anime.nextAiringEpisode.episode - 1, 1)
                          : anime.episodes}
                      </span>
                    </p>

                    <p>
                      Rating:{' '}
                      <span>
                        {anime.averageScore > 0 ? anime.averageScore : '-'} /
                        100
                      </span>
                    </p>

                    <p>
                      {anime.status === 'NOT_YET_RELEASED' ||
                      anime.format === 'MOVIE'
                        ? 'Release'
                        : 'Start'}{' '}
                      Date: <span>{dateFormat(anime.startDate)}</span>
                    </p>

                    {anime.status === 'NOT_YET_RELEASED' ||
                      (anime.format === 'MOVIE' ? (
                        ''
                      ) : (
                        <p>
                          End Date: <span>{dateFormat(anime.endDate)}</span>
                        </p>
                      ))}

                    <p>
                      Country: <span>{anime.countryOfOrigin}</span>
                    </p>

                    <p>
                      Mature Content:{' '}
                      <span style={{ fontWeight: 'bold' }}>
                        {(() => {
                          const MATURE_GENRES = [
                            'Horror',
                            'Ecchi',
                          ];
                          const MATURE_TAGS = [
                            'Gore',
                            'Violence',
                            'Body Horror',
                            'Nudity',
                          ];

                          const isMature =
                            anime.genres.some((g) =>
                              MATURE_GENRES.includes(g),
                            ) ||
                            anime.tags.some((t) =>
                              MATURE_TAGS.includes(t.name),
                            );

                          return isMature ? 'Yes (17+)' : 'No (All Ages)';
                        })()}
                      </span>
                    </p>

                    <p>
                      Main Studio: <span>{mainStudio}</span>
                    </p>

                    {(() => {
                      const supportingStudios = anime.studios.edges.find(
                        (studio) => !studio.isMain,
                      );

                      if (supportingStudios)
                        return (
                          <p>
                            Supporting Studio:{' '}
                            <span>
                              {anime.studios.edges
                                .filter((studio) => !studio.isMain)
                                .map((studio) => studio.node.name)
                                .join(', ')}
                            </span>
                          </p>
                        );
                    })()}

                    <p>
                      Official Site:{' '}
                      {officialSiteUrl ? (
                        <a
                          target='_blank'
                          rel='noreferrer noopener'
                          href={officialSiteUrl}
                        >
                          {officialSiteUrl}
                        </a>
                      ) : (
                        <span>{officialSiteUrl}</span>
                      )}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </AnimatePresence>
      )}
    </>
  );
}

export default ViewAnime;
