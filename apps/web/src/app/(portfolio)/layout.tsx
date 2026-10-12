import type { ReactNode } from "react";
import { readConfig } from "@/shared/portfolio/config/config";
import { AuthenticationProvider } from "@/shared/portfolio/auth/AuthenticationProvider";
import "../../shared/portfolio/styles.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Portfolio · Capiro",
  description: "Capiro client Portfolio",
};
export default function PortfolioLayout({ children }: { children: ReactNode }) {
  const config = readConfig(process.env);
  return (
    <div data-portfolio-root>
      {config.authConfigured && config.publishableKey ? (
        <AuthenticationProvider publishableKey={config.publishableKey}>
          {children}
        </AuthenticationProvider>
      ) : (
        children
      )}
    </div>
  );
}
