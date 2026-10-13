import { type NewsletterSurveyDefinition, newsletterVideoSource } from '@capiro/shared/newsletter';
import { newsletterSafeUrl } from '@capiro/shared/newsletter-render';

/** Builds a player URL from a known provider's canonical source, never arbitrary iframe markup. */
export function newsletterSurveyVideoEmbed(value: string) {
  const source = newsletterVideoSource(value);
  if (!source) return null;
  const url = new URL(source.url);
  if (source.provider === 'youtube')
    return `https://www.youtube-nocookie.com/embed/${url.searchParams.get('v')}`;
  const parts = url.pathname.split('/').filter(Boolean);
  const unlisted = /^\d+$/.test(parts[0] || '') && parts.length === 2;
  const id = unlisted ? parts[0] : parts[parts.length - 1];
  const player = new URL(`https://player.vimeo.com/video/${id}`);
  const hash = url.searchParams.get('h') || (unlisted ? parts[1] : '');
  if (hash) player.searchParams.set('h', hash);
  player.searchParams.set('dnt', '1');
  return player.href;
}

export function NewsletterSurveyDraftPreview({
  definition,
}: {
  definition: NewsletterSurveyDefinition;
}) {
  return (
    <section
      className="nl-survey-draft-preview"
      aria-label="Survey draft preview"
      style={{ background: definition.background }}
    >
      {newsletterSafeUrl(definition.logoUrl, true) && (
        <img src={newsletterSafeUrl(definition.logoUrl, true)} alt="Survey logo" />
      )}
      <h2>{definition.title}</h2>
      <p>{definition.description}</p>
      {definition.questions.map((question) => {
        const introduction = question.type === 'introduction';
        if (introduction && question.introductionType === null) return null;
        const showImage =
          !introduction ||
          question.introductionType === undefined ||
          question.introductionType === 'image';
        const showVideo =
          !introduction ||
          question.introductionType === undefined ||
          question.introductionType === 'video';
        const embed = newsletterSurveyVideoEmbed(question.videoUrl);
        const count = Math.max(1, Math.min(11, question.range.max - question.range.min + 1));
        return (
          <section key={question.id}>
            <h3>
              {question.prompt}
              {question.required ? ' *' : ''}
            </h3>
            {['radio', 'checkbox'].includes(question.type) ? (
              question.options.map((option, index) => (
                <label key={index}>
                  <input disabled type={question.type === 'radio' ? 'radio' : 'checkbox'} />{' '}
                  {option}
                </label>
              ))
            ) : question.type === 'range' ? (
              <div
                role="group"
                aria-label={question.prompt || 'Rating'}
                className="nl-survey-rating"
              >
                {Array.from({ length: count }, (_, index) => {
                  const value = question.range.min + index;
                  const emoji = ['😞', '🙁', '😐', '🙂', '😄'][
                    Math.round((index / Math.max(1, count - 1)) * 4)
                  ];
                  return (
                    <button
                      type="button"
                      key={value}
                      disabled
                      aria-label={`${value} of ${question.range.max}`}
                    >
                      <span aria-hidden={question.range.display !== 'numbers'}>
                        {question.range.display === 'numbers'
                          ? value
                          : question.range.display === 'stars'
                            ? '☆'
                            : question.range.display === 'hearts'
                              ? '♡'
                              : emoji}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : question.type === 'text' ? (
              <textarea
                disabled
                aria-label={question.prompt || 'Your answer'}
                placeholder="Your answer"
              />
            ) : !['introduction', 'content'].includes(question.type) ? (
              <input
                disabled
                type={
                  question.type === 'email'
                    ? 'email'
                    : question.type === 'contact' && question.contactField === 'age'
                      ? 'number'
                      : 'text'
                }
                aria-label={question.prompt || question.type}
                placeholder={question.type === 'email' ? 'Email address' : 'Your answer'}
              />
            ) : null}
            {question.other && ['radio', 'checkbox'].includes(question.type) && (
              <p>Other: __________</p>
            )}
            {showImage && newsletterSafeUrl(question.imageUrl, true) && (
              <img src={newsletterSafeUrl(question.imageUrl, true)} alt={question.alt} />
            )}
            {showVideo &&
              (embed ? (
                <iframe
                  src={embed}
                  title={question.prompt ? `Video: ${question.prompt}` : 'Survey video'}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : question.videoUrl ? (
                <p className="nl-muted">Use a YouTube or Vimeo video URL to embed this video.</p>
              ) : null)}
            {question.type === 'email' && question.askToSubscribe && (
              <label>
                <input disabled type="checkbox" /> Subscribe to email updates
              </label>
            )}
          </section>
        );
      })}
      <button
        type="button"
        disabled
        style={{ background: definition.buttonColor, color: definition.buttonTextColor }}
      >
        {definition.submitLabel}
      </button>
      <p className="nl-muted">Draft preview · Responses are not submitted.</p>
    </section>
  );
}
