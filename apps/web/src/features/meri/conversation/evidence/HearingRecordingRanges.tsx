import {
  hasRetainedAudio,
  recordingTime,
  type HearingManifest,
  type HearingPlaybackSelection,
} from "./hearing-media";
import ui from "../../ui/meri-ui.module.css";
import styles from "./hearing-media.module.css";

export function HearingRecordingRanges({
  epochs,
  receivedAt,
  onSelect,
}: {
  epochs: HearingManifest["epochs"];
  receivedAt: number;
  onSelect: (request: HearingPlaybackSelection) => void;
}) {
  if (!epochs.length)
    return <p>No retained audio is available for this hearing.</p>;
  return (
    <ul className={styles.ranges}>
      {epochs.map((epoch, index) => (
        <li key={epoch.id}>
          <span>
            Recording {index + 1}: {recordingTime(epoch.startMs)}–
            {recordingTime(epoch.durableEndMs)}
          </span>
          {hasRetainedAudio(epoch, receivedAt) ? (
            <button
              type="button"
              className={ui.outline}
              onClick={() =>
                onSelect({ epochId: epoch.id, positionMs: epoch.startMs })
              }
            >
              Load recording {index + 1}
            </button>
          ) : (
            <span>Audio unavailable</span>
          )}
        </li>
      ))}
    </ul>
  );
}
