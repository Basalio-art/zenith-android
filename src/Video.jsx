import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import style from './Video.module.css';

export const MyPlayer = ({ src, videoType, poster }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!src || !videoType) return;

    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log(data.error);
              hls.swapAudioCodec();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
    // if (
    //   video.canPlayType('application/vnd.apple.mpegurl') ||
    //   video.canPlayType('application/x-mpegURL')
    // ) {
    //   video.src = src;
    //   return () => {
    //     videoRef.current.src = '';
    //   };
    // } else if (Hls.isSupported()) {
    //   var hls = new Hls();
    //   hls.loadSource(src);
    //   hls.attachMedia(video);

    //   return () => {
    //     hls.destroy()
    //   }
    // }
  }, [src, videoType]);

  return (
    <video
      ref={videoRef}
      className={style.videoElement}
      controls
      playsInline
      preload='auto'
      poster={poster}
      type={'application/x-mpegURL'}
    />
  );
};
