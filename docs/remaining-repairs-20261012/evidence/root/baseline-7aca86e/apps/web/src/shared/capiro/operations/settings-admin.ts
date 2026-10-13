import { analystOperations } from "./settings-admin/analyst";
import { broadcastOperations } from "./settings-admin/broadcasts";
import { hqOperations } from "./settings-admin/hq";
import { mappingOperations } from "./settings-admin/mappings";
import { profileOperations } from "./settings-admin/profiles";

export const settingsAdminOperations = {
  ...hqOperations,
  ...profileOperations,
  ...broadcastOperations,
  ...analystOperations,
  ...mappingOperations,
} as const;
