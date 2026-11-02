"use client";
import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import { MediaPlayer, MediaProvider, isVideoProvider } from "@vidstack/react";
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaMuteButton,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaCaptionsButton,
  MediaFullscreenButton,
} from "media-chrome/react";
import {
  MediaPlaybackRateMenu,
  MediaPlaybackRateMenuButton,
} from "media-chrome/react/menu";
import { createMediaStore } from "media-chrome/media-store/media-store";
import { SourceLink } from "../components";
import { officialMedia } from "./official-media";
import styles from "./official-player.module.css";

function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span className={styles.icon}>
      <Image
        src={`/figma/legiwatch-media/${name}.svg`}
        alt=""
        width={size}
        height={size}
      />
    </span>
  );
}

export function OfficialHearingPlayer({
  sourceUrl,
  listing = false,
}: {
  sourceUrl?: string | null;
  listing?: boolean;
}) {
  const source = officialMedia(sourceUrl);
  return (
    <section
      className={styles.panel}
      aria-label="Official hearing player"
      data-figma-node="1064:267525"
    >
      <div className={styles.heading}>
        <strong>Official hearing stream</strong>
        <SourceLink href={sourceUrl}>
          Official source <Icon name="external-link" />
        </SourceLink>
      </div>
      {source.kind === "video" && !listing ? (
        <SupportedVideo key={source.url} source={source} />
      ) : (
        <div className={styles.fallback}>
          <p>
            {source.kind === "unavailable"
              ? "No supported public playback source is available."
              : listing
                ? "Select this hearing’s live stream or replay on the official listing."
                : "This publisher provides an official player page. Open it to watch the live hearing or archived replay."}
          </p>
          <p>
            Browser capture starts only after you choose attendance and share
            the official source tab.
          </p>
        </div>
      )}
    </section>
  );
}

function SupportedVideo({
  source,
}: {
  source: Extract<ReturnType<typeof officialMedia>, { kind: "video" }>;
}) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const rateId = useId();
  const store = useMemo(
    () =>
      createMediaStore({
        options: {
          noVolumePref: true,
          noMutedPref: true,
          noSubtitlesLangPref: true,
        },
      }),
    [],
  );
  useEffect(() => {
    store.dispatch({ type: "mediaelementchangerequest", detail: video });
    return () => {
      video?.pause();
      store.dispatch({ type: "mediaelementchangerequest", detail: undefined });
    };
  }, [video, store]);
  return (
    <>
      <MediaController mediaStore={store} className={styles.controls}>
        <MediaPlayer
          slot="media"
          src={{ src: source.url, type: source.type }}
          title="Official hearing video"
          viewType="video"
          load="eager"
          preload="metadata"
          keyDisabled
          className={styles.player}
          onProviderSetup={(provider) => {
            if (isVideoProvider(provider)) setVideo(provider.video);
          }}
          onError={() => setFailed(true)}
        >
          <MediaProvider />
        </MediaPlayer>
        <MediaPlaybackRateMenu id={rateId} hidden />
        <MediaControlBar className={styles.bar}>
          <MediaPlayButton>
            <span slot="play">
              <Icon name="play" />
            </span>
          </MediaPlayButton>
          <MediaTimeDisplay showDuration />
          <MediaTimeRange className={styles.seek} />
          <MediaMuteButton>
            <span slot="high">
              <Icon name="volume" />
            </span>
          </MediaMuteButton>
          <MediaCaptionsButton>
            <span slot="off">
              <Icon name="captions" />
            </span>
          </MediaCaptionsButton>
          <MediaPlaybackRateMenuButton
            invokeTarget={rateId}
            aria-label="Playback speed settings"
          >
            <span slot="icon">
              <Icon name="settings" />
            </span>
          </MediaPlaybackRateMenuButton>
          <MediaFullscreenButton>
            <span slot="enter">
              <Icon name="fullscreen" size={18} />
            </span>
          </MediaFullscreenButton>
        </MediaControlBar>
      </MediaController>
      {failed && (
        <p role="status">
          The supplied media could not play here. Open the official source to
          watch; playback availability is controlled by the publisher.
        </p>
      )}
    </>
  );
}
