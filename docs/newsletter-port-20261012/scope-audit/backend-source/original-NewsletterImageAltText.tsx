import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { newsletterError, newsletterImageToken, type NewsletterClient } from './api.js';
import { newsletterImageFile } from './NewsletterImageAi.js';

export function NewsletterImageAltText({
  api,
  documentId,
  imageUrl,
  alt,
  available,
  reason,
  onGenerated,
  label,
  children,
}: {
  api: NewsletterClient;
  documentId: string;
  imageUrl: string;
  alt: string;
  available: boolean;
  reason?: string | null;
  onGenerated: (text: string, source: { imageUrl: string; alt: string }) => boolean;
  label?: ReactNode;
  children?: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const latest = useRef({ imageUrl, alt, documentId, onGenerated });
  latest.current = { imageUrl, alt, documentId, onGenerated };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <div className="nl-alt-text-ai">
      <div className="nl-alt-text-ai-action">
        {label}
        <button
          type="button"
          disabled={pending || !available || !imageUrl}
          title={
            !available ? reason || 'Connect OpenAI in AI settings to generate alt text.' : undefined
          }
          onClick={async () => {
            if (inFlight.current || !available || !imageUrl) return;
            inFlight.current = true;
            setPending(true);
            setMessage('');
            setError('');
            const source = { imageUrl, alt };
            const matches = () =>
              mounted.current &&
              latest.current.documentId === documentId &&
              latest.current.imageUrl === source.imageUrl &&
              latest.current.alt === source.alt;
            try {
              const file = newsletterImageToken(imageUrl)
                ? undefined
                : await newsletterImageFile(imageUrl);
              if (!matches()) return;
              const text = await api.generateAltText(documentId, file, imageUrl);
              if (!mounted.current) return;
              if (!matches() || !latest.current.onGenerated(text, source)) {
                setMessage('Image or alt text changed. Generate again for the current image.');
                return;
              }
              setMessage('Alt text generated. Review it and edit the wording as needed.');
            } catch (e) {
              if (mounted.current) setError(newsletterError(e));
            } finally {
              inFlight.current = false;
              if (mounted.current) setPending(false);
            }
          }}
        >
          <Sparkles size={14} /> {pending ? 'Generating…' : 'Generate for me'}
        </button>
      </div>
      {children}
      {pending && <p role="status">Generating alt text…</p>}
      {!pending && message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
