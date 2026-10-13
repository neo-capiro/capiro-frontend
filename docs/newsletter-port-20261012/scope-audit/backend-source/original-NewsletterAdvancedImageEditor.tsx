import { useEffect, useRef, useState } from 'react';
import { Modal } from './controls.js';
import { newsletterError } from './api.js';
import { newsletterImageFile } from './NewsletterImageAi.js';

export const PHOTOPEA_ORIGIN = 'https://www.photopea.com';
const editorUrl = `${PHOTOPEA_ORIGIN}/#${encodeURIComponent(
  JSON.stringify({
    environment: { lang: 'en', theme: 1, intro: false, localsave: false, panels: [0, 2, 9] },
  }),
)}`;
type Phase = 'starting' | 'loading' | 'ready' | 'exporting' | 'saving' | 'failed';
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

export function NewsletterAdvancedImageEditor({
  url,
  onSave,
  onClose,
}: {
  url: string;
  onSave: (file: File) => Promise<void>;
  onClose: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<Phase>('starting');
  const state = useRef<Phase>('starting');
  const [error, setError] = useState('');
  const [session, setSession] = useState(0);
  const sequence = useRef(0);
  const exportRequest = useRef<{ id: number; acknowledged: boolean } | null>(null);
  const timeout = useRef<number | null>(null);
  const live = useRef(false);
  const callbacks = useRef({ onSave, onClose });
  callbacks.current = { onSave, onClose };
  const update = (next: Phase) => {
    state.current = next;
    setPhase(next);
  };
  const clearTimeout = () => {
    if (timeout.current) window.clearTimeout(timeout.current);
    timeout.current = null;
  };
  const armTimeout = (message: string, next: Phase) => {
    clearTimeout();
    timeout.current = window.setTimeout(() => {
      if (!live.current) return;
      exportRequest.current = null;
      setError(message);
      update(next);
    }, 60_000);
  };
  useEffect(() => {
    live.current = true;
    let canceled = false;
    let imageSent = false;
    const isLoading = () => !canceled && state.current === 'loading';
    update('starting');
    setError('');
    exportRequest.current = null;
    armTimeout('Photopea did not load. Check your connection and reload the editor.', 'failed');
    const receive = async (event: MessageEvent) => {
      if (
        event.origin !== PHOTOPEA_ORIGIN ||
        event.source !== frame.current?.contentWindow ||
        canceled
      )
        return;
      if (event.data === 'done' && state.current === 'starting') {
        update('loading');
        armTimeout('The image did not load. Reload the editor to try again.', 'failed');
        try {
          const file = await newsletterImageFile(url);
          const bytes = await file.arrayBuffer();
          if (!isLoading()) return;
          imageSent = true;
          frame.current?.contentWindow?.postMessage(bytes, PHOTOPEA_ORIGIN);
        } catch (reason) {
          if (isLoading()) {
            clearTimeout();
            setError(newsletterError(reason));
            update('failed');
          }
        }
      } else if (event.data === 'done' && state.current === 'loading' && imageSent) {
        clearTimeout();
        update('ready');
      } else if (typeof event.data === 'string' && state.current === 'exporting') {
        const request = exportRequest.current;
        if (request && event.data === `capiro:export:${request.id}`) request.acknowledged = true;
        else if (event.data === 'done' && request?.acknowledged) {
          clearTimeout();
          exportRequest.current = null;
          setError('No PNG was exported. Select an open image in Photopea and try again.');
          update('ready');
        }
      } else if (
        event.data instanceof ArrayBuffer &&
        state.current === 'exporting' &&
        exportRequest.current?.acknowledged
      ) {
        clearTimeout();
        exportRequest.current = null;
        const bytes = new Uint8Array(event.data);
        if (
          bytes.length > 10 * 1024 * 1024 ||
          bytes.length < 8 ||
          !pngSignature.every((value, index) => bytes[index] === value)
        ) {
          setError('Export a PNG image smaller than 10 MB.');
          update('ready');
          return;
        }
        update('saving');
        try {
          await callbacks.current.onSave(
            new File([event.data], 'newsletter-photopea.png', { type: 'image/png' }),
          );
          if (!canceled) callbacks.current.onClose();
        } catch (reason) {
          if (!canceled) {
            setError(newsletterError(reason));
            update('ready');
          }
        }
      }
    };
    window.addEventListener('message', receive);
    const leave = (event: BeforeUnloadEvent) => {
      if (!['ready', 'exporting', 'saving'].includes(state.current)) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', leave);
    return () => {
      canceled = true;
      live.current = false;
      clearTimeout();
      window.removeEventListener('message', receive);
      window.removeEventListener('beforeunload', leave);
    };
  }, [url, session]);
  const busy = phase === 'exporting' || phase === 'saving';
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Modal title="Advanced image editor" wide className="nl-advanced-editor" onClose={close}>
      <div className="nl-advanced-editor-info">
        <p>
          Edit layers, text, colors and filters in Photopea. Save a PNG back to this newsletter.
        </p>
        <span className="nl-muted">
          This image opens in Photopea. Its free editor includes ads and branding.
        </span>
        {error && <p role="alert">{error}</p>}
        {phase !== 'ready' && phase !== 'failed' && (
          <p role="status">
            {phase === 'saving'
              ? 'Saving image…'
              : phase === 'exporting'
                ? 'Exporting image…'
                : 'Loading editor and image…'}
          </p>
        )}
        {phase === 'failed' && (
          <button onClick={() => setSession((value) => value + 1)}>Reload editor</button>
        )}
      </div>
      <iframe
        key={session}
        ref={frame}
        src={editorUrl}
        title="Photopea image editor"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-downloads"
        className={busy ? 'is-busy' : ''}
      />
      <footer>
        <button disabled={busy} onClick={close}>
          Cancel
        </button>
        <button
          className="nl-primary"
          disabled={phase !== 'ready'}
          onClick={() => {
            if (state.current !== 'ready') return;
            setError('');
            update('exporting');
            const id = ++sequence.current;
            exportRequest.current = { id, acknowledged: false };
            armTimeout('Export did not finish. You can try saving the image again.', 'ready');
            frame.current?.contentWindow?.postMessage(
              `app.echoToOE("capiro:export:${id}"); app.activeDocument.saveToOE("png");`,
              PHOTOPEA_ORIGIN,
            );
          }}
        >
          {busy ? (phase === 'saving' ? 'Saving image…' : 'Exporting image…') : 'Save image'}
        </button>
      </footer>
    </Modal>
  );
}
