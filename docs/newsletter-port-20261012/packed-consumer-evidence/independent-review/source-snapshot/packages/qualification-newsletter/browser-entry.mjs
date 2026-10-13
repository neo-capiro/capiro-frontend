import * as newsletter from "@capiro/shared/newsletter";
import * as renderer from "@capiro/shared/newsletter-render";
import corpus from "./fixtures/renderer-characterizations.cjs";
import { withFixedClock } from "./fixed-clock.mjs";

export function characterizePackedNewsletter() {
  return withFixedClock(() => corpus.characterize(newsletter, renderer));
}
