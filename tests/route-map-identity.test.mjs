import test from 'node:test';
import assert from 'node:assert/strict';
import {placeWithDetails,samePlaceLocation} from '../js/place-identity.js';
import {dayRouteFeatures} from '../js/route-map-data.js';
import {libraryPlace} from '../js/place-library.js';
test('metadata cannot replace the card destination, name or coordinates',()=>{
 const p={id:'route-a',name:'Намба-Ясака',lat:34.6566,lng:135.5009,desc:'Авторский текст'};
 const result=placeWithDetails(p,{id:'other',name:'Другой храм',lat:51,lng:0,img:'photo',desc:'Чужой текст',hours:'9–18'});
 assert.equal(result.id,p.id);assert.equal(result.name,p.name);assert.equal(result.lat,p.lat);assert.equal(result.lng,p.lng);assert.equal(result.desc,p.desc);assert.equal(result.img,'photo');assert.equal(result.hours,'9–18');
});
test('distant matching Wikidata identifiers cannot redirect an itinerary card',()=>{
 const p={id:'local-tokyo',wikidata:'Q180788',name:'Место в Токио',lat:35.68,lng:139.76};
 assert.equal(samePlaceLocation(p,{lat:51.5,lng:-.13}),false);
 assert.equal(libraryPlace(p).name,p.name);assert.equal(libraryPlace(p).lat,p.lat);
});
test('all days retain their connections, without links between days or invalid points',()=>{
 const a={date:'2026-09-17',places:[{lat:1,lng:2},{lat:3,lng:4}]};
 const b={date:'2026-09-18',places:[{lat:5,lng:6},{lat:7,lng:8},{name:'no coordinates'}]};
 const routes=dayRouteFeatures([a,b,{date:'empty',places:[]}],a.date).features;
 assert.equal(routes.length,2);assert.notEqual(routes[0].properties.color,routes[1].properties.color);
 assert.equal(routes.at(-1).properties.date,a.date);assert.deepEqual(routes[0].geometry.coordinates,[[6,5],[8,7]]);
 assert.ok(routes.at(-1).properties.width>routes[0].properties.width);
 assert.equal(dayRouteFeatures([a,b],b.date).features.find(f=>f.properties.date===a.date).properties.color,routes.at(-1).properties.color);
});
test('compact and editor maps preserve the same day color',()=>{
 const days=Array.from({length:14},(_,colorIndex)=>({date:'day-'+colorIndex,colorIndex,places:[{lat:1,lng:2},{lat:3,lng:4}]}));
 const full=dayRouteFeatures(days,'day-9').features;
 const compact=dayRouteFeatures([days[9]],'day-9').features[0];
 assert.equal(compact.properties.color,full.find(f=>f.properties.date==='day-9').properties.color);
 assert.equal(new Set(full.map(f=>f.properties.color)).size,14);
});
