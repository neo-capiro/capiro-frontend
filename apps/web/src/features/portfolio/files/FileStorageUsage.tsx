"use client";
import { ApiError } from "@/shared/portfolio/api/http";
import { useStorageUsage } from "./queries";
import styles from "./files.module.css";

const MIB = 1024 ** 2;
const GIB = 1024 ** 3;

export function storageAmount(bytes: number) {
  if (bytes === 0) return "0 MB";
  const size = bytes >= GIB ? GIB : MIB;
  const unit = size === GIB ? "GB" : "MB";
  const amount = bytes / size;
  if (amount < 0.05) return "<0.1 MB";
  return `${amount.toFixed(1).replace(/\.0$/, "")} ${unit}`;
}

export function FileStorageUsage({ clientId }: { clientId: string }) {
  const query = useStorageUsage(clientId);
  const usage = query.isSuccess && !query.error ? query.data : undefined;
  const available = usage?.status === "available" ? usage : undefined;
  const percent = available
    ? (available.usedBytes / available.allowanceBytes) * 100
    : 0;
  return (
    <section aria-label="Client storage usage" className={styles.storage}>
      <span className="eyebrow">Client storage</span>
      {query.isPending ? (
        <p role="status">Loading storage usage…</p>
      ) : query.error ? (
        <>
          <p role="status">Storage usage unavailable</p>
          {!(
            query.error instanceof ApiError &&
            [401, 403].includes(query.error.status)
          ) && (
            <button
              className="button ghost"
              onClick={() => void query.refetch()}
            >
              Retry usage
            </button>
          )}
        </>
      ) : available ? (
        <>
          <strong className={available.overAllowance ? styles.storageOver : ""}>
            {storageAmount(available.usedBytes)} of{" "}
            {storageAmount(available.allowanceBytes)}
          </strong>
          <div
            className={styles.storageTrack}
            role="progressbar"
            aria-label="Registered client storage used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(percent))}
            aria-valuetext={`${storageAmount(available.usedBytes)} of ${storageAmount(available.allowanceBytes)}`}
          >
            <span
              className={
                available.overAllowance
                  ? styles.storageFillOver
                  : styles.storageFill
              }
              style={{
                width: `${Math.max(available.usedBytes > 0 ? 1 : 0, Math.min(100, percent))}%`,
              }}
            />
          </div>
          <small className={available.overAllowance ? styles.storageOver : ""}>
            {available.overAllowance
              ? `Over the ${storageAmount(available.allowanceBytes)} allowance`
              : available.usedBytes === 0
                ? "0% used"
                : percent < 1
                  ? "<1% used"
                  : `${Math.round(percent)}% used`}
          </small>
          <small>Registered files · informational allowance</small>
        </>
      ) : (
        <>
          <p role="status">Storage usage unavailable</p>
          {usage?.status === "unavailable" && (
            <small>
              {usage.reason === "incomplete_size_metadata"
                ? "Some registered files have unknown sizes."
                : "The registered total cannot be displayed safely."}
            </small>
          )}
        </>
      )}
    </section>
  );
}
