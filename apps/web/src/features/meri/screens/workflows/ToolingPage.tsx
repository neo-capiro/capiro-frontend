import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import styles from "./screens.module.css";

/**
 * Figma 3.4 12.xx tooling page: heading with a contextual Back route, then the
 * screen sections. On phones the text Back gives way to the Figma
 * "Meri/Mobile icon action · Back" 44px icon target above the heading.
 */
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
    <div className={`${ui.page} ${styles.toolingPage}`}>
      <div className={styles.mobileBack}>
        <LinkAction variant="ghost" href={backHref} unavailable={unavailable}>
          <ArrowLeft aria-hidden />
          <span className="sr-only">Back</span>
        </LinkAction>
      </div>
      <MeriPageHeading
        title={title}
        description={description}
        action={
          <span className={styles.desktopBack}>
            <LinkAction
              variant="ghost"
              href={backHref}
              unavailable={unavailable}
            >
              Back
            </LinkAction>
          </span>
        }
      />
      {children}
    </div>
  );
}
