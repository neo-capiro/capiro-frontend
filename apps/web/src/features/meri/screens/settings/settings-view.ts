/** One page of the Settings area navigation; the host marks the page being shown. */
export type SettingsNavItem = {
  id: string;
  label: string;
  /** Route of the page (fixture routes); hosts that switch pages locally pass `select` instead. */
  href?: string | undefined;
  current: boolean;
};

/** Area-wide chrome every Settings page shares, set by its host (fixture route or Capiro Settings). */
export type SettingsChrome = {
  nav: readonly SettingsNavItem[];
  /** Switches pages locally (tabs) instead of navigating between routes. */
  select?: ((id: string) => void) | undefined;
  /** Hosted inside the Capiro Settings frame, which supplies the page title. */
  embedded?: boolean | undefined;
  notice: SettingsNotice;
  unavailable: string;
  /** Fields and drafts edit locally (fixture); otherwise every preference control is disabled. */
  localDrafts: boolean;
  /** The fixture header provides the Updates panel and Account menu overlays. */
  headerOverlays: boolean;
};

/** An already-recorded outcome shown as a toast (fixture state only; the action itself stays disabled). */
export type SettingsOutcome = { title: string; detail: string };

/** Page heading copy. */
export type SettingsHeading = { title: string; description: string };

/** Toned guidance or state callout inside a Settings page. */
export type SettingsNotice = {
  title: string;
  detail: string;
  tone?: "neutral" | "warning" | "danger";
};

/** A labelled preference value (Meri/Field); the placeholder explains an empty value. */
export type SettingsField = {
  id: string;
  label: string;
  value: string;
  placeholder?: string | undefined;
};

/** A page link; without an href it renders as an explained disabled control. */
export type SettingsLink = { label: string; href?: string | undefined };
