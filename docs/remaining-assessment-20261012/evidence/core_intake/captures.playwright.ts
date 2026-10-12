import config from './review.playwright';
export default {...config,testMatch:'captures.spec.ts',outputDir:'./capture-artifacts',reporter:[['list'],['json',{outputFile:'./capture-results.json'}]]};
