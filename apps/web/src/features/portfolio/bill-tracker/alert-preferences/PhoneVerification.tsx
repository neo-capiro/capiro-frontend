import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { usePhoneVerification } from "./usePhoneVerification";
import styles from "./preferences.module.css";

export function PhoneVerification({
  action,
  savedCurrent,
}: {
  action: ReturnType<typeof usePhoneVerification>;
  savedCurrent: boolean;
}) {
  return (
    <section
      className={styles.channelAction}
      aria-labelledby="alert-verification-title"
    >
      <h3 id="alert-verification-title">Phone verification</h3>
      <p className={styles.help}>
        Request a code for the saved phone number. Confirming it enables SMS
        alerts. Message and data rates may apply.
      </p>
      {!action.available && !action.busy && (
        <p className={styles.help}>
          Save a phone number and reload current preferences before requesting a
          code.
        </p>
      )}
      {action.unknown ? (
        <div className={styles.reload}>
          <p role="alert">
            The verification request could not be confirmed. It may have reached
            the service. Review before making another request.
          </p>
          <button
            className="button"
            type="button"
            disabled={!savedCurrent}
            onClick={action.review}
          >
            Review another request
          </button>
        </div>
      ) : (
        <>
          {action.challenge && savedCurrent && (
            <>
              <p className={styles.help} role="status">
                Request acknowledged for {action.challenge.receipt.masked}.{" "}
                {action.challenge.receipt.dormant
                  ? "The service reports that SMS is dormant."
                  : "Enter the code if it arrives."}
              </p>
              {action.challenge.receipt.devCode && (
                <p className={styles.help}>
                  Development code returned by the service:{" "}
                  <code>{action.challenge.receipt.devCode}</code>
                </p>
              )}
              <label className={styles.field}>
                <span>Verification code</span>
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={action.code}
                  disabled={action.busy}
                  onChange={(event) => action.setCode(event.target.value)}
                />
              </label>
              <div className={styles.actionButtons}>
                <button
                  className="button"
                  type="button"
                  disabled={
                    !action.available ||
                    action.busy ||
                    !/^\d{6}$/.test(action.code)
                  }
                  onClick={() => void action.confirmPhone()}
                >
                  Confirm phone
                </button>
              </div>
            </>
          )}
          <div className={styles.actionButtons}>
            <button
              className="button"
              type="button"
              disabled={!action.available || action.busy}
              onClick={() => void action.requestCode()}
            >
              {action.busy
                ? "Checking verification…"
                : action.challenge
                  ? "Request new code"
                  : "Request verification code"}
            </button>
          </div>
        </>
      )}
      {action.status.reviewed && (
        <p className={styles.help} role="status">
          The previous result remains unknown. Review the saved number before
          choosing to request another code.
        </p>
      )}
      {action.status.verified && savedCurrent && (
        <p role="status">
          Phone verified and SMS alerts enabled in the saved preferences.
        </p>
      )}
      <QueryState error={action.status.error} />
    </section>
  );
}
