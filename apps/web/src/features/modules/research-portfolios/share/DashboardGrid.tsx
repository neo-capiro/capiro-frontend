import type { CSSProperties } from "react";
import type {
  ResearchDashboardLayout,
  ResearchDashboardWidget,
  ResearchShareDashboard,
} from "../../../../shared/capiro/operations/research-share-schemas";
import { normalizePhoneOrder } from "./dashboard-layout";
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
}: {
  layout: ResearchDashboardLayout;
  dashboard: ResearchShareDashboard;
}) {
  const order = normalizePhoneOrder(layout).phoneOrder;
  return (
    <div className={styles.grid}>
      {layout.widgets.map((widget) => (
        <section
          key={widget.id}
          className={styles.cell}
          style={cellStyle(widget, order.indexOf(widget.id))}
        >
          <WidgetContent widget={widget} dashboard={dashboard} />
        </section>
      ))}
    </div>
  );
}
