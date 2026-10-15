import type { ReactNode } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";

/** Figma 3.4 12.xx tooling page: heading with a contextual Back route, then the screen sections. */
export function ToolingPage({
  title,
  description,
  backHref,
  unavailable,
  children,
}: {
  title: string;
  description: string;
  backHref?: string | undefined;
  unavailable: string;
  children: ReactNode;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title={title}
        description={description}
        action={
          <LinkAction variant="ghost" href={backHref} unavailable={unavailable}>
            Back
          </LinkAction>
        }
      />
      {children}
    </div>
  );
}
