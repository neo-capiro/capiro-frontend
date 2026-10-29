"use client";
import type { UserPreferences } from "@capiro/meri-client/user-preferences";
import {
  MANDATORY_NOTIFICATION_CLASSES,
  NOTIFICATION_CATEGORIES,
  optionalNoticePresented,
  type NotificationPreferenceKey,
} from "../../../shared/meri-notifications/projection";
import { ToggleChip } from "../screens/settings/SettingsControls";
import styles from "./notifications.module.css";

/**
 * Revisioned controls for the categories that map to a real, observed producer.
 * Only a saved canonical preference changes anything; a category with no proven
 * optional producer, or no canonical key, is shown as unavailable with its reason.
 */
export function NotificationCategoryControls({
  preferences,
  editable,
  unavailable,
  onChange,
}: {
  preferences: UserPreferences;
  editable: boolean;
  unavailable: string;
  onChange: (key: NotificationPreferenceKey, value: boolean) => void;
}) {
  return (
    <section aria-label="Notification categories" className={styles.controls}>
      {NOTIFICATION_CATEGORIES.map((category) => {
        const key = category.key;
        const revisioned = category.control === "revisioned" && key !== null;
        const pressed = key !== null && preferences.notifications[key] === true;
        const disabled = !editable || !revisioned;
        return (
          <div
            key={category.id}
            className={styles.control}
            data-category={category.id}
            data-control={category.control}
          >
            <div className={styles.controlHead}>
              <ToggleChip
                label={category.label}
                pressed={revisioned && pressed}
                disabled={disabled}
                unavailable={editable ? category.reason : unavailable}
                onChange={(next) => {
                  if (key) onChange(key, next);
                }}
              />
            </div>
            <p className={styles.meta}>{category.description}</p>
            {!revisioned ? (
              <p className={styles.meta} role="note">
                {category.reason}
              </p>
            ) : (
              <p className={styles.meta}>
                {optionalNoticePresented(category.id, preferences)
                  ? "Optional notices of this category are presented in the updates list."
                  : "Optional notices of this category are withheld from the updates list."}
              </p>
            )}
          </div>
        );
      })}
      <p className={styles.meta} role="note">
        {`Always delivered regardless of these switches: ${MANDATORY_NOTIFICATION_CLASSES.join(", ")}. `}
        Pending approvals, security notices and workspace broadcasts are not
        suppressed by personal notification preferences.
      </p>
    </section>
  );
}
