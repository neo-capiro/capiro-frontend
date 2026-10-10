'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@capiro/ui/button';
import { DesignIcon } from '../../shared/shell/DesignIcon';
import { MeriComposer } from './MeriComposer';
import { Suggestions } from './Suggestions';
import { selectSuggestion } from './suggestions.mjs';
import styles from './home.module.css';

export function MeriHome() {
  const [draft, setDraft] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const reset = () => { setDraft(''); textarea.current?.focus(); };
    window.addEventListener('meri:reset-local-draft', reset);
    return () => window.removeEventListener('meri:reset-local-draft', reset);
  }, []);
  const select = (id: string) => { setDraft(selectSuggestion(id)); textarea.current?.focus(); };
  return <div className={styles.home}>
    <div className={styles.scope}><Button type="button" variant="outline" className={styles.scopeButton} disabled title="Synthetic Anduril fixture; no client authorization"><DesignIcon name="chevron" />Anduril</Button><span className={styles.status} title="Prototype label only; no authorized source data">Your authorized data</span></div>
    <div className={styles.welcomeGroup}><div className={styles.welcome}><h1>Good morning, Jordan.</h1><p>What would you like to work on?</p></div><MeriComposer draft={draft} onDraft={setDraft} textareaRef={textarea} /><Suggestions onSelect={select} /></div>
  </div>;
}
