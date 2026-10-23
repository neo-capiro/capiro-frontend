import { LoaderCircleIcon } from "lucide-react";
import type { ComponentProps } from "react";
/** Presentation adapter for the upstream registry's shadcn spinner slot. */
export function Spinner(props: ComponentProps<typeof LoaderCircleIcon>) {
  return <LoaderCircleIcon role="status" aria-label="Loading" {...props} />;
}
