import Hls from 'hls.js';
import style from './Video.module.css';
import { useEffect, useRef } from 'react';

export const MyPlayer = ({ src, videoType, poster }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!src || !videoRef.current) return;

    if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = src;
    } else if (Hls.isSupported()) {
      var hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
    }
  }, [src]); // Runs when the source changes

  return (
    <>
      {src && (
        <video
          className={style.videoElement}
          controls
          ref={videoRef}
          poster={poster}
        />
      )}
    </>
  );
};
