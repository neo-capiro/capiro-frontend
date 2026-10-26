"use client";
import { useId, useMemo, useState } from "react";
import {
  defaultNewsletterBrandKit,
  newsletterId,
} from "@capiro/shared/newsletter";
import { ActionButton, Field, Tabs, TextInput } from "@/shared/module-ui";
import type { RichDocumentController } from "../document-controller";
import { RichPreview } from "../RichPreview";
import type { BrandKitState } from "./use-brand-kit";
import { applyBrand, fontIsSelected } from "./brand-draft";
import { BrandText, BrandFont } from "./BrandFields";
import { LogoSettings, ButtonSettings } from "./BrandSettings";
import { BrandLogoPicker } from "./BrandLogoPicker";
import ui from "../library/sections.module.css";
import styles from "./brand.module.css";

export function BrandWorkspace({
  kit,
  owner,
}: {
  kit: BrandKitState;
  owner: RichDocumentController;
}) {
  const fontFileId = useId();
  const [tab, setTab] = useState("logos"),
    [picking, setPicking] = useState(false),
    [file, setFile] = useState<File>();
  const draft = owner.getSnapshot().draft;
  const preview = useMemo(
    () => (kit.draft ? applyBrand(draft, kit.draft) : draft),
    [draft, kit.draft],
  );
  return (
    <>
      <BrandLogoPicker
        open={kit.open && picking}
        close={() => setPicking(false)}
        choose={(asset) =>
          kit.edit((next) => {
            if (
              next.logos.length < 20 &&
              !next.logos.some((logo) => logo.assetId === asset.id)
            )
              next.logos.push({
                assetId: asset.id,
                name: asset.name,
                url: asset.url,
                link: "",
                alt: "",
              });
          })
        }
      />
      {kit.open && (
        <section className={styles.workspace} aria-label="Brand Kit">
          <header className={styles.header}>
            <div>
              <h2>Brand Kit</h2>
              <p>
                Reusable newsletter defaults. Changes stay local until Save
                Brand Kit; existing newsletters are not rewritten.
              </p>
            </div>
            <ActionButton
              className={ui.button}
              disabled={kit.pending}
              onClick={kit.close}
            >
              Cancel and return to editor
            </ActionButton>
          </header>
          {kit.loading && <p role="status">Loading Brand Kit…</p>}
          {kit.error && (
            <p role="alert">
              Brand Kit is unavailable. A deliberate reload checks current
              access.
            </p>
          )}
          {kit.unknown && (
            <p className={ui.notice} role="status">
              {kit.unknown === "font" ? "Font upload" : "Brand Kit save"} was
              not confirmed. It may have completed. This view will not repeat
              it; a saved-kit read cannot confirm this request.
            </p>
          )}
          {kit.notice && (
            <p className={ui.notice} role="status">
              {kit.notice}
            </p>
          )}
          <div className={ui.actions}>
            <ActionButton
              className={ui.button}
              disabled={kit.pending}
              onClick={kit.reload}
            >
              {kit.unknown
                ? "Read current saved kit"
                : "Reload saved kit and discard local edits"}
            </ActionButton>
            <ActionButton
              className={ui.button}
              primary
              disabled={!kit.draft || kit.pending || !!kit.unknown}
              onClick={() => void kit.save()}
            >
              Save Brand Kit
            </ActionButton>
            <ActionButton
              className={ui.button}
              disabled={
                !kit.current ||
                kit.pending ||
                !!kit.unknown ||
                !!owner.getSnapshot().pending ||
                owner.getSnapshot().recovery.phase !== "ready"
              }
              onClick={() => {
                if (kit.current)
                  owner.edit((current) => applyBrand(current, kit.current!));
              }}
            >
              Apply saved kit to local draft
            </ActionButton>
          </div>
          {kit.current && (
            <p className={styles.help}>
              Current received kit: revision {kit.current.revision}. Apply
              changes this local draft once and supports Undo; it does not save
              the newsletter. Uploaded assets remain if local kit changes are
              cancelled.
            </p>
          )}
          {kit.draft && (
            <>
              <Tabs
                label="Brand Kit sections"
                items={[
                  { id: "logos", label: "Logos" },
                  { id: "colors", label: "Colors" },
                  { id: "fonts", label: "Fonts" },
                  { id: "buttons", label: "Buttons" },
                ]}
                value={tab}
                onChange={setTab}
              />
              <div className={styles.layout}>
                <div>
                  <p className={styles.help}>
                    Local preview of these Brand Kit edits; not a saved or
                    applied result. Uploaded fonts use a local fallback here;
                    this preview does not load external font files.
                  </p>
                  <RichPreview
                    draft={preview}
                    mobile={false}
                    plainText={false}
                  />
                </div>
                <fieldset
                  className={styles.controls}
                  disabled={kit.pending || !!kit.unknown}
                >
                  {tab === "logos" && (
                    <div className={ui.details} data-design-node="1176:292365">
                      <h3>Logos</h3>
                      {kit.draft.logos.map((logo) => (
                        <article className={styles.record} key={logo.assetId}>
                          <strong>{logo.name || "Unnamed logo"}</strong>
                          {kit.draft!.primaryLogoId === logo.assetId && (
                            <span className={styles.badge}>Primary</span>
                          )}
                          <p>{logo.alt || "No alt text"}</p>
                          <div className={ui.actions}>
                            <LogoSettings logo={logo} kit={kit} />
                            <ActionButton
                              className={ui.button}
                              onClick={() =>
                                kit.edit((next) => {
                                  next.logos = next.logos.filter(
                                    (item) => item.assetId !== logo.assetId,
                                  );
                                  if (next.primaryLogoId === logo.assetId)
                                    next.primaryLogoId = null;
                                })
                              }
                            >
                              Remove logo from kit
                            </ActionButton>
                          </div>
                        </article>
                      ))}
                      <ActionButton
                        className={ui.button}
                        primary
                        disabled={kit.draft.logos.length >= 20}
                        onClick={() => setPicking(true)}
                      >
                        Add logo
                      </ActionButton>
                    </div>
                  )}
                  {tab === "colors" && (
                    <div
                      className={styles.stack}
                      data-design-node="1176:292644"
                    >
                      {(["primary", "secondary"] as const).map((group) => (
                        <section className={ui.details} key={group}>
                          <h3>
                            {group === "primary" ? "Primary" : "Secondary"}{" "}
                            colors
                          </h3>
                          <div className={styles.swatches}>
                            {kit.draft!.colors[group].map((color, index) => (
                              <div key={index}>
                                <span
                                  className={styles.swatch}
                                  style={{
                                    background: /^#[a-f\d]{6}$/i.test(color)
                                      ? color
                                      : "transparent",
                                  }}
                                />
                                <code>{color}</code>
                              </div>
                            ))}
                          </div>
                          {kit.draft!.colors[group].map((color, index) => (
                            <div className={styles.color} key={index}>
                              <BrandText
                                label={`${group} color ${index + 1}`}
                                value={color}
                                max={7}
                                change={(value) =>
                                  kit.edit((next) => {
                                    next.colors[group][index] = value;
                                  })
                                }
                              />
                              <ActionButton
                                className={ui.button}
                                onClick={() =>
                                  kit.edit((next) => {
                                    next.colors[group].splice(index, 1);
                                  })
                                }
                              >
                                Remove
                              </ActionButton>
                            </div>
                          ))}
                          <ActionButton
                            className={ui.button}
                            disabled={kit.draft!.colors[group].length >= 20}
                            onClick={() =>
                              kit.edit((next) => {
                                next.colors[group].push("#ffffff");
                              })
                            }
                          >
                            Add {group} color
                          </ActionButton>
                        </section>
                      ))}
                    </div>
                  )}
                  {tab === "fonts" && (
                    <div
                      className={styles.stack}
                      data-design-node="1176:292904"
                    >
                      <section className={ui.details}>
                        <h3>Font choices</h3>
                        <BrandFont
                          label="Heading font"
                          kit={kit.draft}
                          value={kit.draft.fonts.heading}
                          change={(value) =>
                            kit.edit((next) => {
                              next.fonts.heading = value;
                            })
                          }
                        />
                        <BrandFont
                          label="Body font"
                          kit={kit.draft}
                          value={kit.draft.fonts.body}
                          change={(value) =>
                            kit.edit((next) => {
                              next.fonts.body = value;
                            })
                          }
                        />
                        <p className={styles.help}>
                          Font preview: Your weekly policy briefing.
                        </p>
                      </section>
                      <section className={ui.details}>
                        <h3>Uploaded custom fonts</h3>
                        <Field label="Upload a font" htmlFor={fontFileId}>
                          <TextInput
                            id={fontFileId}
                            type="file"
                            accept=".ttf,.otf,.woff,.woff2"
                            onChange={(event) =>
                              setFile(event.target.files?.[0])
                            }
                          />
                        </Field>
                        <p className={styles.help}>
                          One TTF, OTF, WOFF or WOFF2, up to 2 MiB. The server
                          validates its bytes. Upload does not save Brand Kit.
                        </p>
                        <ActionButton
                          className={ui.button}
                          primary
                          disabled={
                            !file || kit.draft.fonts.uploaded.length >= 20
                          }
                          onClick={() => void kit.upload(file)}
                        >
                          Upload font asset
                        </ActionButton>
                        {kit.draft.fonts.uploaded.map((font) => (
                          <article className={styles.record} key={font.assetId}>
                            <span className={styles.badge}>Uploaded</span>
                            <strong>{font.name || "Unnamed font"}</strong>
                            <span>{font.format}</span>
                            <ActionButton
                              className={ui.button}
                              disabled={fontIsSelected(kit.draft!, font.family)}
                              onClick={() =>
                                kit.edit((next) => {
                                  next.fonts.uploaded =
                                    next.fonts.uploaded.filter(
                                      (item) => item.assetId !== font.assetId,
                                    );
                                })
                              }
                            >
                              Remove font from kit
                            </ActionButton>
                            {fontIsSelected(kit.draft!, font.family) && (
                              <p>
                                Choose a different heading, body or button font
                                before removing this reference.
                              </p>
                            )}
                          </article>
                        ))}
                      </section>
                    </div>
                  )}
                  {tab === "buttons" && (
                    <div className={ui.details} data-design-node="1176:293153">
                      <h3>Buttons</h3>
                      {kit.draft.buttons.map((button) => (
                        <article className={styles.record} key={button.id}>
                          <strong>{button.name || "Unnamed button"}</strong>
                          {kit.draft!.primaryButtonId === button.id && (
                            <span className={styles.badge}>Primary</span>
                          )}
                          <p>
                            {button.shape} · {button.variant}
                          </p>
                          <div className={ui.actions}>
                            <ButtonSettings button={button} kit={kit} />
                            <ActionButton
                              className={ui.button}
                              onClick={() =>
                                kit.edit((next) => {
                                  next.buttons = next.buttons.filter(
                                    (item) => item.id !== button.id,
                                  );
                                  if (next.primaryButtonId === button.id)
                                    next.primaryButtonId = null;
                                })
                              }
                            >
                              Remove button from kit
                            </ActionButton>
                          </div>
                        </article>
                      ))}
                      <ActionButton
                        className={ui.button}
                        disabled={kit.draft.buttons.length >= 20}
                        onClick={() =>
                          kit.edit((next) => {
                            next.buttons.push({
                              ...defaultNewsletterBrandKit().buttons[0]!,
                              id: newsletterId(),
                              name: "New button",
                            });
                          })
                        }
                      >
                        Add button
                      </ActionButton>
                    </div>
                  )}
                </fieldset>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
