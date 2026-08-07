import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import style from './Video.module.css';

export const MyPlayer = ({ src, videoType, poster }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!src || !videoType) return;

    const video = videoRef.current;
    if (!video) return;

    let mediaErrorRetries = 0;
    let hls = null;
    let isNative = false;

    const useNative = () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }

      video.src = src;
      video.load();
      isNative = true;
    };

    if (Hls.isSupported()) {
      hls = new Hls();

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              mediaErrorRetries++;
              if (mediaErrorRetries === 5) {
                useNative();
                break;
              }
              hls.swapAudioCodec();
              hls.recoverMediaError();
              break;
            case Hls.ErrorTypes.OTHER_ERROR:
              useNative();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      useNative();
    }

    return () => {
      if (isNative) {
        video.removeAttribute('src');
        video.load();
      }

      if (hls) {
        hls.destroy();
        hls = null;
      }
    };
  }, [src, videoType]);

  return (
    <video
      ref={videoRef}
      className={style.videoElement}
      controls
      preload='metadata'
      poster={poster}
    />
  );
};
