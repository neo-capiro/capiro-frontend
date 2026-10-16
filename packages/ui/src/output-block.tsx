import type { ComponentProps } from "react";

import { cn } from "./lib/utils";

export type OutputBlockProps = Omit<ComponentProps<"pre">, "children"> & {
  text: string;
};

/**
 * Project-authored plain-text block. The adopted Tool element renders tool
 * parameters and results through it instead of the upstream shiki-backed
 * CodeBlock, which is not an installed dependency. No highlighting, copy
 * control or language selection is provided; the text is escaped by React.
 */
export const OutputBlock = ({ text, className, ...props }: OutputBlockProps) => (
  <pre
    className={cn(
      "overflow-x-auto whitespace-pre-wrap break-words p-4 font-mono text-xs",
      className
    )}
    data-slot="tool-output-block"
    {...props}
  >
    {text}
  </pre>
);
