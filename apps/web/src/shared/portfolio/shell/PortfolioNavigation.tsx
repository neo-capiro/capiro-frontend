"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./shell.module.css";
import { clientViews } from "./client-views";

const asset = (index: number, active: boolean) => {
  const icon = index === 0 || index === 3 ? (active ? 0 : 3) : index;
  const variant = icon === 7 && !active ? "-muted" : "";
  return `/design/portfolio-34/nav-${icon}${variant}.svg`;
};

export function PortfolioNavigation({
  client,
  onNavigate,
  readOnlyPreview = false,
}: {
  client?: { id: string; name: string };
  onNavigate: () => void;
  readOnlyPreview?: boolean;
}) {
  const path = usePathname();
  const type = useSearchParams().get("type");
  const portfolioIndex = path === "/" || path === "/portfolio";
  const globalItems = readOnlyPreview
    ? [
        {
          label: "Clients",
          href: "/portfolio",
          icon: 1,
          active: true,
        },
      ]
    : [
        {
          label: "Overview",
          href: "/portfolio",
          icon: 0,
          active: portfolioIndex && !type,
        },
        {
          label: "Clients",
          href: "/portfolio?type=CLIENT",
          icon: 1,
          active: portfolioIndex && type === "CLIENT",
        },
        {
          label: "Prospects",
          href: "/portfolio?type=PROSPECT",
          icon: 2,
          active: portfolioIndex && type === "PROSPECT",
        },
      ];
  return (
    <>
      <p className="eyebrow">Portfolio</p>
      <nav aria-label="Portfolio" onClick={onNavigate}>
        {globalItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-label={`Portfolio ${item.label}`}
            title={item.label}
            aria-current={item.active ? "page" : undefined}
          >
            <img src={asset(item.icon, item.active)} alt="" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      {client && (
        <>
          <hr className="divider" />
          <p className={`eyebrow ${styles.clientName}`} title={client.name}>
            {client.name}
          </p>
          <nav aria-label="Client" onClick={onNavigate}>
            {clientViews.map(({ label, suffix, icon }) => (
              <Link
                key={suffix}
                href={`/portfolio/${client.id}${suffix}`}
                title={label}
                aria-label={label}
                aria-current={
                  path === `/portfolio/${client.id}${suffix}`
                    ? "page"
                    : undefined
                }
              >
                <img
                  src={asset(icon, path === `/portfolio/${client.id}${suffix}`)}
                  alt=""
                />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </>
      )}
    </>
  );
}
