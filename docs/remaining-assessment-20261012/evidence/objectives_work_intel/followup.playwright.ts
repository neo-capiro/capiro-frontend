import config from './review.playwright';
export default {...config,testMatch:'followup.spec.ts',outputDir:'./artifacts-followup',reporter:[['list'],['json',{outputFile:'./results-followup.json'}]]};
