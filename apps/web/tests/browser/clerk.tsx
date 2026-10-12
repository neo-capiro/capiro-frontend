// Reuse the existing synthetic session owner for actual-boundary fixture controls.
export {
  useAuth,
  ClerkProvider,
  ClerkLoaded,
  ClerkLoading,
  ClerkFailed,
  SignIn,
} from "../../test/browser/clerk";

// Preserve the Portfolio fixture avatar. Native authentication is a separate gate.
export function UserButton() {
  return (
    <button
      aria-label="Test account"
      className="monogram"
      style={{ width: 32, height: 32, borderRadius: "50%" }}
    >
      T
    </button>
  );
}
