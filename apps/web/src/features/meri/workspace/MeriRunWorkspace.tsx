'use client';

import { useRef } from 'react';
import { MeriComposer } from '../MeriComposer';
import { ConversationTranscript } from './ConversationTranscript';
import { RunActivityPanel } from './RunActivityPanel';
import type { WorkspaceView } from './workspace-view';
import styles from './workspace.module.css';

export function MeriRunWorkspace({ view, draft, onDraft }: { view: WorkspaceView; draft: string; onDraft: (value: string) => void }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  return <div className={styles.workspace}>
    <div className={styles.heading}><div><h1>Sample research workspace</h1><p>Disconnected sample · Not saved</p></div><span className={styles.mark} role="img" aria-label="Meri" /></div>
    <p className={styles.notice}>No signed-in session, source access, saved files or executable run controls. Sample event references contain no source contents.</p>
    <div className={styles.body}><ConversationTranscript messages={view.messages} /><RunActivityPanel view={view} /></div>
    <MeriComposer draft={draft} onDraft={onDraft} textareaRef={textarea} />
  </div>;
}
