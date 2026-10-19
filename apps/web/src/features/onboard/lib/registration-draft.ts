// ── Registration form carry-over (survives the /register → /verify hop) ────

/**
 * v1 draft key.
 *
 * v0 (`capiro-funnel-registration`) stored an OPTIONAL email, and the matcher
 * treated a draft without one as matching WHOEVER was signed in. On a shared
 * browser that silently made the wrong account the purchaser. v0 drafts are
 * therefore PURGED on read, never migrated — an identity-less draft is exactly
 * the artefact the fix exists to eliminate.
 */
const REGISTRATION_STORAGE_KEY = "capiro-funnel-registration.v1";
const LEGACY_REGISTRATION_STORAGE_KEYS = [
  "capiro-funnel-registration",
] as const;
const REGISTRATION_DRAFT_VERSION = 1;

/**
 * Drafts older than this are discarded on read (shared-browser hygiene).
 *
 * 24h rather than a tighter window because the draft carries orgName, which
 * Clerk never stores: it must survive a closed browser so a signed-in user
 * whose register POST failed can still complete registration on return. The
 * fail-closed identity check in draftMatchesUser is the actual hijack
 * defence; this expiry is defence in depth.
 */
export const REGISTRATION_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export interface RegistrationDraft {
  firstName: string;
  lastName: string;
  orgName: string;
  /**
   * The email the registrant TYPED. REQUIRED in v1: identity gating is
   * fail-CLOSED, so a draft without it can never be eligible for
   * auto-registration. Auto-registration paths must refuse to run when the
   * signed-in session belongs to a different email — otherwise a shared
   * browser session silently makes the WRONG account the purchaser (e.g. a
   * staff session hijacking a test persona's sign-up).
   */
  email: string;
}

interface StoredRegistrationDraft extends RegistrationDraft {
  v: number;
  savedAt: number;
}

/**
 * True only when the draft demonstrably belongs to this signed-in user.
 *
 * FAILS CLOSED. Both "the draft has no email" and "the session has no email
 * yet" now return false; previously both returned true, which is what let a
 * legacy draft match any signed-in user. Callers must therefore wait for
 * Clerk's `user` to hydrate before consulting this — an un-hydrated session
 * legitimately has no email and would otherwise be treated as a mismatch.
 */
export function draftMatchesUser(
  draft: RegistrationDraft | null,
  sessionEmail: string | null | undefined,
): boolean {
  const draftEmail = draft?.email?.trim().toLowerCase();
  const sessionEmailNormalized = sessionEmail?.trim().toLowerCase();
  if (!draftEmail || !sessionEmailNormalized) return false;
  return draftEmail === sessionEmailNormalized;
}

/** Remove every registration draft, v1 and legacy, from both storages. */
export function clearRegistrationDraft(): void {
  for (const key of [
    REGISTRATION_STORAGE_KEY,
    ...LEGACY_REGISTRATION_STORAGE_KEYS,
  ]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
}

// localStorage (not sessionStorage): the draft carries orgName, which Clerk
// never stores — it must survive a closed browser so a signed-in user whose
// register POST failed can still complete registration on return.
export function storeRegistrationDraft(draft: RegistrationDraft): void {
  const stored: StoredRegistrationDraft = {
    ...draft,
    v: REGISTRATION_DRAFT_VERSION,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* storage unavailable — the verify page falls back to Clerk profile data */
  }
}

export function readRegistrationDraft(): RegistrationDraft | null {
  // Any legacy (v0) draft is unconditionally discarded, whether or not a v1
  // draft exists: it has no trustworthy identity attached.
  purgeLegacyRegistrationDrafts();

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(REGISTRATION_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    clearRegistrationDraft();
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    clearRegistrationDraft();
    return null;
  }
  const parsed = value as Partial<StoredRegistrationDraft>;
  if (
    [parsed.firstName, parsed.lastName, parsed.orgName].some(
      (field) => field != null && typeof field !== "string",
    )
  ) {
    clearRegistrationDraft();
    return null;
  }

  const expired =
    typeof parsed.savedAt !== "number" ||
    Date.now() - parsed.savedAt > REGISTRATION_DRAFT_TTL_MS;
  const wrongVersion = parsed.v !== REGISTRATION_DRAFT_VERSION;
  const missingIdentity =
    typeof parsed.email !== "string" || parsed.email.trim() === "";
  if (expired || wrongVersion || missingIdentity) {
    clearRegistrationDraft();
    return null;
  }

  return {
    firstName: parsed.firstName ?? "",
    lastName: parsed.lastName ?? "",
    orgName: parsed.orgName ?? "",
    email: parsed.email as string,
  };
}

function purgeLegacyRegistrationDrafts(): void {
  for (const key of LEGACY_REGISTRATION_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
}
