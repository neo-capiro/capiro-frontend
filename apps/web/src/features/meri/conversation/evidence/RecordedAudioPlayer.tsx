"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { MediaPlayer, MediaProvider, isAudioProvider } from "@vidstack/react";
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaMuteButton,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaPlaybackRateButton,
} from "media-chrome/react";
import { createMediaStore } from "media-chrome/media-store/media-store";
import { recordingTime, type HearingPlayback } from "./hearing-media";
import styles from "./hearing-media.module.css";

/** Vidstack owns the provider; Media Chrome controls its actual audio element. */
export default function RecordedAudioPlayer({
  playback,
  positionMs,
  onUnavailable,
}: {
  playback: HearingPlayback;
  positionMs: number;
  onUnavailable: () => void;
}) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(
    (positionMs - playback.startMs) / 1000,
  );
  const source = useMemo(
    () => ({ src: playback.url, type: "audio/wav" }),
    [playback.url],
  );
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
    store.dispatch({ type: "mediaelementchangerequest", detail: audio });
    return () => {
      audio?.pause();
      store.dispatch({ type: "mediaelementchangerequest", detail: undefined });
    };
  }, [audio, store]);
  return (
    <MediaPlayer
      title="Retained hearing audio"
      src={source}
      viewType="audio"
      streamType="on-demand"
      load="eager"
      preload="metadata"
      currentTime={(positionMs - playback.startMs) / 1000}
      keyDisabled
      onProviderSetup={(provider) => {
        if (isAudioProvider(provider)) setAudio(provider.audio);
      }}
      onTimeUpdate={(time) => setCurrentTime(time.currentTime)}
      onError={onUnavailable}
      className={styles.player}
    >
      <MediaProvider />
      <RetainedAudioControls store={store} />
      <p>
        Recording position:{" "}
        {recordingTime(
          playback.startMs +
            Math.min(currentTime * 1000, playback.endMs - playback.startMs),
        )}
        . Controls show time within this segment.
      </p>
    </MediaPlayer>
  );
}

function RetainedAudioControls({
  store,
}: {
  store: ReturnType<typeof createMediaStore>;
}) {
  return (
    <MediaController
      audio
      noHotkeys
      mediaStore={store}
      className={styles.controls}
    >
      <MediaControlBar className={styles.bar}>
        <MediaPlayButton className={styles.controlButton}>
          <span slot="play" className={styles.icon}>
            <Image
              src="/figma/meri-hearing-media/play.svg"
              alt=""
              width={24}
              height={24}
            />
          </span>
        </MediaPlayButton>
        <MediaTimeDisplay showDuration className={styles.time} />
        <MediaTimeRange className={styles.seek} />
        <MediaMuteButton className={styles.controlButton}>
          <span slot="high" className={styles.icon}>
            <Image
              src="/figma/meri-hearing-media/volume.svg"
              alt=""
              width={24}
              height={24}
            />
          </span>
        </MediaMuteButton>
        <MediaPlaybackRateButton className={styles.controlButton} />
      </MediaControlBar>
    </MediaController>
  );
}
