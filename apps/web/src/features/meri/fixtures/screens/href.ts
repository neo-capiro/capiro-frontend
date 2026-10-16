/** Route of a synthetic fixture screen; never a live destination. */
export const fixtureHref = (slug: string) => `/meri/fixture/${slug}`;

/** Disabled-control explanation shared by every disconnected fixture screen. */
export const fixtureUnavailable =
  "Disconnected synthetic fixture: this action is not executed.";
