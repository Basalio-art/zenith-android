import style from './Search.module.css';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useContext, useRef, memo } from 'react';
import { ChevronRight, Search, X, ScanLine, Star } from 'lucide-react';
import { AppContext } from './App.jsx';

function SearchResult() {
  const {
    setSearchQuery,
    searchData,
    searchQuery,
    setSearchInputClear,
    searchInputClear,
    searchIsLoading,
    setViewAnimeData,
    setViewerOpen,
  } = useContext(AppContext);

  const [isSearching, setIsSearching] = useState(false);

  const searchInputRef = useRef(null);

  const handleScroll = (e) => {
    const target = e.target;

    const height = target.clientHeight;
    const scrollHeight = target.scrollHeight;
    const bottomScroll = scrollHeight - (height + 10);

    console.log(bottomScroll, target.scrollTop)
  };

  return (
    <>
      <section className={style.searchSection}>
        <div className={style.top}>
          <AnimatePresence>
            {searchIsLoading && (
              <motion.div
                key='loader'
                initial={{ width: 0, height: 2.5 }}
                animate={{
                  width: '65%',
                  transition: { duration: 5 },
                }}
                exit={{
                  height: 0,
                  width: '100%',
                  transition: {
                    width: { duration: 0.25 },
                    height: { duration: 0.25, delay: 0.25 },
                  },
                }}
                className={style.loader}
              />
            )}
          </AnimatePresence>
          <AnimatePresence mode='popLayout'>
            {!isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={style.left}
              >
                <span>Search Result</span>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            className={style.right}
            initial={false}
            animate={{
              width: isSearching ? '100%' : '25px',
              transition: { duration: isSearching ? 0.5 : 0.15 },
            }}
          >
            <AnimatePresence mode='wait'>
              <motion.div
                key={`isSearching-${isSearching}`}
                initial={{ rotate: 0 }}
                animate={{
                  rotate: -360,
                  transition: {
                    type: 'spring',
                    duration: isSearching ? 1.5 : 0.5,
                    bounce: 0.5,
                  },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.05 },
                }}
                onClick={() => {
                  if (isSearching) {
                    setIsSearching(false);
                  } else {
                    setIsSearching(true);
                  }
                }}
              >
                {isSearching ? (
                  <X
                    size={25}
                    onClick={() => {
                      setSearchInputClear(true);
                    }}
                  />
                ) : (
                  <Search size={25} />
                )}
              </motion.div>
            </AnimatePresence>
            <AnimatePresence>
              {isSearching && (
                <motion.div
                  initial={{ width: 'auto', opacity: 0 }}
                  animate={{ width: '100%', opacity: 1 }}
                  exit={{ width: 'auto', opacity: 0 }}
                  className={style.wrapper}
                >
                  <input
                    type='text'
                    autoFocus
                    autoComplete='off'
                    ref={searchInputRef}
                    defaultValue={!searchInputClear ? searchQuery : ''}
                    placeholder='Search title'
                    onKeyUp={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim() !== '') {
                        setSearchInputClear(false);
                        setSearchQuery(e.target.value.trim());
                      }
                    }}
                  />
                  <div className={style.hr} />
                  <ScanLine
                    size={20}
                    onClick={() => {
                      if (
                        !searchInputRef.current ||
                        searchInputRef.current.value.trim() === ''
                      )
                        return;

                      setSearchInputClear(false);
                      setSearchQuery(searchInputRef.current.value.trim());
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <AnimatePresence mode='popLayout'>
          <motion.div
            className={style.result}
            key={searchData.length !== 0 ? searchData[0].id : 'empty'}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.25 } }}
            exit={{ opacity: 0, y: 100, transition: { duration: 0.25 } }}
            onScroll={handleScroll}
          >
            {searchData.length === 0 && (
              <span className={style.infoSearch}>No result</span>
            )}
            {searchData.length !== 0 &&
              searchData.map((anime) => (
                <AnimeCard
                  key={`search-query-${anime.id}`}
                  anime={anime}
                  setViewData={setViewAnimeData}
                  viewer={setViewerOpen}
                />
              ))}
          </motion.div>
        </AnimatePresence>
      </section>
    </>
  );
}

const AnimeCard = memo(({ anime, setViewData, viewer }) => {
  return (
    <div
      className={style.card}
      onClick={() => {
        setViewData(anime);
        viewer(true);
      }}
    >
      <img src={anime.coverImage.extraLarge} />
      <div className={style.wrapper}>
        <span className={style.title}>
          {anime.title.english || anime.title.romaji}
        </span>
        <div className={style.seasonYearWrapper}>
          <span className={style.year}>
            {anime.seasonYear || anime.format.replace('_', ' ')}
          </span>
          {anime.averageScore && (
            <div className={style.score}>
              <Star size={12.5} />
              <span>{(anime.averageScore / 10).toFixed(1)}</span>
            </div>
          )}
        </div>
        <p
          className={style.description}
          dangerouslySetInnerHTML={{
            __html:
              anime.description ||
              '<i>No description available for this title.</i>',
          }}
        />
        <div className={style.space} />
        <div className={style.viewDetails}>
          <span>VIEW DETAILS</span>
          <ChevronRight size={17.5} />
        </div>
      </div>
    </div>
  );
});

export default SearchResult;
