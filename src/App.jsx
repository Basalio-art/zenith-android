import Home from "./Home.jsx";
import style from "./App.module.css";
import { useState, useRef, useEffect, createContext } from "react";
import { WifiOff, TriangleAlert, MessageSquare } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { CapacitorHttp } from "@capacitor/core";
import Navigator from "./Navigator.jsx";
import SearchResult from "./Search.jsx";
import ViewAnime from "./ViewAnime.jsx";

export const AppContext = createContext(null);

const renderPage = (page) => {
  switch (page) {
    case "search":
      return <SearchResult />;
    case "home":
      return <Home />;
  }
};

const ZENITH_HEADERS = {
  Origin: "http://zenith.app",
  Referer: "http://zenith.app",
};

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
  const [page, setPage] = useState("home");

  const isInitialMount = useRef(true);

  const internetCheck = async () => {
    if (!navigator.onLine) {
      setHasInternet(false);
      return;
    }

    try {
      await fetch("https://connectivitycheck.gstatic.com/generate_204", {
        method: "HEAD",
        cache: "no-store",
        mode: "no-cors",
        signal: AbortSignal.timeout(5000),
      });
      setHasInternet(true);
    } catch {
      setHasInternet(false);
    }
  };

  const newMessage = (msg, type = "message") => {
    if (!msg) return;
    const id = Date.now() + "-" + (Math.random() * 1000).toFixed(0);

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
      const { data: trending } = await CapacitorHttp.get({
        url: "http://localhost:9189/trending?page=1&per_page=10",
        headers: ZENITH_HEADERS,
      });
      const { data: popular } = await CapacitorHttp.get({
        url: "http://localhost:9189/popular?page=1&per_page=10",
        headers: ZENITH_HEADERS,
      });
      const { data: recent } = await CapacitorHttp.get({
        url: "http://localhost:9189/recent?page=1&per_page=10",
        headers: ZENITH_HEADERS,
      });

      setTrendingAnime(trending.results);
      setPopularAnime(popular.results);
      setLatestAnime(recent.results);
    } catch (error) {
      console.log("Error", error);
      // newMessage(`Failed syncing dashboards from AniList`, "alert");
    }
  };

  const fetchSearchQuery = async (query, page = 1) => {
    setSearchIsLoading(true);
    try {
      const { data } = await CapacitorHttp.get({
        url: `http://localhost:9189/search?query=${encodeURIComponent(query)}&page=${page}&per_page=50`,
        headers: ZENITH_HEADERS,
      });

      setSearchData(data.results || []);
      console.log(data.results);
    } catch (error) {
      setSearchData([]);
      newMessage(
        "Search failed: Please check your internet connection",
        "alert",
      );
      setSearchQuery(null);
    }
    setSearchIsLoading(false);
  };

  useEffect(() => {
    if (!searchQuery) return;

    fetchSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let intervalFetch;
    if (!hasInternet) {
      newMessage("No internet connection detected", "alert");
    } else {
      fetchAnimeData();

      intervalFetch = setInterval(fetchAnimeData, 360000);

      newMessage("Connection restored", "alert");
    }
    return () => {
      clearInterval(intervalFetch);
    };
  }, [hasInternet]);

  useEffect(() => {
    internetCheck();
    fetchAnimeData();

    const intervalChecker = setInterval(internetCheck, 10000);

    window.addEventListener("online", internetCheck);
    window.addEventListener("offline", internetCheck);

    return () => {
      clearInterval(intervalChecker);

      window.removeEventListener("online", internetCheck);
      window.removeEventListener("offline", internetCheck);
    };
  }, []);

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
              transition: { type: "spring", stiffness: 300, damping: 20 },
            }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
          >
            <WifiOff size={24} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.section layout className={style.messageSection}>
        <AnimatePresence>
          {message.map(({ id, message, type }) => (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.5, right: 0.5 }}
              onDragEnd={(_, i) => handleMessageDragEnd(i, id)}
              animate={{
                x: 0,
                opacity: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 26,
                },
              }}
              exit={{
                x: "-100%",
                opacity: 0,
                transition: { duration: 0.2 },
              }}
              key={id}
              className={style.messageCard}
            >
              {type === "message" && <MessageSquare size={17} />}
              {type === "alert" && <TriangleAlert size={17} />}
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
                      ease: "linear",
                    },
                  }}
                  exit={{
                    opacity: 0,
                    y: 100,
                    transition: {
                      duration: 0.15,
                      ease: "linear",
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
    </>
  );
}

export default App;
