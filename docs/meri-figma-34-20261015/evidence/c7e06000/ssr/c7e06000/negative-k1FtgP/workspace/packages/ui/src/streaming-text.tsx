import type { ComponentProps } from "react";

import { cn } from "./lib/utils";

export type StreamingTextProps = Omit<ComponentProps<"span">, "children"> & {
  children: string;
};

/**
 * Project-authored streaming-text marker. The adopted Plan element renders a
 * streaming title/description through it instead of the upstream Shimmer,
 * whose `motion` dependency is not installed. It carries only a data slot so
 * the application stylesheet owns any animation.
 */
export const StreamingText = ({
  children,
  className,
  ...props
}: StreamingTextProps) => (
  <span
    className={cn("inline-block", className)}
    data-slot="streaming-text"
    data-streaming="true"
    {...props}
  >
    {children}
  </span>
);
