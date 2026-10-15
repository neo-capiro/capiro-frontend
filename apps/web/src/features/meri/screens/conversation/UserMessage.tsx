import styles from "./conversation.module.css";

/** Figma 3.4 "Message · You": the person's own prompt in a muted bubble. */
export function UserMessage({ children }: { children: string }) {
  return (
    <p className={styles.userMessage}>
      <span className="sr-only">You: </span>
      {children}
    </p>
  );
}
