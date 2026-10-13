import { useState } from 'react';
import {
  NEWSLETTER_SURVEY_SECTION_TYPES,
  createNewsletterSurveyQuestion,
  defaultNewsletterSurveyDefinition,
  type NewsletterSavedSurvey,
  type NewsletterSurveyDefinition,
  type NewsletterSurveyQuestion,
} from '@capiro/shared/newsletter';
import { Check, ColorField, Modal, NumberField, SelectField, TextField } from './controls.js';
import { type NewsletterClient } from './api.js';
import { NewsletterSurveyMedia } from './NewsletterSurveyMedia.js';
import { NewsletterSurveyDraftPreview } from './NewsletterSurveyPreview.js';
import { useNewsletterSurveySave } from './useNewsletterSurveySave.js';

export function NewsletterSurveyBuilder({
  api,
  mediaApi,
  documentId,
  initial,
  onDraftSaved,
  onSaved,
  onClose,
}: {
  api: Pick<NewsletterClient, 'saveSurvey'>;
  mediaApi?: NewsletterClient;
  documentId: string;
  initial?: NewsletterSavedSurvey;
  onDraftSaved?: (survey: NewsletterSavedSurvey) => void;
  onSaved: (survey: NewsletterSavedSurvey) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [definition, setDefinition] = useState(() =>
    structuredClone(initial?.definition || defaultNewsletterSurveyDefinition()),
  );
  const [step, setStep] = useState<'Setup' | 'Content' | 'Design' | 'Review'>(
    initial ? 'Content' : 'Setup',
  );
  const [selected, setSelected] = useState<string | null>(
    initial?.definition.questions[0]?.id || null,
  );
  const [mediaBusy, setMediaBusy] = useState(false);
  const { busy, error, status, save, close } = useNewsletterSurveySave({
    api,
    documentId,
    initial,
    name,
    definition,
    enabled: step !== 'Setup',
    mediaBusy,
    onDraftSaved,
    onSaved,
    onClose,
    onNameRequired: () => setStep('Setup'),
  });
  const question = definition.questions.find((q) => q.id === selected);
  const edit = (change: (value: NewsletterSurveyDefinition) => void) =>
    setDefinition((value) => {
      const copy = structuredClone(value);
      change(copy);
      return copy;
    });
  const editQuestion = (change: (value: NewsletterSurveyQuestion) => void) =>
    edit((value) => {
      const found = value.questions.find((q) => q.id === selected);
      if (found) change(found);
    });
  const introduction = question?.type === 'introduction';
  const showContent = !introduction || question.introductionType !== null;
  const showImage =
    !introduction ||
    question.introductionType === undefined ||
    question.introductionType === 'image';
  const showVideo =
    !introduction ||
    question.introductionType === undefined ||
    question.introductionType === 'video';
  return (
    <Modal
      title={step === 'Setup' ? 'Setup your survey' : `Survey · ${name}`}
      onClose={() => {
        if (!busy && !mediaBusy) void close();
      }}
      wide
      className="nl-survey-builder"
    >
      <p className="nl-muted">
        Workspace survey draft · Destinations are selected later in Outreach.
      </p>
      {error && (
        <p role="alert" className="nl-error">
          {error}
        </p>
      )}
      <fieldset disabled={busy || mediaBusy} className="nl-survey-fields">
        {step === 'Setup' ? (
          <>
            <TextField label="Survey name" value={name} onChange={setName} />
            <button type="button" disabled={!name.trim()} onClick={() => setStep('Content')}>
              Begin
            </button>
          </>
        ) : (
          <>
            <nav aria-label="Survey steps" className="nl-flex">
              {(['Content', 'Design', 'Review'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-current={step === value ? 'step' : undefined}
                  onClick={() => setStep(value)}
                >
                  {value}
                </button>
              ))}
            </nav>
            {step === 'Content' && (
              <div className="nl-survey-builder-grid">
                <aside aria-label="Survey sections">
                  <h3>Add a section</h3>
                  <div className="nl-grid2">
                    {NEWSLETTER_SURVEY_SECTION_TYPES.map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        disabled={definition.questions.length >= 30}
                        onClick={() => {
                          const next = createNewsletterSurveyQuestion(type);
                          if (type === 'radio' || type === 'checkbox')
                            next.options = ['Option 1', 'Option 2'];
                          edit((value) => value.questions.push(next));
                          setSelected(next.id);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <ol>
                    {definition.questions.map((q, index) => (
                      <li key={q.id}>
                        <button
                          type="button"
                          aria-pressed={q.id === selected}
                          onClick={() => setSelected(q.id)}
                        >
                          {index + 1}.{' '}
                          {q.prompt ||
                            NEWSLETTER_SURVEY_SECTION_TYPES.find(([type]) => type === q.type)?.[1]}
                        </button>
                      </li>
                    ))}
                  </ol>
                </aside>
                <section aria-label="Survey section editor">
                  {question ? (
                    <>
                      <h3>
                        {
                          NEWSLETTER_SURVEY_SECTION_TYPES.find(
                            ([type]) => type === question.type,
                          )?.[1]
                        }
                      </h3>
                      {introduction && (
                        <fieldset className="nl-survey-introduction-types">
                          <legend>Introduction content</legend>
                          {(
                            [
                              [
                                'video',
                                'Embed Video',
                                'Introduce your policy briefing with a YouTube or Vimeo video.',
                              ],
                              [
                                'text',
                                'Text Introduction',
                                'Explain how client feedback will inform your bill and news coverage.',
                              ],
                              [
                                'image',
                                'Image',
                                'Add an image and supporting text for your clients.',
                              ],
                            ] as const
                          ).map(([value, label, description]) => (
                            <label key={value} className="nl-survey-introduction-card">
                              <input
                                type="radio"
                                name={`introduction-${question.id}`}
                                checked={question.introductionType === value}
                                onChange={() =>
                                  editQuestion((q) => {
                                    q.introductionType = value;
                                  })
                                }
                              />
                              <span>
                                <strong>{label}</strong>
                                <small>{description}</small>
                              </span>
                            </label>
                          ))}
                          {question.introductionType === undefined && (
                            <p className="nl-muted">
                              Choose a content type for this introduction. Your existing text and
                              media will be retained.
                            </p>
                          )}
                        </fieldset>
                      )}
                      {showContent && (
                        <TextField
                          label={
                            ['introduction', 'content'].includes(question.type)
                              ? 'Content'
                              : 'What would you like to ask?'
                          }
                          value={question.prompt}
                          multiline={['introduction', 'content'].includes(question.type)}
                          onChange={(value) =>
                            editQuestion((q) => {
                              q.prompt = value;
                            })
                          }
                        />
                      )}
                      {!['introduction', 'content'].includes(question.type) && (
                        <Check
                          label="Required"
                          checked={question.required}
                          onChange={(value) =>
                            editQuestion((q) => {
                              q.required = value;
                            })
                          }
                        />
                      )}
                      {['radio', 'checkbox'].includes(question.type) && (
                        <>
                          {question.options.map((option, index) => (
                            <div className="nl-flex" key={index}>
                              <label className="nl-field">
                                <span>Choice {index + 1}</span>
                                <input
                                  value={option}
                                  onChange={(event) =>
                                    editQuestion((q) => {
                                      q.options[index] = event.target.value;
                                    })
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' && question.options.length < 30) {
                                      event.preventDefault();
                                      editQuestion((q) => q.options.push(''));
                                    }
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                aria-label={`Delete choice ${index + 1}`}
                                onClick={() => editQuestion((q) => q.options.splice(index, 1))}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            disabled={question.options.length >= 30}
                            onClick={() => editQuestion((q) => q.options.push(''))}
                          >
                            Add choice
                          </button>
                          <Check
                            label="Toggle Other Option"
                            checked={question.other}
                            onChange={(value) =>
                              editQuestion((q) => {
                                q.other = value;
                              })
                            }
                          />
                        </>
                      )}
                      {question.type === 'range' && (
                        <>
                          <SelectField
                            label="Range display"
                            value={question.range.display}
                            values={['numbers', 'stars', 'emojis', 'hearts']}
                            onChange={(value) =>
                              editQuestion((q) => {
                                q.range.display = value;
                              })
                            }
                          />
                          <div className="nl-grid2">
                            <NumberField
                              label="Range minimum"
                              value={question.range.min}
                              max={9}
                              onChange={(value) =>
                                editQuestion((q) => {
                                  q.range.min = Math.round(value);
                                  q.range.max = Math.max(q.range.max, q.range.min + 1);
                                })
                              }
                            />
                            <NumberField
                              label="Range maximum"
                              value={question.range.max}
                              min={1}
                              max={10}
                              onChange={(value) =>
                                editQuestion((q) => {
                                  q.range.max = Math.round(value);
                                  q.range.min = Math.min(q.range.min, q.range.max - 1);
                                })
                              }
                            />
                          </div>
                        </>
                      )}
                      {question.type === 'email' && (
                        <Check
                          label="Ask to subscribe"
                          checked={question.askToSubscribe}
                          onChange={(value) =>
                            editQuestion((q) => {
                              q.askToSubscribe = value;
                            })
                          }
                        />
                      )}
                      {question.type === 'contact' && (
                        <SelectField
                          label="Contact field"
                          value={question.contactField}
                          values={[
                            ['firstName', 'First name'],
                            ['lastName', 'Last name'],
                            ['age', 'Age'],
                            ['gender', 'Gender'],
                            ['address', 'Address'],
                          ]}
                          onChange={(value) =>
                            editQuestion((q) => {
                              q.contactField = value;
                            })
                          }
                        />
                      )}
                      {['introduction', 'content'].includes(question.type) && (
                        <>
                          {showImage && mediaApi && (
                            <NewsletterSurveyMedia
                              key={question.id}
                              api={mediaApi}
                              documentId={documentId}
                              label="Section image"
                              value={question.imageUrl}
                              alt={question.alt}
                              onBusy={setMediaBusy}
                              onChange={(url, alt) =>
                                editQuestion((q) => {
                                  q.imageUrl = url;
                                  if (alt !== undefined) q.alt = alt;
                                })
                              }
                            />
                          )}
                          {showImage && (
                            <TextField
                              label="Image URL"
                              value={question.imageUrl}
                              onChange={(value) =>
                                editQuestion((q) => {
                                  q.imageUrl = value;
                                })
                              }
                            />
                          )}
                          {showImage && (
                            <TextField
                              label="Image description"
                              value={question.alt}
                              onChange={(value) =>
                                editQuestion((q) => {
                                  q.alt = value;
                                })
                              }
                            />
                          )}
                          {showVideo && (
                            <TextField
                              label="Video URL"
                              value={question.videoUrl}
                              onChange={(value) =>
                                editQuestion((q) => {
                                  q.videoUrl = value;
                                })
                              }
                            />
                          )}
                        </>
                      )}
                      <div className="nl-flex">
                        <button
                          type="button"
                          disabled={definition.questions.length >= 30}
                          onClick={() => {
                            const next = {
                              ...structuredClone(question),
                              id: createNewsletterSurveyQuestion(question.type).id,
                            };
                            edit((value) =>
                              value.questions.splice(
                                value.questions.findIndex((q) => q.id === selected) + 1,
                                0,
                                next,
                              ),
                            );
                            setSelected(next.id);
                          }}
                        >
                          Duplicate Question
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            edit((value) => {
                              value.questions = value.questions.filter((q) => q.id !== selected);
                            });
                            setSelected(null);
                          }}
                        >
                          Delete Question
                        </button>
                        {([-1, 1] as const).map((direction) => (
                          <button
                            key={direction}
                            type="button"
                            aria-label={`Move question ${direction < 0 ? 'up' : 'down'}`}
                            disabled={
                              definition.questions.findIndex((q) => q.id === selected) + direction <
                                0 ||
                              definition.questions.findIndex((q) => q.id === selected) +
                                direction >=
                                definition.questions.length
                            }
                            onClick={() =>
                              edit((value) => {
                                const index = value.questions.findIndex((q) => q.id === selected);
                                const [q] = value.questions.splice(index, 1);
                                value.questions.splice(index + direction, 0, q!);
                              })
                            }
                          >
                            {direction < 0 ? '↑' : '↓'}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p>
                      Choose a section type to add questions, an introduction or supporting content.
                    </p>
                  )}
                </section>
              </div>
            )}
            {step === 'Design' && (
              <>
                <h3>Branding</h3>
                {mediaApi && (
                  <NewsletterSurveyMedia
                    key="survey-logo"
                    api={mediaApi}
                    documentId={documentId}
                    label="Survey logo"
                    value={definition.logoUrl}
                    alt="Survey logo"
                    onBusy={setMediaBusy}
                    onChange={(url) =>
                      edit((d) => {
                        d.logoUrl = url;
                      })
                    }
                  />
                )}
                <TextField
                  label="Logo URL"
                  value={definition.logoUrl}
                  onChange={(value) =>
                    edit((d) => {
                      d.logoUrl = value;
                    })
                  }
                />
                <TextField
                  label="Description"
                  multiline
                  value={definition.description}
                  onChange={(value) =>
                    edit((d) => {
                      d.description = value;
                    })
                  }
                />
                <h3>Custom Messaging</h3>
                {(
                  [
                    ['title', 'Survey title'],
                    ['submitLabel', 'Submit button label'],
                    ['confirmation', 'Confirmation message'],
                    ['closedMessage', 'Closed survey message'],
                    ['requiredMessage', 'Required response error message'],
                  ] as const
                ).map(([key, label]) => (
                  <TextField
                    key={key}
                    label={label}
                    value={definition[key]}
                    onChange={(value) =>
                      edit((d) => {
                        d[key] = value;
                      })
                    }
                  />
                ))}
                <h3>Styles</h3>
                {(
                  [
                    ['background', 'Background color'],
                    ['buttonColor', 'Button color'],
                    ['buttonTextColor', 'Button text color'],
                  ] as const
                ).map(([key, label]) => (
                  <ColorField
                    key={key}
                    label={label}
                    value={definition[key]}
                    onChange={(value) =>
                      edit((d) => {
                        d[key] = value;
                      })
                    }
                  />
                ))}
              </>
            )}
            {step === 'Review' && (
              <>
                <TextField label="Survey name" value={name} onChange={setName} />
                <NewsletterSurveyDraftPreview definition={definition} />
                <p role="status">
                  Save this reusable draft to Workspace. Hosted response delivery, tagging and
                  notifications remain pending.
                </p>
              </>
            )}
            <div className="nl-flex nl-survey-footer">
              {step === 'Content' && (
                <button type="button" onClick={() => setStep('Design')}>
                  Continue to design
                </button>
              )}
              {step === 'Design' && (
                <button type="button" onClick={() => setStep('Review')}>
                  Review
                </button>
              )}
              <button type="button" onClick={() => void save()}>
                Save survey draft
              </button>
              <button type="button" onClick={() => void close()}>
                Go back
              </button>
            </div>
          </>
        )}
      </fieldset>
      {step !== 'Setup' && (
        <p role="status" className="nl-survey-save-status">
          {status === 'saving' || busy
            ? 'Saving survey…'
            : status === 'saved'
              ? 'All changes saved to Workspace.'
              : status === 'failed'
                ? 'Changes are unsaved. Use Save survey draft to retry.'
                : 'Unsaved changes'}
        </p>
      )}
    </Modal>
  );
}
