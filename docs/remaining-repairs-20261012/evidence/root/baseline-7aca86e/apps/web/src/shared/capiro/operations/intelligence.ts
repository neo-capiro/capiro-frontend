import { intelligenceDefenseOperations } from "./intelligence-defense";
import { intelligenceExplorerOperations } from "./intelligence-explorer";
import { intelligenceFundingOperations } from "./intelligence-funding";
export const intelligenceOperations = {
  ...intelligenceExplorerOperations,
  ...intelligenceFundingOperations,
  ...intelligenceDefenseOperations,
} as const;
