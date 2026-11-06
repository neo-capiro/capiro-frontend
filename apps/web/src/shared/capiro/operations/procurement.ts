import { procurementOperations as summaryOperations } from "./procurement-money-flow";
import { procurementActionDetailsOperations } from "./procurement-action-details";
import { procurementAccountOperations } from "./procurement-account-reports";
import { procurementObservedOperations } from "./procurement-observed";

export const procurementOperations = {
  ...summaryOperations,
  ...procurementActionDetailsOperations,
  ...procurementAccountOperations,
  ...procurementObservedOperations,
} as const;
