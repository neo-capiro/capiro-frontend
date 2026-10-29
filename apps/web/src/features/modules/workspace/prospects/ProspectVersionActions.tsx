import type { ComponentProps } from "react";
import { ProspectPublication } from "./ProspectPublication";
import { ProspectGeneration } from "./ProspectGeneration";
export function ProspectVersionActions(
  props: ComponentProps<typeof ProspectGeneration>,
) {
  return (
    <>
      <ProspectGeneration {...props} />
      <ProspectPublication {...props} />
    </>
  );
}
