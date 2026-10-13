"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";

export function HearingWorkDialog({
  hearingId,
  mode,
  onClose,
}: {
  hearingId: string;
  mode: string | null;
  onClose: () => void;
}) {
  const route = useLegiWatchRoute(),
    router = useRouter(),
    clients = useCapiroQuery("clients.list", {}, { enabled: Boolean(mode) });
  const [clientId, setClientId] = useState(route.clientId),
    [focus, setFocus] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const generate = useCapiroMutation("legiwatch.brief.generate"),
    prefill = useCapiroMutation("legiwatch.brief.prefill"),
    saveBrief = useCapiroMutation("legiwatch.brief.saveToClient"),
    saveItem = useCapiroMutation("legiwatch.saveItem");
  const outreachPrefill = useCapiroMutation("legiwatch.outreach.prefill"),
    createOutreach = useCapiroMutation("engagement.outreach.create");
  const createDraft = useCapiroMutation("workspace.draft.create"),
    updateDraft = useCapiroMutation("workspace.draft.update"),
    addContext = useCapiroMutation("workspace.context.add");
  const [title, setTitle] = useState(""),
    [sections, setSections] = useState<
      Array<{ name: string; content: string }>
    >([]);
  const busy =
    generate.pending ||
    saveBrief.pending ||
    saveItem.pending ||
    prefill.pending ||
    createDraft.pending ||
    updateDraft.pending ||
    addContext.pending ||
    outreachPrefill.pending ||
    createOutreach.pending;
  const client = clients.data?.find((item) => item.id === clientId);
  const run = async () => {
    setError("");
    setSuccess("");
    try {
      if (mode === "save") {
        await saveItem.run({
          params: { id: hearingId },
          body: { kind: "hearing", clientId, note: note || undefined },
        });
        setSuccess(
          `Hearing saved to ${client?.name || "the selected client"}.`,
        );
      } else if (mode === "outreach") {
        const packet = await outreachPrefill.run({
          params: { id: hearingId },
          body: { clientId },
        });
        const hearing = packet.context.hearing;
        const title = `Hearing follow-up — ${hearing.title}`;
        const body = [
          `Hearing: ${hearing.title}`,
          `Committee: ${hearing.committeeName ?? hearing.chamber}`,
          `Official calendar date: ${hearing.calendarDate}`,
          hearing.officialPageUrl
            ? `Official source: ${hearing.officialPageUrl}`
            : "",
          "",
          note,
        ]
          .filter(Boolean)
          .join("\n");
        const draft = await createOutreach.run({
          body: {
            type: "follow_up",
            title,
            subject: title,
            body,
            clientId,
            direction: "on-behalf",
          },
        });
        router.push(
          `/modules/engagement?draft=${encodeURIComponent(draft.id)}`,
        );
      } else if (mode === "preparation") {
        const packet = await prefill.run({
          params: { id: hearingId },
          body: { clientId: clientId || undefined },
        });
        const draft =
          createDraft.data ?? (await createDraft.run({ body: packet.draft }));
        await updateDraft.run({
          params: { id: draft.id },
          body: {
            config: {
              sections: ["Hearing context", "Questions", "Client priorities"],
              sectionContent: {
                "Hearing context": `${packet.context.hearing.title}\n${packet.context.hearing.committeeName ?? ""}\nOfficial date: ${packet.context.hearing.calendarDate}`,
                Questions: "",
                "Client priorities": focus,
              },
            },
          },
        });
        await addContext.run({
          params: { draftId: draft.id },
          body: {
            kind: "free-text",
            payload: {
              text: JSON.stringify(packet.context, null, 2),
              sourceType: "internal",
              source: "legiwatch-hearing-preparation",
              hearingId,
            },
          },
        });
        router.push(`/modules/workspace?draft=${encodeURIComponent(draft.id)}`);
      } else {
        const brief = await generate.run({
          params: { id: hearingId },
          body: { clientId: clientId || undefined, focus: focus || undefined },
        });
        setTitle(brief.title);
        setSections(brief.sections);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "This action could not be completed.",
      );
    }
  };
  const saveReviewed = async () => {
    setError("");
    try {
      if (!generate.data || !clientId) return;
      const result = await saveBrief.run({
        params: { id: hearingId },
        body: {
          title,
          mode: generate.data.mode,
          sections,
          sources: generate.data.sources,
          clientId,
          clientName: client?.name,
        },
      });
      setSuccess(
        `Saved ${result.fileName} to ${client?.name || "the selected client"}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The reviewed brief could not be saved.",
      );
    }
  };
  const heading =
    mode === "preparation"
      ? "Create hearing preparation"
      : mode === "save"
        ? "Save hearing to client"
        : mode === "outreach"
          ? "Stage outreach draft"
          : sections.length
            ? "Review client brief"
            : "Create client brief";
  return (
    <Modal
      open={Boolean(mode)}
      onOpenChange={(open) => !open && onClose()}
      title={heading}
      description={
        mode === "outreach"
          ? "Prepare a reviewable Engagement draft. Nothing is sent automatically."
          : "Retain the official source references when saving this work."
      }
      footer={
        <>
          <ActionButton onClick={onClose}>Close</ActionButton>
          {sections.length ? (
            <ActionButton
              primary
              disabled={busy || !clientId}
              onClick={saveReviewed}
            >
              {saveBrief.pending ? "Saving…" : "Save reviewed brief to client"}
            </ActionButton>
          ) : (
            <ActionButton
              primary
              disabled={
                busy || ((mode === "save" || mode === "outreach") && !clientId)
              }
              onClick={run}
            >
              {busy
                ? "Working…"
                : mode === "preparation"
                  ? "Create Workspace draft"
                  : mode === "save"
                    ? "Save hearing"
                    : mode === "outreach"
                      ? "Stage draft"
                      : "Generate draft"}
            </ActionButton>
          )}
        </>
      }
    >
      <div className={styles.form}>
        <SelectField
          id="hearing-work-client"
          label="Client"
          value={clientId}
          onChange={setClientId}
        >
          <option value="">Choose a client</option>
          {clients.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
        {mode === "save" || mode === "outreach" ? (
          <Field label="Note" htmlFor="hearing-work-note">
            <TextArea
              id="hearing-work-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
            />
          </Field>
        ) : !sections.length ? (
          <Field label="Client focus" htmlFor="hearing-work-focus">
            <TextArea
              id="hearing-work-focus"
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              maxLength={600}
            />
          </Field>
        ) : (
          <>
            <Field label="Brief title" htmlFor="brief-title">
              <TextInput
                id="brief-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={300}
              />
            </Field>
            {generate.data?.lowConfidence && (
              <p className={styles.gap}>
                The draft contains low confidence findings. Review the cited
                evidence before saving.
              </p>
            )}
            {sections.map((section, index) => (
              <Field
                key={`${section.name}-${index}`}
                label={section.name}
                htmlFor={`brief-section-${index}`}
              >
                <TextArea
                  id={`brief-section-${index}`}
                  rows={6}
                  value={section.content}
                  onChange={(event) =>
                    setSections((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, content: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
            ))}
          </>
        )}
        {generate.pending && (
          <p role="status" className={styles.banner}>
            Preparing source-grounded sections. This can take several minutes;
            keep this dialog open.
          </p>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {success && (
          <p role="status" className={styles.success}>
            {success}
          </p>
        )}
        {clients.error && (
          <p className={styles.error}>{clients.error.message}</p>
        )}
      </div>
    </Modal>
  );
}
