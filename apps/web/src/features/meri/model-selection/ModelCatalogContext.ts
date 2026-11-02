"use client";
import { createContext, useContext } from "react";
import type { ModelCatalog } from "./model-selection";

/**
 * The admitted catalog the session already reads for the model picker. A finished turn names its
 * model from it; nothing below the provider fetches a catalog of its own.
 */
export const ModelCatalogContext = createContext<ModelCatalog | undefined>(
  undefined,
);
export const useModelCatalogContext = () => useContext(ModelCatalogContext);
