import test from 'node:test';
import assert from 'node:assert/strict';
import {enrichPlaces} from '../js/place-enrichment.js';
const response=data=>({ok:true,json:async()=>data});

test('same-named places get media only through their own exact OSM link',async()=>{
 const previous=globalThis.fetch;let result;
 globalThis.fetch=async url=>{
  const u=new URL(url);
  if(u.hostname==='www.openstreetmap.org')return response({elements:[{type:'node',id:101,tags:{amenity:'cafe',wikipedia:'en:First Cafe'}},{type:'node',id:102,tags:{amenity:'cafe'}}]});
  if(u.hostname==='en.wikipedia.org'){assert.equal(u.searchParams.get('titles'),'First Cafe');assert.equal(u.searchParams.get('pilicense'),'free');return response({query:{pages:{1:{extract:'A documented cafe.',fullurl:'https://en.wikipedia.org/wiki/First_Cafe',pageimage:'First.jpg',thumbnail:{source:'https://upload.wikimedia.org/first.jpg'}}}}});}
  if(u.hostname==='commons.wikimedia.org')return response({query:{pages:{1:{imageinfo:[{thumburl:'https://upload.wikimedia.org/first.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:First.jpg',extmetadata:{Artist:{value:'<a>Photographer</a>'},LicenseShortName:{value:'CC BY-SA 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'}}}]}}}});
  throw Error('Unexpected endpoint');
 };
 try{await enrichPlaces([{id:'osm:N:101',name:'Cafe'},{id:'osm:N:102',name:'Cafe'}],new AbortController().signal,x=>{result=x;});assert.equal(result['osm:N:101'].img,'https://upload.wikimedia.org/first.jpg');assert.equal(result['osm:N:101'].imageCredit,'Photographer');assert.equal(result['osm:N:102'].img,undefined);assert.equal(result['osm:N:102'].category,'cafe');}finally{globalThis.fetch=previous;}
});

test('a failed external article leaves usable OSM details and no invented image',async()=>{
 const previous=globalThis.fetch;let result;
 globalThis.fetch=async url=>new URL(url).hostname==='www.openstreetmap.org'?response({elements:[{type:'way',id:201,tags:{tourism:'museum',wikipedia:'en:Museum',opening_hours:'10:00-18:00'}}]}):{ok:false};
 try{await enrichPlaces([{id:'osm:W:201',name:'Museum'}],new AbortController().signal,x=>{result=x;});assert.equal(result['osm:W:201'].hours,'10:00-18:00');assert.equal(result['osm:W:201'].img,undefined);}finally{globalThis.fetch=previous;}
});

test('closing the map cancels in-flight metadata and prevents late updates',async()=>{
 const previous=globalThis.fetch,controller=new AbortController();let updates=0,started;
 const waiting=new Promise(resolve=>{started=resolve;});
 globalThis.fetch=async(url,{signal})=>new Promise((resolve,reject)=>{started();signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});});
 try{const task=enrichPlaces([{id:'osm:N:301',name:'Closed map'}],controller.signal,()=>updates++);await waiting;const before=updates;controller.abort();await task;assert.equal(updates,before);}finally{globalThis.fetch=previous;}
});

test('English-only sources never become a visible description; Russian labels and articles are preferred',async()=>{
 const previous=globalThis.fetch;let result;const hosts=[];
 globalThis.fetch=async url=>{
  const u=new URL(url);hosts.push(u.hostname);
  if(u.hostname==='www.wikidata.org')return response({entities:{Q1:{labels:{ru:{value:'Токийская башня'},en:{value:'Tokyo Tower'}},descriptions:{en:{value:'tower in Tokyo'}},sitelinks:{ruwiki:{title:'Токийская башня'}}}}});
  if(u.hostname==='ru.wikipedia.org')return response({query:{pages:{1:{extract:'Телебашня в Токио.',fullurl:'https://ru.wikipedia.org/wiki/x'}}}});
  throw Error('Unexpected endpoint '+u.hostname);
 };
 try{await enrichPlaces([{id:'wd:Q1',wikidata:'Q1',name:'Tokyo Tower',desc:'',wiki:{lang:'en',title:'Tokyo Tower'}}],new AbortController().signal,x=>{result=x;});
  assert.equal(result['wd:Q1'].name,'Токийская башня');assert.equal(result['wd:Q1'].desc,'Телебашня в Токио.');assert.ok(!hosts.includes('en.wikipedia.org'));}finally{globalThis.fetch=previous;}
});
