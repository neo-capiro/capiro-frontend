/** Local draft suggestions only: no skill ID, authority or executable request. */
export const suggestions = Object.freeze([
  Object.freeze({
    id: "research",
    title: "Research",
    description: "Explore a question",
    draft: "Help me research a question about ",
  }),
  Object.freeze({
    id: "brief",
    title: "Create a brief",
    description: "Turn evidence into a document",
    draft: "Help me create a brief about ",
  }),
  Object.freeze({
    id: "analyze",
    title: "Analyze a file",
    description: "Find signals in your data",
    draft: "Help me analyze a file. ",
  }),
  Object.freeze({
    id: "spreadsheet",
    title: "Build a spreadsheet",
    draft: "Help me plan a spreadsheet for ",
  }),
  Object.freeze({
    id: "presentation",
    title: "Create a presentation",
    draft: "Help me plan a presentation about ",
  }),
  Object.freeze({
    id: "template",
    title: "Use a template",
    draft: "Help me choose a template for ",
  }),
]);

export function selectSuggestion(id) {
  const suggestion = suggestions.find((item) => item.id === id);
  if (!suggestion) throw new Error("Unknown local suggestion");
  return suggestion.draft;
}
