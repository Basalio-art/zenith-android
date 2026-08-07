import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import style from './Video.module.css';

export const MyPlayer = ({ src, videoType, poster }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!poster) {
      video.classList.add(style.hidden);
    } else {
      video.classList.remove(style.hidden);
    }
  }, [poster]);

  useEffect(() => {
    if (!src || !videoType) return;

    const video = videoRef.current;
    if (!video) return;

    let mediaErrorRetries = 0;
    let hls = null;
    let isNative = false;

    const hlsDestroy = () => {
      hls.destroy();
      hls = null;
    };

    const useNative = () => {
      if (hls) {
        hlsDestroy();
      }

      video.src = src;
      video.load();
      isNative = true;
    };

    const canUseNative = video.canPlayType('application/vnd.apple.mpegurl');

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
                if (canUseNative) useNative();
                else hlsDestroy;
                break;
              }
              hls.swapAudioCodec();
              hls.recoverMediaError();
              break;
            case Hls.ErrorTypes.OTHER_ERROR:
              if (canUseNative) {
                useNative();
              } else {
                hls.destroy();
                hls = null;
              }
              break;
            default:
              if (canUseNative) useNative();
              else hlsDestroy();
              break;
          }
        }
      });
    } else if (canUseNative) {
      useNative();
    }

    return () => {
      if (isNative) {
        video.removeAttribute('src');
        video.load();
      }

      if (hls) hlsDestroy();
    };
  }, [src]);

  return (
    <video ref={videoRef} className={style.hidden} controls poster={poster} />
  );
};
