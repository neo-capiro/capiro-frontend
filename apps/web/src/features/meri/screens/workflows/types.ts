/** A navigation control on a tooling screen; without a destination it renders disabled. */
export type ActionSpec = {
  label: string;
  variant: "primary" | "outline" | "ghost";
  href?: string | undefined;
  /** Designed as blocked (e.g. a source hold or revoked grant), shown dimmed. */
  blocked?: boolean;
};

/** Label/value line in a tooling record (payload, metadata, rails, timeline). */
export type MetadataRow = { label: string; value: string };
