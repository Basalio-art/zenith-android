import { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from './App.jsx';
import { motion, AnimatePresence } from 'motion/react';
import style from './Home.module.css';
import {
  ScanLine,
  Search,
  Zap,
  ChevronLeft,
  ChevronRight,
  Flame,
  Crown,
  Star
} from 'lucide-react';

function Home() {
  const {
    trendingAnime,
    popularAnime,
    topRatedAnime,
    setSearchQuery,
    setPage,
    setViewAnimeData,
    setViewerOpen
  } = useContext(AppContext);

  const trendingRef = useRef(null);
  const popularRef = useRef(null);
  const topRatedRef = useRef(null);
  const searchInputRef = useRef(null);

  const calculateCardsWidth = container => {
    if (!container) return;

    const containerStyle = getComputedStyle(container);
    const gap = parseFloat(containerStyle.gap) || 0;
    const containerWidth = container.clientWidth;
    let width = (containerWidth - gap) / 2;

    if (width >= 200) {
      const cardCount = Math.round(containerWidth / 150);
      const totalGap = (cardCount - 1) * gap;
      const totalSpace = containerWidth - totalGap;
      width = totalSpace / cardCount;
    }

    Array.from(container.children).forEach(card => {
      card.parentNode.style.setProperty('--flex-basis', width + 'px');
    });
  };

  const handleScroll = (container, direction) => {
    if (!container) return;

    const card = container.children[0];
    const cardWidth = card.clientWidth;
    const gap = parseFloat(getComputedStyle(container).gap);
    const scrollAmount = cardWidth + gap;

    container.scrollTo({
      left:
        container.scrollLeft +
        (direction === 'right' ? scrollAmount : -scrollAmount),
      behavior: 'smooth'
    });
  };

  const scrollDataset = container => {
    if (!container) return;

    const scrollStart = 10;
    const scrollEnd = container.scrollWidth - container.clientWidth - 10;

    if (container.scrollLeft <= scrollStart) {
      container.parentNode.dataset.scroll = 'start';
    } else if (container.scrollLeft >= scrollEnd) {
      container.parentNode.dataset.scroll = 'end';
    } else {
      container.parentNode.dataset.scroll = 'between';
    }
  };

  useEffect(() => {
    const containersObserve = () => {
      calculateCardsWidth(trendingRef.current);
      calculateCardsWidth(popularRef.current);
      calculateCardsWidth(topRatedRef.current);
    };
    containersObserve();
    window.addEventListener('resize', containersObserve);

    return () => {
      window.removeEventListener('resize', containersObserve);
    };
  }, []);

  return (
    <section className={style.homeSection}>
      <div className={style.welcomeSection}>
        <div className={style.banner}>
          <span className={style.top}>
            Discover <span>Zenith</span>
          </span>
          <span className={style.bottom}>
            Welcome back, <span>Ervin-kun 👋</span>
          </span>
        </div>
      </div>

      <div className={style.searchBar}>
        <Search className={style.searchIcon} />
        <input
          type='text'
          autoComplete='off'
          placeholder="Search"
          ref={searchInputRef}
          onKeyUp={e => {
            if (e.key === 'Enter') {
              if (e.target.value.trim() === '') return;
              setSearchQuery(e.target.value.trim());
              setPage('search');
            }
          }}
        />
        <div className={style.hr} />
        <ScanLine
          className={style.scanLine}
          onClick={() => {
            if (
              !searchInputRef.current ||
              searchInputRef.current.value.trim() === ''
            )
              return;

            setSearchQuery(searchInputRef.current.value.trim());
            setPage('search');
          }}
        />
      </div>

      <div className={style.trending} data-scroll='start'>
        <div className={style.top}>
          <div className={style.left}>
            <Zap className={style.zap} />
            <span>Trending</span>
          </div>

          <div className={style.right}>
            <ChevronLeft
              className={style.chevronLeft}
              role='button'
              onClick={() => handleScroll(trendingRef.current, 'left')}
            />
            <ChevronRight
              className={style.chevronRight}
              role='button'
              onClick={() => handleScroll(trendingRef.current, 'right')}
            />
          </div>
        </div>

        <div
          className={style.carousel}
          ref={trendingRef}
          onScroll={() => scrollDataset(trendingRef.current)}
        >
          <AnimatePresence>
            {trendingAnime.length === 0
              ? [...Array(10)].map((_, idx) => (
                  <div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={`trending-card-${idx}`}
                    className={`${style.card} ${style.loading}`}
                  ></div>
                ))
              : trendingAnime.map(anime => (
                  <div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={`trending-card-${anime.id}`}
                    className={style.card}
                    onClick={() => {
                      setViewAnimeData(anime);
                      setViewerOpen(true);
                    }}
                  >
                    <img
                      className={style.loading}
                      onLoad={e => {
                        e.target.classList.remove(style.loading);
                      }}
                      src={anime.coverImage.extraLarge}
                      alt={anime.title.english || anime.title.romaji}
                    />
                    {anime.averageScore && (
                      <motion.div
                        initial={{ opacity: 0, y: '-100%' }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: { duration: 1 }
                        }}
                        className={style.rate}
                      >
                        <Star className={style.star} size={12.5} />
                        <span>{(anime.averageScore / 10).toFixed(1)}</span>
                      </motion.div>
                    )}
                    <motion.div
                      initial={{ y: `100%` }}
                      animate={{ y: 0, transition: { duration: 1 } }}
                      className={style.titleWrapper}
                    >
                      <span className={style.seasonYear}>
                        {anime.format.replace('_', ' ')} &bull;{' '}
                        {anime.seasonYear}
                      </span>
                      <span className={style.title}>
                        {anime.title.english || anime.title.romaji}
                      </span>
                    </motion.div>
                  </div>
                ))}
          </AnimatePresence>
        </div>
      </div>

      <div className={style.popular} data-scroll='start'>
        <div className={style.top}>
          <div className={style.left}>
            <Flame className={style.flame} />
            <span>Popular</span>
          </div>

          <div className={style.right}>
            <ChevronLeft
              className={style.chevronLeft}
              role='button'
              onClick={() => handleScroll(popularRef.current, 'left')}
            />
            <ChevronRight
              className={style.chevronRight}
              role='button'
              onClick={() => handleScroll(popularRef.current, 'right')}
            />
          </div>
        </div>

        <div
          className={style.carousel}
          ref={popularRef}
          onScroll={() => scrollDataset(popularRef.current)}
        >
          <AnimatePresence>
            {popularAnime.length === 0
              ? [...Array(10)].map((_, idx) => (
                  <div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={`popular-card-${idx}`}
                    className={`${style.card} ${style.loading}`}
                  ></div>
                ))
              : popularAnime.map(anime => (
                  <div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={`popular-card-${anime.id}`}
                    className={style.card}
                    onClick={() => {
                      setViewAnimeData(anime);
                      setViewerOpen(true);
                    }}
                  >
                    <img
                      className={style.loading}
                      onLoad={e => {
                        e.target.classList.remove(style.loading);
                      }}
                      src={anime.coverImage.extraLarge}
                      alt={anime.title.english || anime.title.romaji}
                    />
                    {anime.averageScore && (
                      <motion.div
                        initial={{ opacity: 0, y: '-100%' }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: { duration: 1 }
                        }}
                        className={style.rate}
                      >
                        <Star className={style.star} size={12.5} />
                        <span>{(anime.averageScore / 10).toFixed(1)}</span>
                      </motion.div>
                    )}
                    <motion.div
                      initial={{ y: `100%` }}
                      animate={{ y: 0, transition: { duration: 1 } }}
                      className={style.titleWrapper}
                    >
                      <span className={style.seasonYear}>
                        {anime.format.replace('_', ' ')} &bull;{' '}
                        {anime.seasonYear}
                      </span>
                      <span className={style.title}>
                        {anime.title.english || anime.title.romaji}
                      </span>
                    </motion.div>
                  </div>
                ))}
          </AnimatePresence>
        </div>
      </div>

      <div className={style.topRated} data-scroll='start'>
        <div className={style.top}>
          <div className={style.left}>
            <Crown className={style.crown} />
            <span>Top Rated</span>
          </div>

          <div className={style.right}>
            <ChevronLeft
              className={style.chevronLeft}
              role='button'
              onClick={() => handleScroll(topRatedRef.current, 'left')}
            />
            <ChevronRight
              className={style.chevronRight}
              role='button'
              onClick={() => handleScroll(topRatedRef.current, 'right')}
            />
          </div>
        </div>

        <div
          className={style.carousel}
          ref={topRatedRef}
          onScroll={() => scrollDataset(topRatedRef.current)}
        >
          <AnimatePresence>
            {topRatedAnime.length === 0
              ? [...Array(10)].map((_, idx) => (
                  <div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={`top-rated-card-${idx}`}
                    className={`${style.card} ${style.loading}`}
                  ></div>
                ))
              : topRatedAnime.map(anime => (
                  <div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={`top-rated-card-${anime.id}`}
                    className={style.card}
                    onClick={() => {
                      (setViewAnimeData(anime), setViewerOpen(true));
                    }}
                  >
                    <img
                      className={style.loading}
                      onLoad={e => {
                        e.target.classList.remove(style.loading);
                      }}
                      src={anime.coverImage.extraLarge}
                      alt={anime.title.english || anime.title.romaji}
                    />
                    {anime.averageScore && (
                      <motion.div
                        initial={{ opacity: 0, y: '-100%' }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: { duration: 1 }
                        }}
                        className={style.rate}
                      >
                        <Star className={style.star} size={12.5} />
                        <span>{(anime.averageScore / 10).toFixed(1)}</span>
                      </motion.div>
                    )}
                    <motion.div
                      initial={{ y: `100%` }}
                      animate={{ y: 0, transition: { duration: 1 } }}
                      className={style.titleWrapper}
                    >
                      <span className={style.seasonYear}>
                        {anime.format.replace('_', ' ')} &bull;{' '}
                        {anime.seasonYear}
                      </span>
                      <span className={style.title}>
                        {anime.title.english || anime.title.romaji}
                      </span>
                    </motion.div>
                  </div>
                ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default Home;
