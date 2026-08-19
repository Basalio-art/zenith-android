import { memo, useEffect, useRef, useContext } from 'react';
import Hls from 'hls.js';
import style from './Video.module.css';
import { AppContext } from './App.jsx';

export const MyPlayer = memo(({ src, videoType, poster }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!src || !videoType) return;

    const video = videoRef.current;
    if (!video) return;

    let mediaErrorRetries = 0;
    let networkErrorRetries = 0;
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

    if (Hls.isSupported() && videoType === 'hls') {
      const encodedReferer = src
        .split('&')
        .filter(i => i.includes('referer'))
        .at(-1)
        .split('=')
        .at(-1);

      const referer = decodeURIComponent(encodedReferer);

      hls = new Hls();

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.log('HLS ERROR:', data.type, data.details, data.fatal, data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorRetries++
              if (networkErrorRetries === 5) {
                if (canUseNative) useNative()
                else hlsDestroy()
                break
              }
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              mediaErrorRetries++;
              if (mediaErrorRetries === 5) {
                if (canUseNative) useNative();
                else hlsDestroy();
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

    const handleError = e => {
      console.log(e);
    };

    return () => {
      if (hls) hlsDestroy();
      if (isNative) video.removeAttribute('src');

      video.removeEventListener('error', handleError);
    };
  }, [src]);

  return (
    <>
      {(videoType === 'hls' || videoType === 'mp4') && (
        <video
          ref={videoRef}
          //className={style.hidden}
          onCanPlay={e => {
            e.target.classList.remove(style.hidden);
          }}
          controls
          playsInline
          poster={poster}
        />
      )}
      {videoType === 'embed' && (
        <iframe
          src={src}
          style={{ border: 0 }}
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;'
        ></iframe>
      )}
    </>
  );
});
