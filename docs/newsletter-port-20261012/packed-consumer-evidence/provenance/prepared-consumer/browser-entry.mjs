import * as news from '@capiro/shared/newsletter';
import * as render from '@capiro/shared/newsletter-render';
import corpus from './renderer-characterizations.cjs';
export const results=corpus.characterize(news,render);
