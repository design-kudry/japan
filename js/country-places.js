import {fetchPlaceJson,wikiPlaces} from './wiki-places.js';
import {isAttraction} from './world-places.js';
import {enrichPlaces} from './place-enrichment.js';
import {russianOnly,usefulPlaceDesc} from './russian.js';
const cache=new Map();
const countryAliases={'британия':'GB','великобритания':'GB','соединенное королевство':'GB','сша':'US','соединенные штаты америки':'US','россия':'RU','рф':'RU','южная корея':'KR','оаэ':'AE'};
export function canonicalCountry(value){const s=String(value||'').trim();const code=countryAliases[s.toLowerCase().replace(/ё/g,'е')];return code?new Intl.DisplayNames(['ru'],{type:'region'}).of(code):s;}
const regionCodes=Array.from({length:676},(_,i)=>String.fromCharCode(65+Math.floor(i/26),65+i%26));
const normalizeCountry=value=>canonicalCountry(value).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
let countryCodes;
export function countryMatches(a,b){
 const left=normalizeCountry(a),right=normalizeCountry(b);if(left===right)return true;if(!left||!right)return false;
 if(!countryCodes){countryCodes=new Map();const ru=new Intl.DisplayNames(['ru'],{type:'region'}),en=new Intl.DisplayNames(['en'],{type:'region'});for(const code of regionCodes)for(const name of [ru.of(code),en.of(code),code])countryCodes.set(normalizeCountry(name),code);}
 return countryCodes.has(left)&&countryCodes.get(left)===countryCodes.get(right);
}
export async function countryPlaces(country,signal,onUpdate,cities=[],page=0){
 const cacheKey=country+'|'+cities.map(c=>c.name).join('|')+'|'+page;
 if(cache.has(cacheKey)){onUpdate(cache.get(cacheKey));return;}
 const {discoverCities,cityPlaces}=await import('./add-place-data.js');
 const discovered=await discoverCities(country,signal,true);
 const selected=[...new Map([...cities,...discovered.slice(page*24,(page+1)*24)].map(c=>[c.name,c])).values()];
 const {curatedCatalog}=await import('./place-catalog.js');
 let progressive=curatedCatalog.filter(p=>countryMatches(p.country,country));if(progressive.length)onUpdate(progressive);
 const publish=items=>{progressive=[...new Map([...progressive,...items].map(p=>[p.id,p])).values()];if(!signal?.aborted&&progressive.length)onUpdate(progressive);};
 let next=0;const outcomes=await Promise.allSettled(Array.from({length:Math.min(3,selected.length)},async()=>{while(next<selected.length&&!signal?.aborted){const city=selected[next++];try{await cityPlaces(city,signal,publish).then(publish);}catch(e){if(signal?.aborted)throw e;}}}));
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 if(progressive.length){cache.set(cacheKey,progressive);return;}
 if(outcomes.every(r=>r.status==='rejected'))throw Error('Не удалось загрузить места страны');
 const countryData=await fetchPlaceJson('https://ru.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',origin:'*',titles:canonicalCountry(country),redirects:'1',prop:'pageprops'}),signal);
 const id=Object.values(countryData.query?.pages||{})[0]?.pageprops?.wikibase_item;
 if(!/^Q\d+$/.test(id||''))throw Error('Не удалось определить страну');
 const entity=await fetchPlaceJson('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',origin:'*',ids:id,props:'labels',languages:'en'}),signal);
 const english=entity.entities?.[id]?.labels?.en?.value||country;
 // Fast path first: city geosearch + two topic searches. Extra topics fill in after first paint.
 const fast=[];
 for(const city of cities.slice(0,3)){
  fast.push((async()=>{
   const data=await fetchPlaceJson('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:city.name,count:'5',language:'ru'}),signal);
   const center=data.results?.find(c=>countryMatches(c.country,country));if(!center)return [];
   return wikiPlaces('en',{generator:'geosearch',ggscoord:center.latitude+'|'+center.longitude,ggsradius:'10000',ggslimit:'40',ggsnamespace:'0',ggsprop:'type'},signal);
  })());
  fast.push(wikiPlaces('ru',{generator:'search',gsrsearch:city.name+' достопримечательности',gsrnamespace:'0',gsrlimit:'20'},signal));
 }
 fast.push(wikiPlaces('en',{generator:'search',gsrsearch:english+' landmarks',gsrnamespace:'0',gsrlimit:'20'},signal));
 fast.push(wikiPlaces('ru',{generator:'search',gsrsearch:canonicalCountry(country)+' достопримечательности',gsrnamespace:'0',gsrlimit:'20'},signal));
 const later=[
  wikiPlaces('en',{generator:'search',gsrsearch:english+' museums',gsrnamespace:'0',gsrlimit:'15'},signal),
  wikiPlaces('en',{generator:'categorymembers',gcmtitle:'Category:World Heritage Sites in '+english,gcmnamespace:'0',gcmlimit:'30'},signal).then(list=>list.map(p=>({...p,geoType:'landmark'}))).catch(()=>[]),
 ];
 const seen=new Set(),entities={};
 let list=[];
 async function absorb(batch){
  if(signal?.aborted||list.length>=80)return;
  const fresh=[...new Map((batch||[]).filter(p=>p.wikidata&&!seen.has(p.wikidata)&&isAttraction(p)&&!/(nightclub|police station|high commission|optometr|ночной клуб|полицейск)/i.test(p.name+' '+p.desc)).map(p=>[p.wikidata,p])).values()];
  if(!fresh.length)return;
  for(let i=0;i<fresh.length;i+=40){
   const missing=fresh.slice(i,i+40).map(p=>p.wikidata).filter(wid=>!entities[wid]);
   if(missing.length){const data=await fetchPlaceJson('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',origin:'*',ids:missing.join('|'),props:'claims|labels|descriptions',languages:'ru|en'}),signal);Object.assign(entities,data.entities||{});}
  }
  if(signal?.aborted)return;
  const accepted=fresh.filter(p=>entities[p.wikidata]?.claims?.P17?.some(c=>c.mainsnak?.datavalue?.value?.id===id)).map(p=>{
   const wikiDesc=usefulPlaceDesc(p.desc);
   const wdDesc=usefulPlaceDesc(russianOnly(entities[p.wikidata]?.descriptions?.ru?.value));
   return {...p,name:russianOnly(entities[p.wikidata]?.labels?.ru?.value)||russianOnly(p.name),desc:wikiDesc||wdDesc||'',country};
  }).filter(p=>p.name);
  if(!accepted.length)return;
  accepted.forEach(p=>seen.add(p.wikidata));
  list=[...list,...accepted].slice(0,80);
  cache.set(cacheKey,list);onUpdate(list);
 }
 await Promise.all(fast.map(job=>Promise.resolve(job).then(absorb).catch(()=>{})));
 if(signal?.aborted)return;
 if(!list.length)throw Error('Не удалось загрузить места страны');
 cache.set(cacheKey,list);onUpdate(list);
 // Thumbnails already come from Wikipedia; enrich hours in background for a small slice only.
 Promise.all(later.map(job=>Promise.resolve(job).then(absorb).catch(()=>{}))).then(()=>{
  if(signal?.aborted||!list.length)return;
  return enrichPlaces(list.slice(0,20),signal,patches=>{
   const enriched=list.map(p=>({...p,...(patches[p.id]||{}),img:p.img||patches[p.id]?.img,country}));
   list=enriched;cache.set(cacheKey,enriched);onUpdate(enriched);
  });
 }).catch(()=>{});
}
