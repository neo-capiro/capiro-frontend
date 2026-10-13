import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { testChannels, testResultLabel } from "./channel-contracts";
import type { useTestAlert } from "./useTestAlert";
import styles from "./preferences.module.css";

export function TestAlert({
  action,
  savedCurrent,
}: {
  action: ReturnType<typeof useTestAlert>;
  savedCurrent: boolean;
}) {
  return (
    <section
      className={styles.channelAction}
      aria-labelledby="alert-test-title"
    >
      <h3 id="alert-test-title">Test saved alert settings</h3>
      <p className={styles.help}>
        Uses your saved email address and verified phone. A test can send real
        email or SMS.
      </p>
      {!savedCurrent && (
        <p className={styles.help}>
          Save or reload current preferences before testing a destination.
        </p>
      )}
      <fieldset
        className={styles.testChoices}
        disabled={!savedCurrent || action.busy || action.unknown}
      >
        <legend className="srOnly">Test channels</legend>
        {testChannels.map((channel) => (
          <label key={channel} className={styles.choice}>
            <input
              type="checkbox"
              checked={action.channels.includes(channel)}
              disabled={!action.enabled[channel]}
              onChange={(event) => action.choose(channel, event.target.checked)}
            />
            <span>{channel === "email" ? "Email" : "SMS"}</span>
          </label>
        ))}
      </fieldset>
      {action.unknown ? (
        <div className={styles.reload}>
          <p role="alert">
            The test result is unknown. Check the saved destinations before
            deciding whether to send another test.
          </p>
          <button
            className="button"
            type="button"
            disabled={!savedCurrent}
            onClick={action.review}
          >
            Review another test
          </button>
        </div>
      ) : (
        <div className={styles.actionButtons}>
          <button
            className="button"
            type="button"
            disabled={!action.available || action.busy}
            onClick={() => void action.sendTest()}
          >
            {action.busy ? "Testing…" : "Send test alert"}
          </button>
        </div>
      )}
      {action.status.results && savedCurrent && (
        <ul
          className={styles.testResults}
          aria-label="Test results"
          aria-live="polite"
        >
          {action.status.results.map((result) => (
            <li key={result.channel}>
              {result.channel === "email" ? "Email" : "SMS"} ·{" "}
              {testResultLabel[result.status]}
              {result.detail ? (
                <p className={styles.help}>{result.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.help}>
        Provider acceptance does not confirm delivery.
      </p>
      {action.status.reviewed && (
        <p className={styles.help} role="status">
          The previous test result remains unknown. Choose Send test alert only
          if you want another test.
        </p>
      )}
      <QueryState error={action.status.error} />
    </section>
  );
}
