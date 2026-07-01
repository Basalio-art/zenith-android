import { createContext, useState, useEffect, useContext } from "react";
import { AppContext } from "./App.jsx";
import axios from "axios";

const ConfigContext = createContext(null);

const configUrl =
  "https://raw.githubusercontent.com/Basalio-art/zenith-android/refs/heads/main/config.json";

export const ConfigProvider = ({ children }) => {
  const [backendUrl, setBackendUrl] = useState(null);
  const { hasInternet } = useContext(AppContext);

  const proxyUrl = "https://corsproxy.io/?url=";

  useEffect(() => {
    if (!hasInternet || backendUrl) return;
    const getBackendUrl = async () => {
      try {
        const response = await axios.get(configUrl);

        setBackendUrl(atob(response.data["backend-server"][0]));
      } catch {}
    };

    getBackendUrl();
  }, [hasInternet]);

  return (
    <ConfigContext.Provider value={{ backendUrl, proxyUrl }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  return useContext(ConfigContext);
};
