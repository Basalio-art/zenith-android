import { useState, useRef, useEffect, createContext, useCallback } from 'react';
import {
  WifiOff,
  TriangleAlert,
  MessageSquare,
  Copy,
  Check,
  X,
  CloudOff
} from 'lucide-react';
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useMotionValue,
  animate
} from 'motion/react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { App as CapApp } from '@capacitor/app';

import style from './styles/App.module.css';
import Home from './pages/Home.jsx';
import Navigator from './pages/Navigator.jsx';
import SearchResult from './pages/Search.jsx';
import ViewAnime from './pages/ViewAnime.jsx';
import Stream from './pages/Stream.jsx';
import AppBars from './plugins/SystemBars.js';
import { services } from './services/manager/index.js';

export const AppContext = createContext(null);

const APP_VERSION = '1.4.0';

const CONFIG_URL =
  'https://raw.githubusercontent.com/Basalio-art/zenith-android/refs/heads/main/config.json';

const fallbackProviders = [
  'AnimeParadise',
  'Anikoto',
  'GogoAnime',
  'MegaPlay',
  'Goyabu'
];

function App() {
  const [hasInternet, setHasInternet] = useState(true);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [message, setMessage] = useState([]);
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [popularAnime, setPopularAnime] = useState([]);
  const [latestAnime, setLatestAnime] = useState([]);
  const [searchData, setSearchData] = useState([]);
  const [searchQuery, setSearchQuery] = useState(null);
  const [searchInputClear, setSearchInputClear] = useState(false);
  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [viewAnimeData, setViewAnimeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState(null);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [selProvider, setSelProvider] = useState('bee');
  const [selAudio, setSelAudio] = useState('sub');
  const [selVideoType, setSelVideoType] = useState('hls');
  const [openAnilistStatusAlert, setOpenAnilistStatusAlert] = useState(false);
  const [anilistStatus, setAnilistStatus] = useState(null);
  const [fallbackProvider, setFallbackProvider] = useState(
    fallbackProviders[0]
  );
  const [valid, setValid] = useState({
    appVersion: {
      required: APP_VERSION,
      ok: true
    }
  });
  const [loadingInfo, setLoadingInfo] = useState({
    msg: 'Loading . . .',
    loaded: 0,
    loadLength: 2
  });
  const [page, setPage] = useState('home');

  const percent = useMotionValue(0);
  const loadingPercentRef = useRef(0);

  const isInitialInternetMount = useRef(true);
  const ServerIsChecked = useRef(false);
  const bodyRef = useRef(null);

  const currentPageData = useRef({
    current: 'main',
    main: null,
    preview: null
  });

  const renderPage = page => {
    switch (page) {
      case 'search':
        return (
          <SearchResult
            searchData={searchData}
            searchQuery={searchQuery}
            searchInputClear={searchInputClear}
            searchIsLoading={searchIsLoading}
          />
        );

      case 'home':
        return (
          <Home
            trendingAnime={trendingAnime}
            popularAnime={popularAnime}
            latestAnime={latestAnime}
          />
        );

      case 'anime':
        return <ViewAnime anime={viewAnimeData} providers={providers} />;

      case 'stream':
        return (
          <Stream
            anime={viewAnimeData}
            providers={providers}
            providersLoading={providersLoading}
            selProvider={selProvider}
            selAudio={selAudio}
            selVideoType={selVideoType}
          />
        );
    }
  };

  const navigate = (page, type) => {
    const pageData = currentPageData.current;
    currentPageData.current = {
      current: type,
      main: type === 'main' ? page : pageData.main,
      preview: type === 'preview' ? page : pageData.preview
    };
  };

  const handleBack = () => {
    const pageData = currentPageData.current;
    if (pageData.current === 'preview') {
      setPage(pageData.main);
    } else if (pageData.current === 'main') {
      if (pageData.main !== 'home') {
        navigate('home', 'main');
        setPage('home');
      } else {
        CapApp.exitApp();
      }
    }
  };

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

  const serverStatus = async () => {
    try {
      // Direct AniList availability ping (replaces anime-api /anilist_status).
      const available = await services.health.checkAniList();

      const NotAvailable = !available;

      setAnilistStatus(NotAvailable ? 'unavailable' : 'ok');
      setOpenAnilistStatusAlert(NotAvailable);
    } catch (e) {
      console.log(e);
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

  const handleMessageDragEnd = (e, id) => {
    if (e.offset.x <= -50 || e.offset.x >= 120) {
      removeMessage(id);
    }
  };

  const removeMessage = id => {
    setMessage(prev => prev.filter(message => message.id !== id));
  };

  const fetchAnimeData = async () => {
    if (!hasInternet) return;

    try {
      // Catalog now comes from AniList directly via the Service Manager.
      // Each rail is applied independently (same as the old per-request 200 check).
      const [trending, popular, recent] = await Promise.allSettled([
        services.anilist.getTrending(1, 10),
        services.anilist.getPopular(1, 10),
        services.anilist.getRecent(1, 10)
      ]);

      if (trending.status === 'fulfilled' && trending.value?.results) {
        setTrendingAnime(trending.value.results);
      }
      if (popular.status === 'fulfilled' && popular.value?.results) {
        setPopularAnime(popular.value.results);
      }
      if (recent.status === 'fulfilled' && recent.value?.results) {
        setLatestAnime(recent.value.results);
      }
    } catch (error) {
      console.log('Error', error);
    }
  };

  const fallbackFetchSearchQuery = async query => {
    setSearchIsLoading(true);
    try {
      // Backup API (manager FALLBACK_BASE) is only used when AniList is unavailable.
      const result = await services.fallback.fallbackSearch(
        query,
        fallbackProvider
      );
      const list = Array.isArray(result)
        ? result
        : result?.results || result?.data || [];
      setSearchData(list);
    } catch (e) {
      console.log(e);
      setSearchData([]);
    }
    setSearchIsLoading(false);
  };

  const fetchSearchQuery = async (query, page = 1) => {
    setSearchIsLoading(true);
    try {
      const data = await services.anilist.searchAnime(query, page, 50);
      setSearchData(data?.results || []);
    } catch {
      setSearchData([]);
      newMessage(
        'Search failed: Please check your internet connection',
        'alert'
      );
      setSearchQuery(null);
    }
    setSearchIsLoading(false);
  };

  const checkVersion = () => {
    return new Promise(async resolve => {
      let version = APP_VERSION;
      try {
        const { data } = await CapacitorHttp.get({
          url: CONFIG_URL,
          connectTimeout: 5000,
          readTimeout: 5000
        });

        version = JSON.parse(data)['app-version'];
      } catch {
        if (!hasInternet) version = APP_VERSION;
      }

      if (version !== APP_VERSION) {
        setValid(prev => ({
          ...prev,
          appVersion: { required: version, ok: false }
        }));
      } else {
        setTimeout(() => {
          resolve(version);
        }, 500);
      }
    });
  };

  const checkBackendR = () => {
    // Anivexa liveness via Service Manager (replaces old HEAD request).
    const hasBackend = async () => services.health.checkAnivexa();

    return new Promise(async resolve => {
      let isRunning = false;

      isRunning = await hasBackend();

      if (isRunning) {
        resolve(isRunning);
      } else {
        setLoadingInfo(prev => ({
          ...prev,
          loaded: 1,
          msg: 'Server is not running. Please try again.'
        }));
      }
    });
  };

  const wait = () => {
    return new Promise(resolve => setTimeout(resolve, 1500));
  };

  const loadingStartup = async () => {
    setLoadingInfo(prev => ({ ...prev, msg: 'Verifying app version . . .' }));
    await checkVersion();
    setLoadingInfo(prev => ({
      ...prev,
      loaded: 1,
      msg: 'Checking Termux server status . . .'
    }));
    await checkBackendR();
    setLoadingInfo(prev => ({
      ...prev,
      loaded: 2,
      msg: 'Initialization complete!'
    }));

    await wait();
    setIsLoading(false);
  };

  useEffect(() => {
    const { loaded, loadLength } = loadingInfo;

    const value = (0.8 + (loaded / loadLength) * 0.2) * 100;

    const controls = animate(percent, value, {
      duration: 1.5,
      ease: 'easeOut'
    });

    percent.on('change', latest => {
      const loadingPercent = loadingPercentRef.current;

      if (!loadingPercent) return;
      loadingPercent.innerText = Math.round(latest) + '%';
    });

    return () => {
      controls.stop();
    };
  }, [loadingInfo]);

  useEffect(() => {
    if (!searchQuery) return;

    if (anilistStatus === 'ok') {
      fetchSearchQuery(searchQuery);
    } else {
      fallbackFetchSearchQuery(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!searchQuery) return;

    fallbackFetchSearchQuery(searchQuery);
  }, [fallbackProvider]);

  useEffect(() => {
    serverStatus();

    const reChecking = async () => {
      await checkVersion();
    };

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

      reChecking();
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

    const backendCheck = async () => {
      await checkBackendR();
    };

    const intervalChecker = setInterval(internetCheck, 10000);

    window.addEventListener('online', internetCheck);
    window.addEventListener('offline', internetCheck);
    window.addEventListener('touchend', backendCheck);

    return () => {
      clearInterval(intervalChecker);

      window.removeEventListener('online', internetCheck);
      window.removeEventListener('offline', internetCheck);
      window.removeEventListener('touchend', backendCheck);
    };
  }, [isLoading]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      (async () => {
        await AppBars.normal();
      })();
      const nativeListener = CapApp.addListener('backButton', () => {
        handleBack();
      });

      return () => {
        nativeListener.then(handle => handle.remove());
      };
    }
  }, []);

  return (
    <>
      {!isLoading && (
        <div className={style.body} ref={bodyRef}>
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
                exit={{
                  scale: 0,
                  opacity: 0,
                  transition: { duration: 0.15 }
                }}
              >
                <WifiOff size={24} />
              </motion.div>
            )}
          </AnimatePresence>

          <section className={style.messageSection}>
            <AnimatePresence initial={false}>
              {message.map(({ id, message, type }) => (
                <motion.div
                  layout
                  initial={{ x: '-100%', opacity: 0 }}
                  drag='x'
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={{ left: 0.5, right: 0.5 }}
                  onDragEnd={(_, i) => handleMessageDragEnd(i, id)}
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
                  key={`message-${id}`}
                  className={style.messageCard}
                >
                  {type === 'message' && <MessageSquare size={17} />}
                  {type === 'alert' && <TriangleAlert size={17} />}
                  <span>{message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </section>

          <AppContext.Provider
            value={{
              setSearchQuery,
              setSearchInputClear,
              page,
              setPage,
              hasInternet,
              setViewAnimeData,
              setProviders,
              setProvidersLoading,
              setSelProvider,
              setSelAudio,
              setSelVideoType,
              setNavigatorOpen,
              navigate,
              handleBack,
              anilistStatus,
              fallbackProvider,
              setFallbackProvider,
              fallbackProviders
            }}
          >
            <div className={style.wrapper}>
              <LayoutGroup>
                <AnimatePresence mode='popLayout'>
                  {
                    <motion.div
                      key={page}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className={style.pageContainer}
                    >
                      {renderPage(page)}
                    </motion.div>
                  }
                </AnimatePresence>
              </LayoutGroup>
            </div>

            <Navigator navigatorOpen={navigatorOpen} page={page} />
          </AppContext.Provider>
        </div>
      )}
      <AnimatePresence mode='popLayout'>
        {isLoading && (
          <motion.div
            key='loading-page'
            initial={false}
            animate={false}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            className={style.loadingPage}
          >
            <img src='./icon/logo.png' type='image/png' />
            <div className={style.loadingIndicator}>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{
                  scaleX: (() => {
                    const { loaded, loadLength } = loadingInfo;

                    return 0.8 + (loaded / loadLength) * 0.2;
                  })()
                }}
                transition={{
                  duration: 1.5,
                  ease: 'easeOut'
                }}
              ></motion.div>
            </div>
            <div className={style.infoWrapper}>
              <AnimatePresence mode='popLayout'>
                <motion.div
                  className={style.loadingInfo}
                  key={`loading-id${loadingInfo.loaded}`}
                  initial={{
                    opacity: 0,
                    y: 10
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                  exit={{
                    opacity: 0,
                    y: -10
                  }}
                  transition={{
                    duration: 0.25
                  }}
                >
                  {loadingInfo.msg}
                </motion.div>
              </AnimatePresence>

              <div className={style.percent} ref={loadingPercentRef}>
                0%
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!valid.appVersion.ok && (
          <motion.div
            className={style.invalidAppVersion}
            key='invalid-app-version'
            initial={{
              opacity: 0,
              x: '-50%',
              y: '-40%'
            }}
            animate={{
              opacity: 1,
              y: '-50%'
            }}
            exit={{
              opacity: 0,
              y: '-30%'
            }}
            transition={{
              duration: 0.5
            }}
          >
            <div className={style.head}>
              <TriangleAlert className={style.triangleAlert} size={25} />
              <h3>Update Required</h3>
            </div>
            <div>
              A new version of Zenith is available. Update now to get the latest
              features and performance improvements.
            </div>
            <div className={style.downloadBtn}>
              Download v{valid.appVersion.required}
            </div>
          </motion.div>
        )}
        {openAnilistStatusAlert && (
          <motion.div
            key='disabled-anilist'
            className={style.anilistStatus}
            initial={{
              opacity: 0,
              x: '-50%',
              y: '-40%'
            }}
            animate={{
              opacity: 1,
              y: '-50%'
            }}
            exit={{
              opacity: 0,
              y: '-30%'
            }}
            transition={{
              duration: 0.5
            }}
          >
            <div className={style.head}>
              <CloudOff size={25} />
              <h3 className={style.head}>Temporary Service Interruption</h3>
            </div>

            <div
              className={style.exit}
              onClick={() => setOpenAnilistStatusAlert(false)}
            >
              <X size={25} />
            </div>

            <p>
              Zenith is currently unable to connect to AniList, our primary
              source for anime data and a core dependency of the app. As a
              result, the Home and Search features may be temporarily
              unavailable, and some other features may not function as expected.
              If you currently have a download in progress, it may be paused
              while the service is unavailable and will automatically resume
              once the connection is restored. Please try again later. We’re
              monitoring the issue and will restore full functionality as soon
              as AniList becomes available.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
