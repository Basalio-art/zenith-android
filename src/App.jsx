import Home from './Home.jsx';
import style from './App.module.css';
import { useState, useRef, useEffect, createContext } from 'react';
import {
  WifiOff,
  TriangleAlert,
  MessageSquare,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Capacitor, CapacitorHttp, SystemBars } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { StatusBar } from '@capacitor/status-bar';
import Navigator from './Navigator.jsx';
import SearchResult from './Search.jsx';
import ViewAnime from './ViewAnime.jsx';
import Stream from './Stream.jsx';

const hideSystemBars = async () => {
  await SystemBars.hide();
  await StatusBar.hide();
};

export const AppContext = createContext(null);

const renderPage = page => {
  switch (page) {
    case 'search':
      return <SearchResult />;
    case 'home':
      return <Home />;
  }
};

const ZENITH_HEADERS = {
  Origin: 'http://zenith.app',
  Referer: 'http://zenith.app'
};

const APP_VERSION = '1.4.0';

const CONFIG_URL =
  'https://raw.githubusercontent.com/Basalio-art/zenith-android/refs/heads/main/config.json';

function App() {
  const [hasInternet, setHasInternet] = useState(true);
  const [navigatorOpen, setNavigatorOpen] = useState(true)
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
  const [openStream, setOpenStream] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bash1Copied, setBash1Copied] = useState(false);
  const [bash2Copied, setBash2Copied] = useState(false);
  const [bash3Copied, setBash3Copied] = useState(false);
  const [providers, setProviders] = useState(null);
  const [selProvider, setSelProvider] = useState('bee');
  const [selAudio, setSelAudio] = useState('dub');
  const [valid, setValid] = useState({
    appVersion: {
      required: APP_VERSION,
      ok: true
    },
    backendRun: true,
    backendVersion: {
      required: null,
      ok: true
    }
  });
  const [loadingInfo, setLoadingInfo] = useState({
    msg: 'Loading . . .',
    loaded: 0,
    loadLength: 3
  });
  const [page, setPage] = useState('home');

  const isInitialInternetMount = useRef(true);
  const bodyRef = useRef(null);

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
      const { data: trending, status: trendingStatus } =
        await CapacitorHttp.get({
          url: 'http://localhost:9189/trending?page=1&per_page=20',
          headers: ZENITH_HEADERS
        });
      const { data: popular, status: popularStatus } = await CapacitorHttp.get({
        url: 'http://localhost:9189/popular?page=1&per_page=20',
        headers: ZENITH_HEADERS
      });
      const { data: recent, status: recentStatus } = await CapacitorHttp.get({
        url: 'http://localhost:9189/recent?page=1&per_page=20',
        headers: ZENITH_HEADERS
      });

      setTrendingAnime(prev =>
        trendingStatus === 200 ? trending.results : prev
      );
      setPopularAnime(prev => (popularStatus === 200 ? popular.results : prev));
      setLatestAnime(prev => (recentStatus === 200 ? recent.results : prev));
    } catch (error) {
      console.log('Error', error);
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
          per_page: 50
        }
      });

      setSearchData(data.results || []);
    } catch (error) {
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
    const hasBackend = async () => {
      try {
        await CapacitorHttp.request({
          url: 'http://localhost:9189',
          method: 'HEAD'
        });
        return true;
      } catch {}
      return false;
    };

    return new Promise(async resolve => {
      let isRunning = false;

      let intervalId = setInterval(async () => {
        isRunning = await hasBackend();

        if (!isLoading) {
          clearInterval(intervalId);
          intervalId = null;
        }

        if (isRunning) {
          setValid(prev => ({ ...prev, backendRun: true }));
          if (intervalId) clearInterval(intervalId);
          resolve(isRunning);
        } else {
          setValid(prev => ({ ...prev, backendRun: false }));
        }
      }, 2000);
    });
  };

  const checkBackendV = () => {
    const CURRENT_VERSION = async () => {
      const { data } = await CapacitorHttp.get({
        url: 'http://localhost:9189/version',
        headers: ZENITH_HEADERS
      });

      return data.version;
    };

    const ONLINE_VERSION = async () => {
      try {
        const { data } = await CapacitorHttp.get({
          url: CONFIG_URL,
          connectTimeout: 5000,
          readTimeout: 5000
        });
        return JSON.parse(data)['backend-version'];
      } catch {
        return await CURRENT_VERSION();
      }
    };

    return new Promise(async resolve => {
      let timeoutId;
      const version = await ONLINE_VERSION();

      timeoutId = setTimeout(async () => {
        const currentVersion = await CURRENT_VERSION();

        if (version !== currentVersion) {
          setValid(prev => ({
            ...prev,
            backendVersion: { ok: false, required: version }
          }));
        } else {
          clearTimeout(timeoutId);
          setValid(prev => ({
            ...prev,
            backendVersion: { ok: true, required: version }
          }));


          resolve(version);
        }
      }, 2500);
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
      msg: 'Verifying backend changes . . .'
    }));
    await checkBackendV();
    setLoadingInfo(prev => ({
      ...prev,
      loaded: 3,
      msg: 'Initialization complete!'
    }));

    await wait();
    setIsLoading(false);
  };

  const handleCopy = async text => {
    await Clipboard.write({
      string: text
    });
  };

  useEffect(() => {
    if (!searchQuery) return;

    fetchSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const reChecking = async () => {
      await checkVersion();
      await checkBackendV();
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

    const backendCheck = async () => {
      await checkBackendR();
    };

    fetchAnimeData();

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
      let hideTimeout = null;
      window.addEventListener('touchmove', async () => {
        const info = await StatusBar.getInfo();

        if (info.visible && !hideTimeout) {
          hideTimeout = setTimeout(() => {
            hideSystemBars();
            hideTimeout = null;
          }, 3000);
        }
      });
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

          <motion.section layout className={style.messageSection}>
            <AnimatePresence>
              {message.map(({ id, message, type }) => (
                <motion.div
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
              setOpenStream,
              openStream,
              providers,
              setProviders,
              setSelProvider,
              selProvider,
              setSelAudio,
              selAudio,
              navigatorOpen,
              setNavigatorOpen
            }}
          >
            <div className={style.wrapper}>
              <LayoutGroup>
                <AnimatePresence mode='popLayout'>
                  {
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
                      {renderPage(page)}
                    </motion.div>
                  }
                </AnimatePresence>
              </LayoutGroup>

              <ViewAnime />

              <Stream />
            </div>

            <Navigator />
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
            <div className={style.loadingIndicator}>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{
                  scaleX: (() => {
                    const loaded = loadingInfo.loaded;
                    const loadLength = loadingInfo.loadLength;

                    return 0.8 + (loaded / loadLength) * 0.2;
                  })()
                }}
                transition={{
                  duration: 1.5
                }}
              ></motion.div>
            </div>
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
        {!valid.backendRun && (
          <motion.div
            className={style.noBackend}
            key='no-backend'
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
              <h3>Local Server Required</h3>
            </div>
            <div>
              Zenith requires a local backend server running in{' '}
              <a
                target='_blank'
                rel='noreferrer noopener'
                href='https://github.com/termux/termux-app/releases/latest'
              >
                Termux
              </a>{' '}
              to fetch data.
            </div>
            <h4>◈ First-time setup & start</h4>
            <div className={style.bash1}>
              <span className={style.textType}>bash</span>
              <motion.div
                className={style.copyBtn}
                whileTap={{
                  scale: 1.2
                }}
                transition={{
                  type: 'spring'
                }}
                onClick={e => {
                  console.log(e);
                  handleCopy(e.target.parentNode.lastElementChild.innerText);
                  setBash1Copied(true);
                }}
              >
                {bash1Copied ? (
                  <Check size={20} color='lime' />
                ) : (
                  <Copy size={20} />
                )}
              </motion.div>
              <code className={style.text}>
                pkg update -y && pkg upgrade -y && cd ~ && pkg install git &&
                pkg install golang && git clone
                https://github.com/Basalio-art/anime-api.git zenith-backend &&
                cd zenith-backend && go mod tidy && go build -o server main.go
                && ./server
              </code>
            </div>
            <h4>◈ If already installed, run this to start</h4>
            <div className={style.bash2}>
              <span className={style.textType}>bash</span>
              <motion.div
                className={style.copyBtn}
                whileTap={{
                  scale: 1.2
                }}
                transition={{
                  type: 'spring'
                }}
                onClick={e => {
                  console.log(e);
                  handleCopy(e.target.parentNode.lastElementChild.innerText);
                  setBash2Copied(true);
                }}
              >
                {bash2Copied ? (
                  <Check size={20} color='lime' />
                ) : (
                  <Copy size={20} />
                )}
              </motion.div>
              <code className={style.text}>
                cd ~/zenith-backend && ./server
              </code>
            </div>
          </motion.div>
        )}
        {!valid.backendVersion.ok && (
          <motion.div
            className={style.backendChanges}
            key='backend-changes'
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
              <h3>Local Server Out of Date</h3>
            </div>

            <p>
              Your local backend is behind the required version. Pull the latest
              code to continue.
            </p>
            <div className={style.bash3}>
              <span className={style.textType}>bash</span>
              <motion.div
                className={style.copyBtn}
                whileTap={{
                  scale: 1.2
                }}
                transition={{
                  type: 'spring'
                }}
                onClick={e => {
                  console.log(e);
                  handleCopy(e.target.parentNode.lastElementChild.innerText);
                  setBash3Copied(true);
                }}
              >
                {bash3Copied ? (
                  <Check size={20} color='lime' />
                ) : (
                  <Copy size={20} />
                )}
              </motion.div>

              <code>
                cd ~/zenith-backend && git pull origin main && go build -o
                server main.go && ./server
              </code>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
