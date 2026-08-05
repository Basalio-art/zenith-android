import Hls from "hls.js"
import {useState, useEffect, useRef} from "react"

export const MyPlayer = ({ src, videoType, poster }) => {

  const videoRef = useRef(null)
  
  useEffect(() => {
    if (!videoType) return
    
    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(videoRef.current)
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = src
    }
  }, [videoType])
  
  return (
    <>
      <video controls ref={videoRef} poster={poster}></video>
    </>
  );
};
