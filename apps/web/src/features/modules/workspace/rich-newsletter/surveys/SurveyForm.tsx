import { useId, useRef, useState } from "react";
import {
  NEWSLETTER_SURVEY_SECTION_TYPES,
  type NewsletterSurveySectionType,
} from "@capiro/shared/newsletter";
import { ActionButton, Tabs } from "@/shared/module-ui";
import type { SurveyDraftState } from "./use-survey-drafts";
import { appendSurveyQuestion } from "./survey-draft";
import { SurveyQuestion } from "./SurveyQuestion";
import { SurveyText, SurveyChoice } from "./SurveyFields";
import ui from "../library/sections.module.css";
import styles from "./surveys.module.css";

export function SurveyForm({ survey }: { survey: SurveyDraftState }) {
  const form = survey.form!,
    [tab, setTab] = useState("questions"),
    [type, setType] = useState<NewsletterSurveySectionType>("radio");
  const id = useId(),
    add = useRef<HTMLButtonElement>(null);
  const definition = form.definition;
  const edit = survey.edit;
  const focusQuestion = (questionId?: string) =>
    requestAnimationFrame(() => {
      if (questionId) document.getElementById(`${id}-${questionId}`)?.focus();
      else add.current?.focus();
    });
  return (
    <>
      <div className={styles.tabs}>
        <Tabs
          label="Survey draft sections"
          value={tab}
          onChange={setTab}
          items={[
            { id: "questions", label: "Questions" },
            { id: "messages", label: "Messages & appearance" },
          ]}
        />
      </div>
      <fieldset
        className={styles.form}
        disabled={survey.pending || survey.unknown}
      >
        {tab === "questions" ? (
          <>
            <section className={ui.details}>
              <h3>Survey details</h3>
              <div className={form.saved ? styles.pair : styles.stack}>
                <SurveyText
                  label="Saved draft name"
                  value={form.name}
                  max={200}
                  change={(name) =>
                    edit((next) => {
                      next.name = name;
                    })
                  }
                />
                <SurveyText
                  label="Survey title"
                  value={definition.title}
                  max={500}
                  change={(title) =>
                    edit((next) => {
                      next.definition.title = title;
                    })
                  }
                />
              </div>
              <SurveyText
                label="Description"
                value={definition.description}
                max={6000}
                multiline
                change={(description) =>
                  edit((next) => {
                    next.definition.description = description;
                  })
                }
              />
            </section>
            {definition.questions.map((question, index) => (
              <SurveyQuestion
                key={question.id}
                question={question}
                index={index}
                count={definition.questions.length}
                headingId={`${id}-${question.id}`}
                change={(changed) =>
                  edit((next) => {
                    next.definition.questions[index] = changed;
                  })
                }
                remove={() => {
                  edit((next) => {
                    next.definition.questions.splice(index, 1);
                  });
                  focusQuestion(
                    definition.questions[index + 1]?.id ??
                      definition.questions[index - 1]?.id,
                  );
                }}
                move={(offset) => {
                  edit((next) => {
                    const list = next.definition.questions;
                    [list[index], list[index + offset]] = [
                      list[index + offset]!,
                      list[index]!,
                    ];
                  });
                  focusQuestion(question.id);
                }}
              />
            ))}
            <section className={ui.details}>
              <h3>Questions</h3>
              {!definition.questions.length && (
                <p>
                  No questions added. Choose a supported section type to start.
                </p>
              )}
              <SurveyChoice
                label="Section type to add"
                value={type}
                options={NEWSLETTER_SURVEY_SECTION_TYPES}
                change={(value) =>
                  setType(value as NewsletterSurveySectionType)
                }
              />
              <ActionButton
                ref={add}
                className={ui.button}
                disabled={definition.questions.length >= 30}
                onClick={() =>
                  edit((next) => {
                    next.definition = appendSurveyQuestion(
                      next,
                      type,
                    ).definition;
                  })
                }
              >
                Add section
              </ActionButton>
              {definition.questions.length >= 30 && <p>Maximum 30 sections.</p>}
            </section>
          </>
        ) : (
          <>
            <section className={ui.details}>
              <h3>Messages</h3>
              <SurveyText
                label="Submit button label"
                value={definition.submitLabel}
                max={100}
                change={(submitLabel) =>
                  edit((next) => {
                    next.definition.submitLabel = submitLabel;
                  })
                }
              />
              {(
                [
                  ["confirmation", "Confirmation message"],
                  ["closedMessage", "Closed survey message"],
                  ["requiredMessage", "Required question message"],
                ] as const
              ).map(([key, label]) => (
                <SurveyText
                  key={key}
                  label={label}
                  value={definition[key]}
                  max={2000}
                  multiline
                  change={(value) =>
                    edit((next) => {
                      next.definition[key] = value;
                    })
                  }
                />
              ))}
              <p>
                Closed survey message is stored text only. It does not close or
                open a survey.
              </p>
            </section>
            <section className={ui.details}>
              <h3>Appearance</h3>
              <SurveyText
                label="Logo URL"
                value={definition.logoUrl}
                max={2000}
                change={(logoUrl) =>
                  edit((next) => {
                    next.definition.logoUrl = logoUrl;
                  })
                }
              />
              {(
                [
                  ["background", "Background"],
                  ["buttonColor", "Button color"],
                  ["buttonTextColor", "Button text color"],
                ] as const
              ).map(([key, label]) => (
                <SurveyText
                  key={key}
                  label={label}
                  value={definition[key]}
                  max={7}
                  change={(value) =>
                    edit((next) => {
                      next.definition[key] = value;
                    })
                  }
                />
              ))}
              <p>Use HTTP(S) for media URLs and six-digit hex colors.</p>
            </section>
          </>
        )}
      </fieldset>
    </>
  );
}
