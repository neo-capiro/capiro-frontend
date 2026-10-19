import { MarkdownContent as Content } from "@capiro/ui/markdown";
import styles from "./markdown.module.css";
export function MarkdownContent({ source }: { source: string }) {
  return <Content source={source} className={styles.content} />;
}
