import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  ChevronsUpDown,
  CircleCheck,
  CircleHelp,
  Clock,
  CreditCard,
  Download,
  FileUp,
  Hourglass,
  ImageUp,
  Info,
  Landmark,
  LifeBuoy,
  Lock,
  MailCheck,
  MailPlus,
  MousePointerClick,
  Plug,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  ScrollText,
  Search,
  Send,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

// Named registry keeps the prototype's `<Icon name="..."/>` call sites
// verbatim while letting Vite tree-shake the rest of lucide.
const ICONS: Record<string, LucideIcon> = {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  ChevronsUpDown,
  CircleCheck,
  CircleHelp,
  Clock,
  CreditCard,
  Download,
  FileUp,
  Hourglass,
  ImageUp,
  Info,
  Landmark,
  LifeBuoy,
  Lock,
  MailCheck,
  MailPlus,
  MousePointerClick,
  Plug,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  ScrollText,
  Search,
  Send,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserCog,
  Users,
  X,
};

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.8,
  style,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      style={{ flexShrink: 0, ...style }}
    />
  );
}

export function Wordmark({
  dark = false,
  size = 15,
}: {
  dark?: boolean;
  size?: number;
}) {
  const ring = dark ? "#cfc9bd" : "#4F525A";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <span
        style={{
          width: size * 1.45,
          height: size * 1.45,
          borderRadius: "50%",
          border: `2px solid ${ring}`,
          position: "relative",
          display: "inline-block",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: size * 0.6,
            height: 1.6,
            background: ring,
            transformOrigin: "left",
            transform: "rotate(-38deg)",
          }}
        ></span>
      </span>
      <b
        style={{
          fontSize: size,
          color: dark ? "#fff" : "var(--ink-1)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        Capiro
      </b>
    </span>
  );
}

export function Spinner({
  size = 14,
  color = "var(--accent)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-block",
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
        animation: "ob-spin 0.7s linear infinite",
      }}
    ></span>
  );
}

export function MsGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export function GGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.1 3.7-8.6z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5l-3.9 3C3.2 21.3 7.3 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.1 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-4-3C.4 8.2 0 10 0 12s.4 3.8 1.2 5.4l3.9-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3 .8 3.7 1.4l2.7-2.6C16.4 1.3 14 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4 3c.9-2.8 3.6-4.9 6.8-4.9z"
      />
    </svg>
  );
}
