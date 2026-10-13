import * as newsletter from "@capiro/shared/newsletter";
import * as renderer from "@capiro/shared/newsletter-render";
import corpus from "./fixtures/renderer-characterizations.cjs";
import receivingCorpus from "./fixtures/newsletter-receiving-corpus.cjs";
import { withFixedClock } from "./fixed-clock.mjs";
import {
  originalNewsletterExports,
  publicNewsletterNames,
} from "./public-namespace.mjs";

export function characterizePackedNewsletter() {
  return withFixedClock(() =>
    corpus.characterize(originalNewsletterExports(newsletter), renderer),
  );
}

export function packedNewsletterNames() {
  return publicNewsletterNames(newsletter);
}

export function qualifyPackedReceiving() {
  return withFixedClock(() =>
    receivingCorpus.runNewsletterReceivingCorpus(newsletter),
  );
}
