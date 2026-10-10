export interface LocalSuggestion { readonly id: string; readonly title: string; readonly description?: string; readonly draft: string; }
export const suggestions: readonly LocalSuggestion[];
export function selectSuggestion(id: string): string;
