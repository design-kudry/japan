import test from 'node:test';
import assert from 'node:assert/strict';
import {hasCyrillic,russianOnly,placeDescription,russianCountry} from '../js/russian.js';

test('only Cyrillic text is shown as a place description',()=>{
 assert.equal(hasCyrillic('Tokyo Tower'),false);
 assert.equal(russianOnly('A clock tower'),'');
 assert.equal(placeDescription({desc:'Clock tower in London',category:'attraction',address:'Westminster, UK'}),'Достопримечательность');
 assert.equal(placeDescription({desc:'Башня с часами',category:'attraction'}),'Башня с часами');
 assert.equal(placeDescription({category:'museum',address:'Лондон, Великобритания'}),'Музей · Лондон, Великобритания');
});
test('country codes are shown in Russian',()=>{assert.equal(russianCountry('JP','Japan'),'Япония');assert.equal(russianCountry('','Япония'),'Япония');assert.equal(russianCountry('','Japan'),'');});
