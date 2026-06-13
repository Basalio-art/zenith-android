import Home from './Home.jsx';
import style from './App.module.css';
import { useState, useRef, useEffect, createContext } from 'react';
import { WifiOff, TriangleAlert, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import Navigator from './Navigator.jsx';
import Search from './Search.jsx';

export const AnimeDataContext = createContext(null);

const ANILIST_QUERY = `
  query {
    trending: Page(page: 1, perPage: 10) {
      media (sort: TRENDING_DESC, type: ANIME, isAdult: false) {
        id
        title {
          english
          romaji
        }
        coverImage {
          extraLarge
        }
        averageScore
        format
        seasonYear
      }
    }
    popular: Page(page: 1, perPage: 10) {
      media (sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
        id
        title {
          english
          romaji
        }
        coverImage {
          extraLarge
        }
        averageScore
        format
        seasonYear
      }
    }
    topRated: Page(page: 1, perPage: 10) {
      media (sort: SCORE_DESC, type: ANIME, isAdult: false) {
        id
        title {
          english
          romaji
        }
        coverImage {
          extraLarge
        }
        averageScore
        format
        seasonYear
      }
    }
  }
  `;

const PAGE = {
  home: <Home />,
  search: <Search />
};

function App() {
  const [hasInternet, setHasInternet] = useState(true);
  const [message, setMessage] = useState([]);
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [popularAnime, setPopularAnime] = useState([]);
  const [topRatedAnime, setTopRatedAnime] = useState([]);
  const [page, setPage] = useState('home');

  const isInitialMount = useRef(true);

  const internetCheck = async () => {
    if (!navigator.onLine) {
      setHasInternet(false);
      return;
    }

    try {
      await fetch('https://connectivitycheck.gstatic.com/generate_204', {
        method: 'HEAD',
        cache: 'no-store',
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });
      setHasInternet(true);
    } catch {
      setHasInternet(false);
    }
  };

  const newMessage = (msg, type = 'message') => {
    if (!msg) return;
    const id = Date.now() + '-' + (Math.random() * 1000).toFixed(0);

    const message = {
      id,
      message: msg,
      type
    };

    setMessage(prev => [message, ...prev]);

    setTimeout(() => {
      removeMessage(id);
    }, 5000);
  };

  const removeMessage = id => {
    setMessage(prev => prev.filter(message => message.id !== id));
  };

  const fetchAnimeData = async () => {
    if (!hasInternet) return;
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ query: ANILIST_QUERY }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        newMessage('Network response failure', 'alert');
        return;
      }

      const { data } = await response.json();

      setTrendingAnime(data.trending.media);
      setPopularAnime(data.popular.media);
      setTopRatedAnime(data.topRated.media);
    } catch (error) {
      newMessage(`Failed syncing dashboards from AniList`, 'alert');
    }
  };

  useEffect(() => {
    internetCheck();
    fetchAnimeData();

    const intervalChecker = setInterval(internetCheck, 10000);

    window.addEventListener('online', internetCheck);
    window.addEventListener('offline', internetCheck);

    return () => {
      clearInterval(intervalChecker);

      window.removeEventListener('online', internetCheck);
      window.removeEventListener('offline', internetCheck);
    };
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let intervalFetch;
    if (!hasInternet) {
      newMessage('No internet connection detected', 'alert');
    } else {
      fetchAnimeData();

      intervalFetch = setInterval(fetchAnimeData, 360000);

      newMessage('Connection restored', 'alert');
    }
    return () => {
      clearInterval(intervalFetch);
    };
  }, [hasInternet]);

  return (
    <>
      <AnimatePresence>
        {!hasInternet && (
          <motion.div
            className={style.wifiOff}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: { type: 'spring', stiffness: 300, damping: 20 }
            }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
          >
            <WifiOff size={24} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div layout className={style.messageSection}>
        <AnimatePresence>
          {message.map(({ id, message, type }) => (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{
                x: 0,
                opacity: 1,
                transition: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 26
                }
              }}
              exit={{
                x: '-100%',
                opacity: 0,
                transition: { duration: 0.2 }
              }}
              key={id}
              className={style.messageCard}
            >
              {type === 'message' && <MessageSquare size={17} />}
              {type === 'alert' && <TriangleAlert size={17} />}
              <span>{message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimeDataContext.Provider
        value={{ trendingAnime, popularAnime, topRatedAnime }}
      >
        <LayoutGroup>
          <AnimatePresence mode='popLayout'>
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 100 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.15,
                  ease: 'linear'
                }
              }}
              exit={{
                opacity: 0,
                y: 100,
                transition: {
                  duration: 0.15,
                  ease: 'linear'
                }
              }}
              className={style.pageContainer}
            >
              {PAGE[page]}
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>
        <Navigator page={page} setPage={setPage} />
      </AnimeDataContext.Provider>
    </>
  );
}

export default App;
