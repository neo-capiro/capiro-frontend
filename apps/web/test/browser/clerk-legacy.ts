import { useAuth } from "./clerk";
// No account creation/verification provider behavior is simulated by these tests.
export function useSignUp() {
  return {
    isLoaded: useAuth().isLoaded,
    signUp: undefined,
    setActive: undefined,
  };
}
