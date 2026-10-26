import { useState } from "react";
import type {
  NewsletterBrandButton,
  NewsletterBrandLogo,
} from "@capiro/shared/newsletter";
import { ActionButton, Field, Modal, SelectInput } from "@/shared/module-ui";
import type { BrandKitState } from "./use-brand-kit";
import { BrandFlag, BrandFont, BrandText } from "./BrandFields";
import styles from "../library/sections.module.css";

export function LogoSettings({
  logo,
  kit,
}: {
  logo: NewsletterBrandLogo;
  kit: BrandKitState;
}) {
  const [open, setOpen] = useState(false),
    [local, setLocal] = useState(logo),
    [primary, setPrimary] = useState(false);
  return (
    <>
      <ActionButton
        className={styles.button}
        onClick={() => {
          setLocal(structuredClone(logo));
          setPrimary(kit.draft!.primaryLogoId === logo.assetId);
          setOpen(true);
        }}
        aria-label={`Settings for logo ${logo.name}`}
      >
        Settings
      </ActionButton>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Logo settings"
        description="These changes stay local until you save Brand Kit."
        className={styles.dialog}
        footer={
          <div className={styles.actions}>
            <ActionButton
              className={styles.button}
              onClick={() => setOpen(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              className={styles.button}
              primary
              disabled={kit.pending || !!kit.unknown}
              onClick={() => {
                kit.edit((next) => {
                  next.logos = next.logos.map((item) =>
                    item.assetId === logo.assetId ? local : item,
                  );
                  if (primary) next.primaryLogoId = logo.assetId;
                  else if (next.primaryLogoId === logo.assetId)
                    next.primaryLogoId = null;
                });
                setOpen(false);
              }}
            >
              Done
            </ActionButton>
          </div>
        }
      >
        <div className={styles.details} data-design-node="1176:292393">
          <BrandFlag
            label="Primary Brand Kit logo"
            checked={primary}
            change={setPrimary}
          />
          <BrandText
            label="Logo name"
            value={local.name}
            change={(name) => setLocal({ ...local, name })}
          />
          <BrandText
            label="Logo link"
            value={local.link}
            max={2000}
            change={(link) => setLocal({ ...local, link })}
          />
          <BrandText
            label="Alt text"
            value={local.alt}
            max={1000}
            change={(alt) => setLocal({ ...local, alt })}
          />
        </div>
      </Modal>
    </>
  );
}
export function ButtonSettings({
  button,
  kit,
}: {
  button: NewsletterBrandButton;
  kit: BrandKitState;
}) {
  const [open, setOpen] = useState(false),
    [local, setLocal] = useState(button),
    [primary, setPrimary] = useState(false);
  return (
    <>
      <ActionButton
        className={styles.button}
        onClick={() => {
          setLocal(structuredClone(button));
          setPrimary(kit.draft!.primaryButtonId === button.id);
          setOpen(true);
        }}
        aria-label={`Settings for button ${button.name}`}
      >
        Settings
      </ActionButton>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Button settings"
        description="These changes stay local until you save Brand Kit."
        className={styles.dialog}
        footer={
          <div className={styles.actions}>
            <ActionButton
              className={styles.button}
              onClick={() => setOpen(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              className={styles.button}
              primary
              disabled={kit.pending || !!kit.unknown}
              onClick={() => {
                kit.edit((next) => {
                  next.buttons = next.buttons.map((item) =>
                    item.id === button.id ? local : item,
                  );
                  if (primary) next.primaryButtonId = button.id;
                  else if (next.primaryButtonId === button.id)
                    next.primaryButtonId = null;
                });
                setOpen(false);
              }}
            >
              Done
            </ActionButton>
          </div>
        }
      >
        <div className={styles.details} data-design-node="1176:293180">
          <BrandFlag
            label="Primary Brand Kit button"
            checked={primary}
            change={setPrimary}
          />
          <BrandText
            label="Button name"
            value={local.name}
            change={(name) => setLocal({ ...local, name })}
          />
          <Field label="Shape" htmlFor={`shape-${button.id}`}>
            <SelectInput
              id={`shape-${button.id}`}
              value={local.shape}
              options={[
                { value: "square", label: "Square" },
                { value: "rounded", label: "Rounded" },
                { value: "pill", label: "Pill" },
              ]}
              onValueChange={(shape) => {
                if (
                  shape === "square" ||
                  shape === "rounded" ||
                  shape === "pill"
                )
                  setLocal({ ...local, shape });
              }}
            />
          </Field>
          <Field label="Style" htmlFor={`variant-${button.id}`}>
            <SelectInput
              id={`variant-${button.id}`}
              value={local.variant}
              options={[
                { value: "filled", label: "Filled" },
                { value: "outlined", label: "Outlined" },
              ]}
              onValueChange={(variant) => {
                if (variant === "filled" || variant === "outlined")
                  setLocal({ ...local, variant });
              }}
            />
          </Field>
          <BrandText
            label="Background"
            value={local.background}
            max={7}
            change={(background) => setLocal({ ...local, background })}
          />
          <BrandText
            label="Text color"
            value={local.color}
            max={7}
            change={(color) => setLocal({ ...local, color })}
          />
          <BrandFont
            label="Font"
            value={local.fontFamily}
            kit={kit.draft!}
            change={(fontFamily) => setLocal({ ...local, fontFamily })}
          />
        </div>
      </Modal>
    </>
  );
}
