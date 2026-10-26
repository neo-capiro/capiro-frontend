"use client";
import { StateMessage } from "../../ui/StateMessage";
import ui from "../../ui/meri-ui.module.css";
export const savedTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    timeZone: "UTC",
    timeZoneName: "short",
  });

function sourceFailure(code: string, title: string) {
  if (code === "SOURCE_REFERENCE_STALE")
    return {
      title: "The saved page has changed",
      detail:
        "The current source no longer matches this saved page. Its text and link are not shown.",
      retry: false,
    };
  if (
    code === "SOURCE_REFERENCE_NOT_FOUND" ||
    code === "NOT_FOUND" ||
    code === "CONVERSATION_NOT_FOUND"
  )
    return {
      title: "Saved source is unavailable",
      detail: "This saved source reference cannot be opened.",
      retry: false,
    };
  if (
    [
      "ACCESS_DENIED",
      "MEMBERSHIP_REVOKED",
      "UNAUTHENTICATED",
      "MEMBERSHIP_CHANGED",
    ].includes(code)
  )
    return {
      title: "Source access is unavailable",
      detail: "You cannot open this source with your current access.",
      retry: false,
    };
  return {
    title: `${title} is unavailable`,
    detail:
      "This saved page could not be checked. This does not mean that the source is absent.",
    retry: true,
  };
}

export function SourceReadState({
  loading,
  error,
  reload,
  title,
  page,
}: {
  loading: boolean;
  error: string | undefined;
  reload: () => void;
  title: string;
  page: string;
}) {
  if (loading)
    return (
      <StateMessage title="Checking source access" status="Loading" announce>
        <p>
          Checking access to this saved {page} page. Source text is not shown
          until the check completes.
        </p>
      </StateMessage>
    );
  const failure = sourceFailure(error ?? "UNAVAILABLE", title);
  return (
    <StateMessage
      title={failure.title}
      status="Unavailable"
      tone="danger"
      announce
      action={
        failure.retry ? (
          <button type="button" className={ui.outline} onClick={reload}>
            Try again
          </button>
        ) : undefined
      }
    >
      <p>{failure.detail}</p>
    </StateMessage>
  );
}
