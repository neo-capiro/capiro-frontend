import {
  NEWSLETTER_SURVEY_SECTION_TYPES,
  type NewsletterSurveyQuestion,
  type NewsletterSurveySectionType,
} from "@capiro/shared/newsletter";
import { ActionButton } from "@/shared/module-ui";
import { SurveyText, SurveyChoice, SurveyFlag } from "./SurveyFields";
import { changeQuestionType } from "./survey-draft";
import ui from "../library/sections.module.css";
import styles from "./surveys.module.css";

export function SurveyQuestion({
  question,
  index,
  count,
  headingId,
  change,
  remove,
  move,
}: {
  question: NewsletterSurveyQuestion;
  index: number;
  count: number;
  headingId: string;
  change: (next: NewsletterSurveyQuestion) => void;
  remove: () => void;
  move: (offset: number) => void;
}) {
  const update = (values: Partial<NewsletterSurveyQuestion>) =>
    change({ ...question, ...values });
  const introduction = question.type === "introduction",
    content = question.type === "content",
    choice = question.type === "radio" || question.type === "checkbox";
  const image =
    content ||
    (introduction &&
      (question.introductionType === "image" ||
        question.introductionType === undefined));
  const video =
    content ||
    (introduction &&
      (question.introductionType === "video" ||
        question.introductionType === undefined));
  return (
    <section className={ui.details} aria-labelledby={headingId}>
      <h3 id={headingId} tabIndex={-1}>
        Question {index + 1}
      </h3>
      <div className={styles.pair}>
        <SurveyChoice
          label="Section type"
          value={question.type}
          options={NEWSLETTER_SURVEY_SECTION_TYPES}
          change={(type) =>
            change(
              changeQuestionType(question, type as NewsletterSurveySectionType),
            )
          }
        />
        <SurveyFlag
          label="Required"
          value={question.required}
          change={(required) => update({ required })}
        />
      </div>
      {introduction && (
        <>
          <SurveyChoice
            label="Introduction type"
            value={
              question.introductionType === undefined
                ? "legacy"
                : (question.introductionType ?? "")
            }
            options={[
              ...(question.introductionType === undefined
                ? [["legacy", "Existing combined introduction"] as const]
                : []),
              ["", "Choose a type"],
              ["text", "Text"],
              ["image", "Image"],
              ["video", "Video"],
            ]}
            change={(value) => {
              if (value !== "legacy")
                update({
                  introductionType: value
                    ? (value as "text" | "image" | "video")
                    : null,
                });
            }}
          />
          {question.introductionType === undefined && (
            <p>
              Existing combined introduction is preserved until you choose a
              type.
            </p>
          )}
        </>
      )}
      <SurveyText
        label={content ? "Content" : "Question"}
        value={question.prompt}
        max={6000}
        multiline
        change={(prompt) => update({ prompt })}
      />
      {choice && (
        <>
          <h4>Choices</h4>
          {question.options.map((option, position) => (
            <div className={styles.option} key={position}>
              <SurveyText
                label={`Choice ${position + 1}`}
                value={option}
                max={500}
                multiline
                change={(value) =>
                  update({
                    options: question.options.map((old, i) =>
                      i === position ? value : old,
                    ),
                  })
                }
              />
              <ActionButton
                className={ui.button}
                onClick={() =>
                  update({
                    options: question.options.filter((_, i) => i !== position),
                  })
                }
              >
                Remove choice {position + 1}
              </ActionButton>
            </div>
          ))}
          <ActionButton
            className={ui.button}
            disabled={question.options.length >= 30}
            onClick={() => update({ options: [...question.options, ""] })}
          >
            Add choice
          </ActionButton>
          <SurveyFlag
            label="Include Other choice"
            value={question.other}
            change={(other) => update({ other })}
          />
        </>
      )}
      {question.type === "range" && (
        <>
          <div className={styles.pair}>
            <SurveyChoice
              label="Minimum"
              value={String(question.range.min)}
              options={Array.from({ length: 11 }, (_, i) => [
                String(i),
                String(i),
              ])}
              change={(min) =>
                update({ range: { ...question.range, min: Number(min) } })
              }
            />
            <SurveyChoice
              label="Maximum"
              value={String(question.range.max)}
              options={Array.from({ length: 10 }, (_, i) => [
                String(i + 1),
                String(i + 1),
              ])}
              change={(max) =>
                update({ range: { ...question.range, max: Number(max) } })
              }
            />
          </div>
          <SurveyChoice
            label="Range display"
            value={question.range.display}
            options={[
              ["numbers", "Numbers"],
              ["stars", "Stars"],
              ["emojis", "Emojis"],
              ["hearts", "Hearts"],
            ]}
            change={(display) =>
              update({
                range: {
                  ...question.range,
                  display:
                    display as NewsletterSurveyQuestion["range"]["display"],
                },
              })
            }
          />
          {question.range.min >= question.range.max && (
            <p role="alert">Minimum must be less than maximum.</p>
          )}
        </>
      )}
      {question.type === "email" && (
        <SurveyFlag
          label="Ask to subscribe"
          value={question.askToSubscribe}
          change={(askToSubscribe) => update({ askToSubscribe })}
        />
      )}
      {question.type === "contact" && (
        <SurveyChoice
          label="Contact field"
          value={question.contactField}
          options={[
            ["firstName", "First name"],
            ["lastName", "Last name"],
            ["age", "Age"],
            ["gender", "Gender"],
            ["address", "Address"],
          ]}
          change={(contactField) =>
            update({
              contactField:
                contactField as NewsletterSurveyQuestion["contactField"],
            })
          }
        />
      )}
      {image && (
        <>
          <SurveyText
            label="Image URL"
            value={question.imageUrl}
            max={2000}
            change={(imageUrl) => update({ imageUrl })}
          />
          <SurveyText
            label="Image alt text"
            value={question.alt}
            max={2000}
            change={(alt) => update({ alt })}
          />
        </>
      )}
      {video && (
        <SurveyText
          label="Video URL"
          value={question.videoUrl}
          max={2000}
          change={(videoUrl) => update({ videoUrl })}
        />
      )}
      <div className={ui.actions}>
        <ActionButton className={ui.button} onClick={remove}>
          Remove section
        </ActionButton>
        <ActionButton
          className={ui.button}
          disabled={index === 0}
          onClick={() => move(-1)}
        >
          Move up
        </ActionButton>
        <ActionButton
          className={ui.button}
          disabled={index === count - 1}
          onClick={() => move(1)}
        >
          Move down
        </ActionButton>
      </div>
    </section>
  );
}
