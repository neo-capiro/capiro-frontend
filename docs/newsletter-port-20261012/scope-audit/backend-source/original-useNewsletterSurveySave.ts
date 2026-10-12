import { useEffect, useRef, useState } from 'react';
import type { NewsletterSavedSurvey, NewsletterSurveyDefinition } from '@capiro/shared/newsletter';
import { newsletterError, type NewsletterClient } from './api.js';

/** Serializes saves against the last acknowledged revision, retaining edits made in flight. */
export function useNewsletterSurveySave(input: {
  api: Pick<NewsletterClient, 'saveSurvey'>;
  documentId: string;
  initial?: NewsletterSavedSurvey;
  name: string;
  definition: NewsletterSurveyDefinition;
  enabled: boolean;
  mediaBusy: boolean;
  onDraftSaved?: (survey: NewsletterSavedSurvey) => void;
  onSaved: (survey: NewsletterSavedSurvey) => void;
  onClose: () => void;
  onNameRequired: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'saved' | 'unsaved' | 'saving' | 'failed'>(
    input.initial ? 'saved' : 'unsaved',
  );
  const [error, setError] = useState('');
  const active = useRef(true);
  const latest = useRef(input);
  latest.current = input;
  const saved = useRef(input.initial);
  const fingerprint = JSON.stringify({ name: input.name, definition: input.definition });
  const currentFingerprint = useRef(fingerprint);
  currentFingerprint.current = fingerprint;
  const acknowledged = useRef(input.initial ? fingerprint : null);
  const [savedFingerprint, setSavedFingerprint] = useState(input.initial ? fingerprint : null);
  const pending = useRef<Promise<NewsletterSavedSurvey | null> | null>(null);
  const finishing = useRef(false);
  const paused = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function persist(): Promise<NewsletterSavedSurvey | null> {
    if (pending.current) return pending.current;
    if (saved.current && acknowledged.current === currentFingerprint.current) return saved.current;
    const captured = latest.current;
    const capturedFingerprint = currentFingerprint.current;
    const revision = saved.current;
    setStatus('saving');
    setError('');
    const request = (async () => {
      await Promise.resolve();
      try {
        const result = await captured.api.saveSurvey(captured.documentId, {
          name: captured.name,
          definition: structuredClone(captured.definition),
          ...(revision ? { id: revision.id, revision: revision.revision } : {}),
        });
        if (!active.current) return null;
        saved.current = result;
        acknowledged.current = capturedFingerprint;
        setSavedFingerprint(capturedFingerprint);
        setStatus(currentFingerprint.current === capturedFingerprint ? 'saved' : 'unsaved');
        latest.current.onDraftSaved?.(result);
        return result;
      } catch (failure) {
        if (active.current) {
          paused.current = true;
          setStatus('failed');
          setError(newsletterError(failure));
        }
        return null;
      } finally {
        pending.current = null;
      }
    })();
    pending.current = request;
    return request;
  }

  useEffect(() => {
    if (
      !input.enabled ||
      input.mediaBusy ||
      busy ||
      paused.current ||
      !input.name.trim() ||
      acknowledged.current === fingerprint ||
      pending.current
    )
      return;
    const timer = window.setTimeout(() => {
      if (active.current && !finishing.current && !latest.current.mediaBusy) void persist();
    }, 1500);
    return () => window.clearTimeout(timer);
    // Reconsider unsaved edits after an in-flight request settles. Callbacks are captured in latest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, input.enabled, input.mediaBusy, busy, status]);

  async function finish(close: boolean) {
    if (finishing.current || latest.current.mediaBusy) return;
    if (!latest.current.name.trim()) {
      if (close && !saved.current && !latest.current.enabled) {
        latest.current.onClose();
        return;
      }
      setError('Enter a survey name.');
      latest.current.onNameRequired();
      return;
    }
    finishing.current = true;
    setBusy(true);
    paused.current = false;
    try {
      if (pending.current && !(await pending.current)) return;
      if (!active.current) return;
      const result = await persist();
      if (result && active.current) {
        if (close) latest.current.onClose();
        else latest.current.onSaved(result);
      }
    } finally {
      finishing.current = false;
      if (active.current) setBusy(false);
    }
  }

  return {
    busy,
    error,
    status: status === 'saved' && savedFingerprint !== fingerprint ? 'unsaved' : status,
    save: () => finish(false),
    close: () => finish(true),
  };
}
