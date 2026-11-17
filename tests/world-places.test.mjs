import test from 'node:test';
import assert from 'node:assert/strict';
import {searchWorld,isAttraction,mergePlaces,placesInBounds,routeDurationMinutes,formatRouteDuration} from '../js/world-places.js';
const response=data=>({ok:true,json:async()=>data});
for(const query of ['big ben','биг бен лондон'])test('landmark search outranks same-named settlements: '+query,async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async url=>{
  const u=new URL(url);
  if(u.hostname==='geocoding-api.open-meteo.com')return response({results:[{id:1,name:'Биг-Бен',feature_code:'PPL',latitude:-33,longitude:150,country:'Australia'}]});
  if(u.hostname==='photon.komoot.io')return response({features:[{properties:{name:'Биг-Бен',osm_type:'N',osm_id:1,osm_value:'cafe'},geometry:{coordinates:[44,48]}}]});
  return response({query:{pages:{2:{pageid:2,index:0,title:'Красноярский Биг-Бен',coordinates:[{lat:56,lon:92,type:'landmark'}],extract:'Clock tower',pageprops:{wikibase_item:'Q999'}},1:{pageid:1,index:1,title:query==='big ben'?'Биг-Бен (Big Ben)':'Биг-Бен',coordinates:[{lat:51.5007,lon:-.1246,type:'landmark'}],extract:'Clock tower in London',pageprops:{wikibase_item:'Q41225'}}}}});
 };
 try{const result=await searchWorld(query,new AbortController().signal);assert.equal(result[0].id,'wd:Q41225');assert.equal(result.some(p=>p.category==='cafe'),false);}finally{globalThis.fetch=old;}
});
test('attractions exclude food businesses and preserve museums, shrines, parks',()=>{
 for(const category of ['cafe','restaurant','hotel','school'])assert.equal(isAttraction({name:'Example',category}),false);
 for(const category of ['museum','monument','park','place_of_worship'])assert.equal(isAttraction({name:'Example',category}),true);
 assert.equal(isAttraction({name:'Kura Sushi Namba'}),false);
 assert.equal(isAttraction({name:'Rules',wiki:{lang:'en'},geoType:'landmark',kind:'restaurant in London'}),false);
});
test('linked wiki and OSM results merge; separate same-named places stay separate',()=>{
 const merged=mergePlaces([{id:'wd:Q1',wikidata:'Q1',name:'A',lat:1,lng:1,desc:'Details'},{id:'osm:N:1',wikidata:'Q1',name:'A',lat:1,lng:1,img:'photo'},{id:'osm:N:2',name:'A',lat:3,lng:3}]);assert.equal(merged.length,2);assert.equal(merged[0].img,'photo');assert.equal(merged[0].desc,'Details');
});
test('viewport samples the area instead of returning only central restaurants',async()=>{
 const old=globalThis.fetch;const locations=new Set();
 globalThis.fetch=async url=>{const u=new URL(url);if(u.hostname==='photon.komoot.io'){assert.ok(!u.searchParams.getAll('osm_tag').includes('amenity:restaurant'));const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lon'));locations.add(lat+','+lng);return response({features:[{properties:{name:'Museum '+lat+lng,osm_type:'N',osm_id:locations.size,osm_value:'museum'},geometry:{coordinates:[lng,lat]}}]});}assert.equal(u.searchParams.get('generator'),'geosearch');return response({query:{pages:{}}});};
 try{const result=await placesInBounds({south:51.49,north:51.53,west:-.15,east:-.1,zoom:14},new AbortController().signal);assert.equal(locations.size,5);assert.equal(result.length,5);}finally{globalThis.fetch=old;}
});
test('route duration estimates walking time between consecutive points',()=>{
 assert.equal(formatRouteDuration(routeDurationMinutes([{lat:55.75,lng:37.61}])), '');
 const minutes=routeDurationMinutes([{lat:55.75,lng:37.61},{lat:55.76,lng:37.62}]);
 assert.ok(minutes>0);assert.match(formatRouteDuration(minutes),/мин|ч/);
 assert.equal(formatRouteDuration(45),'45 мин');assert.equal(formatRouteDuration(75),'1 ч 15 мин');
});

test('search shows Russian names only and asks Photon for a supported language',async()=>{
 const old=globalThis.fetch;let photonLang;
 globalThis.fetch=async url=>{
  const u=new URL(url);
  if(u.hostname==='photon.komoot.io'){photonLang=u.searchParams.get('lang');return response({features:[{properties:{name:'東京タワー',osm_type:'N',osm_id:5,osm_value:'attraction',countrycode:'JP',country:'Japan'},geometry:{coordinates:[139.7,35.6]}},{properties:{name:'Башня',osm_type:'N',osm_id:6,osm_value:'attraction',countrycode:'JP',country:'Japan',city:'Tokyo'},geometry:{coordinates:[139.7,35.6]}}]});}
  if(u.hostname==='geocoding-api.open-meteo.com')return response({results:[]});
  return response({query:{pages:{}}});
 };
 try{const result=await searchWorld('башня',new AbortController().signal);assert.equal(photonLang,'default');assert.deepEqual(result.map(p=>p.name),['Башня']);assert.equal(result[0].country,'Япония');assert.equal(result[0].city,'');}finally{globalThis.fetch=old;}
});
