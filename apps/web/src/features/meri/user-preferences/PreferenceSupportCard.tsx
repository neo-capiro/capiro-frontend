import { SettingsCard } from "../screens/settings/SettingsCard";
import type { SettingsChrome } from "../screens/settings/settings-view";
import ui from "../ui/meri-ui.module.css";
import Link from "next/link";

export function PreferenceSupportCard({
  select,
  nav,
}: Pick<SettingsChrome, "select" | "nav">) {
  return (
    <SettingsCard
      title="Accessibility and other defaults"
      description="Supported behavior and current limits."
    >
      <p>
        The interface follows your device’s reduced-motion setting. Progress
        remains visible with minimal animation. Keyboard controls keep visible
        focus; Tab and Shift+Tab move between controls.
      </p>
      <p>
        Saved writing styles and automatic artifact templates are not supported
        yet. Specify these in your message when starting work.
      </p>
      {(
        [
          ["help", "Keyboard shortcuts"],
          ["skills", "Templates and skills"],
        ] as const
      ).map(([id, label]) => {
        const href = nav.find((item) => item.id === id)?.href;
        return select ? (
          <button
            key={id}
            type="button"
            className={ui.outline}
            onClick={() => select(id)}
          >
            {label}
          </button>
        ) : href ? (
          <Link key={id} className={ui.outline} href={href}>
            {label}
          </Link>
        ) : null;
      })}
    </SettingsCard>
  );
}
