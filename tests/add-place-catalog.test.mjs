import {isDiscoveryPlace} from '../js/world-places.js';
import {countryMatches} from '../js/country-places.js';
import {japanCatalog,japanExcluded} from '../js/japan-catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {cityKey,countryOptions,ticketFilter,cityAttraction} from '../js/add-place-data.js';
import {destinationArticle,listingMeta} from '../js/voyage-meta.js';
test('country aliases share a city key without merging different countries',()=>{
 assert.equal(cityKey({name:'Лондон',country:'Британия'}),cityKey({name:'Лондон',country:'Великобритания'}));
 assert.notEqual(cityKey({name:'Лондон',country:'Канада'}),cityKey({name:'Лондон',country:'Великобритания'}));
 assert.equal(new Set(countryOptions.map(c=>c.value)).size,countryOptions.length);
});
test('cost filter never interprets missing data as free admission',()=>{
 assert.equal(ticketFilter({},'free'),false);
 assert.equal(ticketFilter({price:'Бесплатно — основная экспозиция'},'free'),true);
 assert.equal(ticketFilter({price:'£55'},'paid'),true);
 assert.equal(ticketFilter({price:'Бесплатно'},'paid'),false);
});
test('travel-topic board prices are excluded from admission sources',()=>{
 assert.equal(destinationArticle({categories:[{title:'Category:Usable travel topics'}]}),false);
 assert.equal(destinationArticle({categories:[{title:'Category:Guide district articles'}]}),true);
 assert.equal(destinationArticle({categories:[{title:'Category:Usable city articles'}]}),true);
 assert.deepEqual(listingMeta('{{see|wikidata=Q1|price=£55}}{{see|wikidata=Q2|price=£240}}','Q1'),{price:'£55'});
});

test('city sections contain attractions rather than administrative city cards',()=>{
 const city={name:'Нара'};
 assert.equal(cityAttraction({name:'Нара',geoType:'landmark'},city),false);
 assert.equal(cityAttraction({name:'Nara',geoType:'city'},city),false);
 assert.equal(cityAttraction({name:'Парк Нара'},city),true);
 assert.equal(cityAttraction({name:'Nara'},city,{claims:{P31:[{mainsnak:{datavalue:{value:{id:'Q515'}}}}]}}),false);
});

test('restored Japan places keep original metadata and exclude shopping stops',()=>{
 assert.equal(new Set(japanCatalog.map(p=>p.id)).size,japanCatalog.length);
 assert.ok(japanCatalog.every(p=>!japanExcluded.includes(p.nameEn)&&p.desc));
 assert.equal(japanCatalog.find(p=>p.nameEn==='Osaka Castle').price,'¥1 200');
 assert.equal(japanCatalog.find(p=>p.nameEn==='Namba Yasaka Shrine').hours,'24/7');
});

test('country matching works outside the original destination shortlist',()=>{
 assert.equal(countryMatches('Chile','Чили'),true);
 assert.equal(countryMatches('Greece','Греция'),true);
 assert.equal(countryMatches('Portugal','Португалия'),true);
 assert.equal(countryMatches('Чили','Греция'),false);
});

test('guide copy keeps compact text separate from full detail text',()=>{
 assert.ok(japanCatalog.every(p=>p.shortDesc&&p.desc&&p.shortDesc!==p.desc));
 assert.equal(japanCatalog.find(p=>p.nameEn==='Osaka Castle').recommended,true);
});

test('additional Japan destinations have stable identities and authored card copy',()=>{
 const added=japanCatalog.filter(p=>p.metadataOrigin?.startsWith('japan_more_destinations.md'));
 assert.ok(added.length>=30);
 assert.ok(added.every(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.shortDesc&&p.desc&&p.recommended));
 assert.equal(new Set(japanCatalog.map(p=>p.id)).size,japanCatalog.length);
 assert.ok(!added.some(p=>/Еда и рынки/.test(p.guideCategory)));
});

test('automatic discovery excludes unexplained local points without filtering user choices',()=>{
 assert.equal(isDiscoveryPlace({name:'The Fountain Boy',category:'artwork'}),false);
 assert.equal(isDiscoveryPlace({name:'星を探る',category:'artwork'}),false);
 assert.equal(isDiscoveryPlace(japanCatalog[0]),true);
 assert.equal(isDiscoveryPlace({name:'Museum',category:'museum',wikidata:'Q1',wiki:{title:'Museum'},img:'https://example.org/photo.jpg',desc:'A museum devoted to the history of the city and its collections of art and archaeology.'}),true);
});

test('country directory exposes cities across the country, without external geocoding',async()=>{
 const fs=await import('node:fs/promises');const original=globalThis.fetch;
 globalThis.fetch=async url=>{assert.match(String(url),/^\/places\/cities\/[A-Z]{2}\.json$/);return {ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../'+url.slice(1),import.meta.url),'utf8'))};};
 try{const {discoverCities}=await import('../js/add-place-data.js');const japan=await discoverCities('Япония',undefined,true),britain=await discoverCities('Великобритания',undefined,true);assert.ok(japan.length>1000);assert.ok(britain.length>700);assert.ok(britain.every(c=>c.country==='Великобритания'&&Number.isFinite(c.lat)&&Number.isFinite(c.lng)));assert.ok(britain.some(c=>c.name==='Йорк'));assert.ok(japan.some(c=>c.name==='Нара'));}finally{globalThis.fetch=original;}
});

test('all pending authored places have resolved coordinates and food is excluded',async()=>{
 const fs=await import('node:fs/promises');for(const file of ['japan-more-pending.json','japan-popular-pending.json'])assert.deepEqual(JSON.parse(await fs.readFile(new URL('../docs/'+file,import.meta.url))),[]);
 assert.equal(new Set(japanCatalog.map(p=>p.id)).size,japanCatalog.length);
 assert.ok(japanCatalog.length>=160);
 const garan=japanCatalog.find(p=>p.nameEn==='Danjo Garan'),temple=japanCatalog.find(p=>p.nameEn==='Kongobu-ji');assert.ok(garan);assert.notEqual(garan.id,temple?.id);assert.ok(Math.abs(garan.lng-135.57993)<.0001);
 assert.equal(isDiscoveryPlace({name:'Cafe',category:'cafe',metadataOrigin:'guide'}),false);
});

test('merging discovery preserves authored identity and accepts source aliases',async()=>{
 const {mergePlaces}=await import('../js/world-places.js');const authored={id:'original-route-id',wikidata:'Q1',name:'Храм',lat:35,lng:135,desc:'Авторское описание'};
 const result=mergePlaces([authored,{id:'wd:Q1',wikidata:'Q1',name:'Temple',lat:35,lng:135,img:'https://example.org/image.jpg'},{id:'osm:N:1',name:'Храм',lat:35.0001,lng:135.0001}]);
 assert.equal(result.length,1);assert.equal(result[0].id,'original-route-id');assert.equal(result[0].desc,'Авторское описание');assert.equal(result[0].img,'https://example.org/image.jpg');
});

test('London and York author guides are first-class curated destinations',async()=>{
 const {ukCatalog}=await import('../js/uk-catalog.js');const {curatedCatalog}=await import('../js/place-catalog.js');const {seedPlaces,discoverCities}=await import('../js/add-place-data.js');
 assert.equal(ukCatalog.filter(p=>p.city==='Лондон').length,92);assert.equal(ukCatalog.filter(p=>p.city==='Йорк').length,48);
 assert.equal(new Set(ukCatalog.map(p=>p.id)).size,ukCatalog.length);
 assert.ok(ukCatalog.every(p=>p.authorSupplied&&p.recommended&&p.desc&&p.shortDesc&&p.metaSource&&p.coordinateSource&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)));
 assert.equal(seedPlaces({name:'Йорк',country:'Великобритания'})[0].nameEn,'York Minster');assert.equal(seedPlaces({name:'Йорк',country:'США'}).length,0);
 assert.deepEqual((await discoverCities('Великобритания')).map(c=>c.name).sort(),['Йорк','Лондон','Эдинбург']);
 assert.equal(curatedCatalog.length,japanCatalog.length+228);
 assert.ok(!ukCatalog.some(p=>/Market/.test(p.nameEn)));
 const byName=name=>ukCatalog.find(p=>p.nameEn===name);assert.notEqual(byName('Bootham Bar').id,byName('York City Walls').id);assert.notEqual(byName('Ouse Bridge').id,byName('Lendal Bridge').id);assert.notEqual(byName('Lift 109').id,byName('Battersea Power Station').id);
 assert.ok(Math.abs(byName('V&A East Storehouse').lng+.02118)<.0001);
 const {placeDescription}=await import('../js/russian.js');assert.equal(placeDescription(ukCatalog[0]),ukCatalog[0].desc);
});

test('curated cards separate nearby destinations and include Edinburgh',async()=>{
 const {ukCatalog}=await import('../js/uk-catalog.js');const {curatedCatalog}=await import('../js/place-catalog.js');const {seedPlaces}=await import('../js/add-place-data.js');
 const ed=seedPlaces({name:'Эдинбург',country:'Великобритания'});assert.equal(ed.length,88);assert.equal(ed[0].nameEn,'Edinburgh Castle');assert.ok(ed.every(p=>p.shortDesc&&p.desc&&p.coordinateSource));
 assert.equal(new Set(curatedCatalog.map(p=>p.id)).size,curatedCatalog.length);
 for(const [a,b] of [['Big Ben','Palace of Westminster'],['Holland Park','Kyoto Garden'],['Soho','Chinatown, London']]){const x=ukCatalog.find(p=>p.nameEn===a),y=ukCatalog.find(p=>p.nameEn===b);assert.ok(x&&y);assert.notEqual(x.id,y.id);assert.notDeepEqual([x.lat,x.lng],[y.lat,y.lng]);}
 const galleries=ed.filter(p=>p.nameEn.includes('Modern Art'));assert.equal(galleries.length,2);assert.notDeepEqual([galleries[0].lat,galleries[0].lng],[galleries[1].lat,galleries[1].lng]);
 assert.ok(!ukCatalog.some(p=>/Big Ben &|Soho &|Holland Park &|High Street and/.test(p.nameEn)));
});
