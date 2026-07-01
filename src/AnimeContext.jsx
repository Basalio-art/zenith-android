import { createContext, useContext, useState, useEffect } from "react";
import { useConfig } from "./ConfigContext.jsx";
import { AppContext } from "./App.jsx";
import axios from "axios";

const AnimeContext = createContext(null);

export const AnimeProvider = ({ children }) => {
  const [anilistId, setAnilistId] = useState(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [episodeId, setEpisodeId] = useState(null);
  const [animeData, setAnimeData] = useState({
    providers: null,
    id: null,
    streams: null
  });

  const { hasInternet } = useContext(AppContext);

  const { backendUrl, proxyUrl } = useConfig();

  useEffect(() => {
    if (!anilistId) return;
    const getProviders = async () => {
      setLoadingProviders(true);
      try {
        const response = await axios.get(
          `${proxyUrl}${backendUrl}/episodes/${anilistId}`,
        );
        setAnimeData((prev) => ({
          ...prev,
          id: anilistId,
          providers: response.data.providers,
        }));
      } catch (e) {
        setAnimeData((prev) => ({ ...prev, providers: null }));
      }
      setLoadingProviders(false);
    };

    getProviders();
  }, [anilistId]);

  useEffect(() => {
    if (!episodeId) return;
    
    const getStream = async () => {
      try {
        const response = await axios.get(`${proxyUrl}${backendUrl}/${episodeId}`);

        setAnimeData(prev => ({
          ...prev,
          streams: response.data.streams[0].url
        }));
      } catch (e) {
        console.log(e);
      }
    };

    getStream();
  }, [episodeId]);

  return (
    <AnimeContext.Provider
      value={{ setAnilistId, animeData, loadingProviders, setEpisodeId }}
    >
      {children}
    </AnimeContext.Provider>
  );
};

export const useAnime = () => {
  return useContext(AnimeContext);
};
