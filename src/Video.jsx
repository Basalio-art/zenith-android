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
      var hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
  }, [src, videoType]);

  return (
    <video
      ref={videoRef}
      className={style.videoElement}
      controls
      playsInline
      preload='auto'
      poster={poster}
    />
  );
};
