/**
 * Lifetime of the identity token forwarded to Meri when it issues an action session. Meri bounds the session by
 * this token's expiry (and by its own 300 s session cap), and Core re-verifies the token and the live Clerk
 * session on every recheck. The browser's cookie token often has only seconds left, which made sessions expire
 * mid-send, so the server requests a fresh token for the signed-in user's own session instead.
 */
export const MERI_IDENTITY_TOKEN_SECONDS = 300;

type Mint = (sessionId: string) => Promise<{ jwt: string } | null | undefined>;

const defaultMint: Mint = async (sessionId) => {
  const { clerkClient } = await import("@clerk/nextjs/server");
  return (await clerkClient()).sessions.getToken(
    sessionId,
    undefined,
    MERI_IDENTITY_TOKEN_SECONDS,
  );
};

/** Fresh session token for Meri; falls back to the request's own token so a Clerk API failure never widens access. */
export async function meriIdentityToken(
  sessionId: string | null | undefined,
  fallback: () => Promise<string | null>,
  mint: Mint = defaultMint,
): Promise<string | null> {
  if (!sessionId) return fallback();
  try {
    const token = await mint(sessionId);
    if (
      typeof token?.jwt === "string" &&
      /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token.jwt)
    )
      return token.jwt;
  } catch {
    // Fall through to the request token below.
  }
  return fallback();
}
