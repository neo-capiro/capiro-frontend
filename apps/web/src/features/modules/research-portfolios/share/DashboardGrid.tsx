import type { CSSProperties } from "react";
import type {
  ResearchDashboardLayout,
  ResearchDashboardWidget,
  ResearchShareDashboard,
} from "../../../../shared/capiro/operations/research-share-schemas";
import { normalizePhoneOrder, widgetsForPhone } from "./dashboard-layout";
import { WidgetContent } from "./DashboardWidgets";
import styles from "./share.module.css";

/** Grid placement as CSS variables; the stylesheet reflows to one column on phones using the phone order. */
export function cellStyle(
  widget: ResearchDashboardWidget,
  order: number,
): CSSProperties {
  return {
    "--x": widget.x + 1,
    "--y": widget.y + 1,
    "--w": widget.w,
    "--h": widget.h,
    "--order": order,
  } as CSSProperties;
}

/** Read-only rendering of a layout against a frozen dashboard payload. */
export function DashboardGrid({
  layout,
  dashboard,
  logoUrl,
}: {
  layout: ResearchDashboardLayout;
  dashboard: ResearchShareDashboard;
  /** Signed firm logo address for a branded link; absent in previews and unbranded links. */
  logoUrl?: string | null;
}) {
  const order = normalizePhoneOrder(layout).phoneOrder;
  return (
    <div className={styles.dashboardViewport}>
      <div className={styles.recipientGrid}>
        {widgetsForPhone(layout).map((widget) => (
          <section
            key={widget.id}
            className={styles.cell}
            style={cellStyle(widget, order.indexOf(widget.id))}
          >
            <WidgetContent
              widget={widget}
              dashboard={dashboard}
              logoUrl={logoUrl}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
