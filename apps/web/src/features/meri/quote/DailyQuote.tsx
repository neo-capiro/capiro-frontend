"use client";
import type { StoicQuote } from "./daily-quote";
import { useDailyQuote } from "./useDailyQuote";
import styles from "./quote.module.css";

/** One quotation with its author and quiet primary-source disclosure. */
export function QuoteBlock({ quote }: { quote: StoicQuote }) {
  return (
    <blockquote className={styles.quote}>
      <p className={styles.text}>{quote.text}</p>
      <footer className={styles.author}>{quote.author}</footer>
      <details className={styles.source}>
        <summary>Source</summary>
        <p>
          {quote.work}, {quote.locator}. Translated by {quote.translator}.
        </p>
        <a href={quote.sourceURL} target="_blank" rel="noreferrer noopener">
          Read the primary text
        </a>
      </details>
    </blockquote>
  );
}

/**
 * The empty-conversation identity: the day's verified Stoic quotation, its author, and the Meri
 * orb. It stays inside this component so an open conversation never gains or loses it, and the
 * local date is read only after mount so server and client markup agree.
 */
export function DailyQuote() {
  const quote = useDailyQuote();
  return (
    <div className={styles.daily}>
      {quote ? (
        <QuoteBlock quote={quote} />
      ) : (
        <div className={styles.quote} aria-hidden="true">
          <p className={styles.text} />
          <footer className={styles.author} />
        </div>
      )}
      <div className={styles.orbHeading}>
        <img
          className={styles.orb}
          src="/design/home/meri-orb.png"
          width={320}
          height={320}
          alt="Meri"
          decoding="async"
        />
      </div>
    </div>
  );
}
