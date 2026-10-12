import { Suspense } from "react";
import { ApplicationBoundary } from "../shared/session/ApplicationBoundary";
import { readCapiroConfig } from "../shared/capiro/config";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/newsreader/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Capiro",
  description: "Government affairs workspace",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Suspense fallback={<p role="status">Loading workspace…</p>}>
          <ApplicationBoundary
            publishableKey={readCapiroConfig(process.env).publishableKey}
          >
            {children}
          </ApplicationBoundary>
        </Suspense>
      </body>
    </html>
  );
}
