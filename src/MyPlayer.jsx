import "@videojs/react/video/minimal-skin.css";
import { createPlayer, videoFeatures } from "@videojs/react";
import { MinimalVideoSkin, Video } from "@videojs/react/video";
import { HlsVideo } from "@videojs/react/media/hls-video";

const Player = createPlayer({ features: videoFeatures });

export const MyPlayer = ({ src, thumbnail }) => {
  return (
    <Player.Provider>
      <MinimalVideoSkin>
        <HlsVideo
          src={src}
          poster={thumbnail}
          playsInline
        />
      </MinimalVideoSkin>
    </Player.Provider>
  );
};
