import { Suspense } from "react";
import { connection } from "next/server";
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // One deployment image resolves the shared session configuration per request,
  // including direct entry to Meri pages that otherwise qualify for prerendering.
  await connection();
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
