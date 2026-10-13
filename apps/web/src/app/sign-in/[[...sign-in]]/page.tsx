import { SignIn } from "@clerk/nextjs";
import { readCapiroConfig } from "../../../shared/capiro/config";

export default function SignInPage() {
  const config = readCapiroConfig(process.env);
  return (
    <main
      style={{
        padding: "48px 24px",
        display: "grid",
        justifyContent: "center",
      }}
    >
      {config.authConfigured && config.publishableKey ? (
        <SignIn routing="path" path="/sign-in" fallbackRedirectUrl="/" />
      ) : (
        <section>
          <h1>Sign-in setup required</h1>
          <p>
            Your administrator must connect the designated Capiro sign-in
            application.
          </p>
        </section>
      )}
    </main>
  );
}
