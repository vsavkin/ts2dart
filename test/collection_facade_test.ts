/// <reference path="../typings/mocha/mocha.d.ts"/>
import {expectTranslate, expectErroneousCode} from './test_support';

describe('collection façade', () => {
  it.only('translates array operations to dartisms', () => {
    expectTranslate('var x: Array<number> = []; x.push(1);')
        .to.equal(' List < num > x = [ ] ; x . add ( 1 ) ; ');
  });
  it('translates map operations to dartisms', () => {
    expectTranslate('var x: Map<string, string> = new Map(); x.set("k", "v");')
        .to.equal(' Map < string , string > x = { } ; x [ "k" ] = "v" ; ');
    expectTranslate('var x: Map<string, string> = new Map(); x.get("k");')
        .to.equal(' Map < string , string > x = { } ; x [ "k" ] ; ');
  });
});
