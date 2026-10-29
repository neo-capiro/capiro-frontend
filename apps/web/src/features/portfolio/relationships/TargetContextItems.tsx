import type { TargetContextPage } from "@/shared/capiro/operations/target-context";
import {
  askTypes,
  objectiveStatusLabels,
} from "@/shared/capiro/operations/objective-fields";
import { currentStrategyHref } from "@/shared/capiro/strategy-navigation";

export function TargetContextResults({
  page,
  pageNumber,
}: {
  page: TargetContextPage;
  pageNumber: number;
}) {
  return (
    <>
      {page.items.length ? (
        <TargetContextItems page={page} />
      ) : (
        <p className="muted">
          {pageNumber > 1
            ? "No more current items on this page."
            : `No current ${page.section === "objectives" ? "Objective links" : "Strategy steps"} for this target.`}
        </p>
      )}
      <small>
        Page {pageNumber} · {page.items.length} items
        {page.nextCursor ? " · More available" : " · End of current results"}
      </small>
    </>
  );
}

function TargetContextItems({ page }: { page: TargetContextPage }) {
  if (page.section === "objectives")
    return (
      <ul className="stack">
        {page.items.map((item) => (
          <li className="card stack" key={item.id}>
            <a
              href={`/portfolio/${page.clientId}/objectives?${new URLSearchParams({ operational: item.id })}`}
            >
              {item.outcome || "Untitled Objective"}
            </a>
            <span>
              {objectiveStatusLabels[item.status]} · Version {item.version}
            </span>
            <p>
              Ask: {item.askType ? askTypes[item.askType] : "Not specified"}
            </p>
            <p>Minimum win: {item.minimumWin || "Not specified"}</p>
          </li>
        ))}
      </ul>
    );
  return (
    <ul className="stack">
      {page.items.map((item) => (
        <li className="card stack" key={item.id}>
          <strong>{item.strategyTitle || "Untitled Strategy"}</strong>
          <a
            href={currentStrategyHref(page.clientId, item.strategyId, item.id)}
          >
            {item.title || "Untitled step"}
          </a>
          <span>
            {item.kind.replaceAll("_", " ")} ·{" "}
            {item.subject.replaceAll("_", " ")} ·{" "}
            {item.status.replaceAll("_", " ")}
          </span>
          <p>
            <time dateTime={item.startsOn}>{item.startsOn}</time>
            {item.openEnded ? (
              " · Ongoing"
            ) : item.endsOn ? (
              <>
                {" "}
                – <time dateTime={item.endsOn}>{item.endsOn}</time>
              </>
            ) : (
              " · Point event"
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
