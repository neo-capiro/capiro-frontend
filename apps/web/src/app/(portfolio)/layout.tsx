import type { ReactNode } from "react";
import "../../shared/portfolio/styles.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Portfolio · Capiro",
  description: "Capiro client Portfolio",
};
export default function PortfolioLayout({ children }: { children: ReactNode }) {
  return <div data-portfolio-root>{children}</div>;
}
