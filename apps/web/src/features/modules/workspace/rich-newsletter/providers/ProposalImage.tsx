import styles from "../assets/stock-images.module.css";

/** Displays an admitted result; the caller separately controls whether it can be adopted. */
export function ProposalImage({ url, label }: { url: string; label: string }) {
  return (
    <div className={styles.canvas}>
      {/* A dynamic result URL; the service owns its bytes, not a Next image proxy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} referrerPolicy="no-referrer" />
    </div>
  );
}
