import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiScope } from '../../../../lib/use-api-scope.js';
import { newsletterError, useNewsletterApi } from './api.js';
import { NewsletterComments } from './NewsletterComments.js';
import './newsletter.css';

export default function NewsletterReview({ documentId }: { documentId: string }) {
  const scope = useApiScope();
  return <ReviewSession key={`${JSON.stringify(scope)}:${documentId}`} id={documentId} />;
}
function ReviewSession({ id }: { id: string }) {
  const api = useNewsletterApi();
  const [review, setReview] = useState<Awaited<ReturnType<typeof api.review>> | null>(null);
  const [error, setError] = useState('');
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await api.review(id);
        if (active) {
          setReview(result);
          setError('');
        }
      } catch (error) {
        if (active) {
          setReview(null);
          setError(newsletterError(error));
        }
      }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api, id]);
  return (
    <div className="nl-root nl-review">
      <header className="nl-header">
        <Link to="/workspace">← Workspace</Link>
        <h1>{review?.name || 'Newsletter review'}</h1>
        {review && ['owner', 'editor'].includes(review.role) && (
          <Link to={`/workspace/newsletters/${id}`}>Edit newsletter</Link>
        )}
        <button onClick={() => setMobile(!mobile)}>{mobile ? 'Desktop' : 'Mobile'}</button>
      </header>
      {error ? (
        <p role="alert">{error}</p>
      ) : review ? (
        <div className="nl-review-body">
          <div className="nl-preview-frame">
            <iframe
              sandbox=""
              title="Newsletter review"
              srcDoc={review.html}
              style={{ width: mobile ? 375 : 660 }}
            />
          </div>
          <NewsletterComments api={api} documentId={id} />
        </div>
      ) : (
        <p>Loading newsletter…</p>
      )}
    </div>
  );
}
