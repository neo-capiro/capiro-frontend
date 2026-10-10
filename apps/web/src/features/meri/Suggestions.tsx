import { Button } from '@capiro/ui/button';
import { DesignIcon } from '../../shared/shell/DesignIcon';
import { suggestions } from './suggestions.mjs';
import styles from './home.module.css';

export function Suggestions({ onSelect }: { onSelect: (id: string) => void }) {
  return <><div className={styles.suggestions} aria-label="Draft suggestions">{suggestions.slice(0, 3).map(item => <section key={item.id} className={styles.card}><span className={styles.sparkleSlot}><DesignIcon name="sparkle" /></span><h2>{item.title}</h2><p>{item.description}</p><Button type="button" variant="ghost" className={styles.start} aria-label={`Start ${item.title.toLowerCase()} draft`} onClick={() => onSelect(item.id)}>Start</Button></section>)}</div><div className={styles.moreSuggestions}>{suggestions.slice(3).map(item => <Button key={item.id} type="button" variant="ghost" className={styles.start} onClick={() => onSelect(item.id)}>{item.title}</Button>)}</div></>;
}
