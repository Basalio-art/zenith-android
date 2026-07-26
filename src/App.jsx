import Home from './Home.jsx';
import style from './App.module.css';
import { useState, useRef, useEffect, createContext } from 'react';
import { WifiOff, TriangleAlert, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Capacitor, CapacitorHttp, SystemBars } from '@capacitor/core';
import Navigator from './Navigator.jsx';
import SearchResult from './Search.jsx';
import ViewAnime from './ViewAnime.jsx';

const hideSystemBars = async () => {
  await SystemBars.hide()
}

export const AppContext = createContext(null);

const renderPage = (page) => {
  switch (page) {
    case 'search':
      return <SearchResult />;
    case 'home':
      return <Home />;
  }
};

const ZENITH_HEADERS = {
  Origin: 'http://zenith.app',
  Referer: 'http://zenith.app',
};

const CURRENT_VERSION = '1.4.0';

const CONFIG_URL =
  'https://raw.githubusercontent.com/Basalio-art/zenith-android/refs/heads/main/config.json';

function App() {
  const [hasInternet, setHasInternet] = useState(true);
  const [message, setMessage] = useState([]);
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [popularAnime, setPopularAnime] = useState([]);
  const [latestAnime, setLatestAnime] = useState([]);
  const [searchData, setSearchData] = useState([]);
  const [searchQuery, setSearchQuery] = useState(null);
  const [searchInputClear, setSearchInputClear] = useState(false);
  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewAnimeData, setViewAnimeData] = useState(null);
  const [openPlayer, setOpenPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState('home');

  const isInitialInternetMount = useRef(true);
  const isInitialRequirementsMount = useRef(true);

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
        signal: AbortSignal.timeout(5000),
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
      type,
    };

    setMessage((prev) => [message, ...prev]);

    setTimeout(() => {
      removeMessage(id);
    }, 5000);
  };

  const handleMessageDragEnd = (e, id) => {
    if (e.offset.x <= -50 || e.offset.x >= 120) {
      removeMessage(id);
    }
  };

  const removeMessage = (id) => {
    setMessage((prev) => prev.filter((message) => message.id !== id));
  };

  const fetchAnimeData = async () => {
    if (!hasInternet) return;

    try {
      const { data: trending, status: trendingStatus } =
        await CapacitorHttp.get({
          url: 'http://localhost:9189/trending?page=1&per_page=20',
          headers: ZENITH_HEADERS,
        });
      const { data: popular, status: popularStatus } = await CapacitorHttp.get({
        url: 'http://localhost:9189/popular?page=1&per_page=20',
        headers: ZENITH_HEADERS,
      });
      const { data: recent, status: recentStatus } = await CapacitorHttp.get({
        url: 'http://localhost:9189/recent?page=1&per_page=20',
        headers: ZENITH_HEADERS,
      });

      setTrendingAnime((prev) =>
        trendingStatus === 200 ? trending.results : prev,
      );
      setPopularAnime((prev) =>
        popularStatus === 200 ? popular.results : prev,
      );
      setLatestAnime((prev) => (recentStatus === 200 ? recent.results : prev));
    } catch (error) {
      console.log('Error', error);
      // newMessage(`Failed syncing dashboards from AniList`, "alert");
    }
  };

  const fetchSearchQuery = async (query, page = 1) => {
    setSearchIsLoading(true);
    try {
      const { data } = await CapacitorHttp.get({
        url: `http://localhost:9189/search`,
        headers: ZENITH_HEADERS,
        params: {
          query: query,
          page: page,
          per_page: 50,
        },
      });

      setSearchData(data.results || []);
    } catch (error) {
      setSearchData([]);
      newMessage(
        'Search failed: Please check your internet connection',
        'alert',
      );
      setSearchQuery(null);
    }
    setSearchIsLoading(false);
  };

  const checkVersion = async () => {
    let version = CURRENT_VERSION;
    try {
      const { data } = await CapacitorHttp.get({
        url: CONFIG_URL,
        connectTimeout: 5000,
        readTimeout: 5000,
      });

      version = JSON.parse(data)['app-version'];
    } catch {}

    return new Promise((resolve) => {
      resolve(version);
    });
  };

  const checkBackendR = async () => {
    let isRunning = false;

    try {
      await CapacitorHttp.request({
        url: 'http://localhost:9189',
        method: 'HEAD',
        cache: 'no-store',
        connectTimeout: 5000,
        readTimeout: 5000,
      });
    } catch {}

    return new Promise((resolve) => {
      resolve(isRunning);
    });
  };

  const loadingStartup = async () => {
    await checkVersion();
    await checkBackendR();
    setIsLoading(false);
  };

  useEffect(() => {
    if (!searchQuery) return;

    fetchSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (isInitialInternetMount.current) {
      isInitialInternetMount.current = false;
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

  useEffect(() => {
    internetCheck();

    if (isLoading) {
      loadingStartup();
      return;
    }

    fetchAnimeData();

    const intervalChecker = setInterval(internetCheck, 10000);

    window.addEventListener('online', internetCheck);
    window.addEventListener('offline', internetCheck);

    return () => {
      clearInterval(intervalChecker);

      window.removeEventListener('online', internetCheck);
      window.removeEventListener('offline', internetCheck);
    };
  }, [isLoading]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      hideSystemBars()
    }
  }, [])

  return (
    <>
      {!isLoading && (
        <div className={style.body}>
          <AnimatePresence>
            {!hasInternet && (
              <motion.div
                className={style.wifiOff}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  transition: { type: 'spring', stiffness: 300, damping: 20 },
                }}
                exit={{
                  scale: 0,
                  opacity: 0,
                  transition: { duration: 0.15 },
                }}
              >
                <WifiOff size={24} />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.section layout className={style.messageSection}>
            <AnimatePresence>
              {message.map(({ id, message, type }) => (
                <motion.div
                  initial={{ x: '-100%', opacity: 0 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={{ left: 0.5, right: 0.5 }}
                  onDragEnd={(_, i) => handleMessageDragEnd(i, id)}
                  animate={{
                    x: 0,
                    opacity: 1,
                    transition: {
                      type: 'spring',
                      stiffness: 300,
                      damping: 26,
                    },
                  }}
                  exit={{
                    x: '-100%',
                    opacity: 0,
                    transition: { duration: 0.2 },
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
          </motion.section>

          <AppContext.Provider
            value={{
              ZENITH_HEADERS,
              trendingAnime,
              popularAnime,
              latestAnime,
              searchData,
              setSearchQuery,
              searchQuery,
              setSearchInputClear,
              searchInputClear,
              page,
              setPage,
              searchIsLoading,
              viewerOpen,
              setViewerOpen,
              hasInternet,
              setViewAnimeData,
              viewAnimeData,
              setOpenPlayer,
              openPlayer,
            }}
          >
            <div className={style.wrapper}>
              <LayoutGroup>
                <AnimatePresence mode="popLayout">
                  {
                    <motion.div
                      key={page}
                      initial={{ opacity: 0, y: 100 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: 0.15,
                          ease: 'linear',
                        },
                      }}
                      exit={{
                        opacity: 0,
                        y: 100,
                        transition: {
                          duration: 0.15,
                          ease: 'linear',
                        },
                      }}
                      className={style.pageContainer}
                    >
                      {renderPage(page)}
                    </motion.div>
                  }
                </AnimatePresence>
              </LayoutGroup>

              <ViewAnime />
            </div>

            <Navigator />
          </AppContext.Provider>
        </div>
      )}
      {/* {(() => {
        if (isLatestVersion === null || termuxBackendRunning === null) return;
        const { appVersion, backend } = validRequirements;
        const variant = {
          hidden: {
            opacity: 0,
            y: -20,
            transition: {
              duration: 0.5,
            },
          },
          show: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.5,
            },
          },
        };
        let children;
        if (!appVersion) {
          children = (
            <motion.div
              className={style.updateNotice}
              initial={variant.hidden}
              animate={variant.show}
            >
              <TriangleAlert className={style.triangleAlert} size={30} />A new
              version of Zenith is available. Update now to get the latest
              features and performance improvements.
              <div className={style.downloadBtn}>Download v1.5.0</div>
            </motion.div>
          );
        } else if (!backend) {
          children = (
            <motion.div
              className={style.backendInfo}
              initial={variant.hidden}
              animate={variant.show}
            >
              <TriangleAlert className={style.triangleAlert} size={30} />
              Install and Open Termux for the app server
            </motion.div>
          );
        }
        return (
          <div className={style.startupNotice}>
            <AnimatePresence>{children}</AnimatePresence>
          </div>
        );
      })()} */}
    </>
  );
}

export default App;
