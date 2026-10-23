"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  ActionButton,
  Badge,
  Modal,
  Panel,
  Tabs,
} from "../../shared/module-ui";
import styles from "./styles";

export function SettingsCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.cardScope}>
      <Panel title={title} description={description} actions={action}>
        <div className={styles.cardContent}>{children}</div>
      </Panel>
    </div>
  );
}

export function SettingsButton({
  primary,
  danger,
  small,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
  danger?: boolean;
  small?: boolean;
}) {
  return (
    <ActionButton
      {...props}
      primary={primary}
      className={`${styles.button} ${small ? styles.small : ""} ${className ?? ""}`}
      data-primary={primary}
      data-danger={danger}
    />
  );
}

export function SettingsTabs({
  items,
  value,
  onChange,
  label,
}: {
  items: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className={styles.pillTabs}>
      <Tabs items={items} value={value} onChange={onChange} label={label} />
    </div>
  );
}

export function SettingsNotice({
  title,
  children,
  error,
  retry,
}: {
  title: string;
  children?: ReactNode;
  error?: boolean;
  retry?: () => void;
}) {
  return (
    <div className={styles.notice} role={error ? "alert" : "status"}>
      <strong>{title}</strong>
      {children}
      {retry && (
        <div className={styles.row}>
          <SettingsButton small onClick={retry}>
            Retry
          </SettingsButton>
        </div>
      )}
    </div>
  );
}

export function SettingsDialog({
  title,
  description,
  open,
  onClose,
  children,
  footer,
  side,
  busy = false,
}: {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  side?: "center" | "right";
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      closeDisabled={busy}
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
      title={title}
      description={description}
      side={side}
      footer={
        footer ?? (
          <SettingsButton disabled={busy} onClick={onClose}>
            Close
          </SettingsButton>
        )
      }
    >
      <div className={styles.stack}>{children}</div>
    </Modal>
  );
}

export function SettingField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      {label}
      {children}
    </label>
  );
}

export function SettingsSwitch({
  checked,
  label,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      <img
        src={`/figma/modules/settings-team-imgSwitch${checked ? "On" : "Off"}.svg`}
        alt=""
        aria-hidden="true"
      />
    </button>
  );
}

export function SettingsBadge({
  children,
  tone = "neutral",
  assetName,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
  assetName?:
    | "settings-integrations-imgEllipse"
    | "settings-integrations-imgEllipse1";
}) {
  const asset =
    assetName ??
    (tone === "success"
      ? "settings-team-imgEllipse1"
      : tone === "warning"
        ? "settings-hq-imgEllipse1"
        : "settings-team-imgEllipse");
  return (
    <span className={styles.badgeScope} data-tone={tone}>
      <Badge tone={tone}>
        <img src={`/figma/modules/${asset}.svg`} alt="" aria-hidden="true" />
        {children}
      </Badge>
    </span>
  );
}

export function SettingsNewBadge() {
  return (
    <span className={`${styles.badgeScope} ${styles.newBadge}`}>
      <Badge>
        <img
          src="/figma/modules/settings-personal-imgEllipse.svg"
          alt=""
          aria-hidden="true"
        />
        New
      </Badge>
    </span>
  );
}

export function SettingFacts({
  items,
}: {
  items: readonly [string, ReactNode][];
}) {
  return (
    <dl className={styles.facts}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
