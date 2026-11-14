import {curatedCatalog} from './place-catalog.js';
import {fetchPlaceJson,wikiPlaces} from './wiki-places.js';
import {canonicalCountry,countryMatches} from './country-places.js';
import {isAttraction,isDiscoveryPlace,mergePlaces,distanceMeters} from './world-places.js';
const cache=new Map();
export const cityKey=c=>canonicalCountry(c.country)+'|'+c.name;
export const countryOptions=(()=>{const codes='AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW'.split(' ');const names=new Intl.DisplayNames(['ru'],{type:'region'});return codes.map(code=>({value:canonicalCountry(names.of(code)),content:names.of(code),code})).sort((a,b)=>a.content.localeCompare(b.content,'ru'));})();
export const worldDirections=[{name:'Лондон',country:'Великобритания'},{name:'Париж',country:'Франция'},{name:'Токио',country:'Япония'},{name:'Рим',country:'Италия'}];
export async function resolveCity(city,signal){
 const key='geo:'+cityKey(city);if(Number.isFinite(city.lat)&&Number.isFinite(city.lng))return city;
 if(cache.has(key))return cache.get(key);
 const seed=seedPlaces(city)[0];if(seed)return {...city,lat:seed.lat,lng:seed.lng};
 const d=await fetchPlaceJson('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:city.name,count:'10',language:'ru'}),signal);
 const c=d.results?.find(c=>countryMatches(c.country,city.country)&&/^PPL/.test(c.feature_code||''));if(!c)throw Error('Город не найден');
 const result={...city,lat:c.latitude,lng:c.longitude};cache.set(key,result);return result;
}
export async function discoverCities(country,signal,expand=false){
 const authored=[...new Map(curatedCatalog.filter(p=>countryMatches(p.country,country)).map(p=>[p.city,{name:p.city,country:p.country,lat:p.lat,lng:p.lng}])).values()];
 if(authored.length&&!expand)return authored;
 const key='cities-v4:'+canonicalCountry(country);if(cache.has(key))return expand?cache.get(key):cache.get(key).slice(0,24);
 const code=countryOptions.find(c=>countryMatches(c.value,country))?.code;
 if(!code)return authored;
 try{const rows=await fetchPlaceJson('/places/cities/'+code+'.json',signal);
 const cities=rows.map(c=>({...c,country:canonicalCountry(country)}));
 // Keep the author's destination names; avoid a second spelling of the same city.
 const combined=[...authored,...cities.filter(c=>!authored.some(a=>a.name===c.name||distanceMeters(a,c)<6000))];
 cache.set(key,combined);return expand?combined:combined.slice(0,24);
 }catch(e){if(signal?.aborted)throw e;if(authored.length)return authored;throw Error('Не удалось загрузить города страны');}
}

export async function cityPlaces(city,signal,onUpdate=()=>{}){
 const key='places:'+cityKey(city);if(cache.has(key))return cache.get(key);
 try{const cached=JSON.parse(localStorage.getItem(key)||'null');if(cached?.places?.length&&Date.now()-cached.time<86400000)onUpdate(cached.places);}catch{}
 const center=await resolveCity(city,signal);
 const seeds=seedPlaces(city);if(seeds.length)onUpdate(seeds);
 const results=await Promise.allSettled([...['ru','en'].map(lang=>wikiPlaces(lang,{generator:'geosearch',ggscoord:center.lat+'|'+center.lng,ggsradius:'10000',ggslimit:'50',ggsnamespace:'0',ggsprop:'type'},signal)),wikiPlaces('ru',{generator:'search',gsrsearch:city.name+' достопримечательности',gsrlimit:'20',gsrnamespace:'0'},signal)]);
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');if(results.every(r=>r.status==='rejected'))throw Error('Не удалось загрузить места');
 const list=mergePlaces(results.flatMap(r=>r.status==='fulfilled'?r.value:[])).filter(p=>isDiscoveryPlace(p)&&p.wikidata&&distanceMeters(center,p)<=10000);
 if(!list.length){cache.set(key,seeds);return seeds;}
 const countryId=(await countryEntity(city.country,signal)).id;
 let accepted=[...seeds];let successes=0;
 await Promise.all(list.reduce((chunks,p,i)=>{if(i%20===0)chunks.push([]);chunks.at(-1).push(p);return chunks;},[]).map(async batch=>{
 try{const d=await fetchPlaceJson('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',origin:'*',ids:batch.map(p=>p.wikidata).join('|'),props:'labels|claims',languages:'ru|en'}),signal);successes++;
 const items=batch.filter(p=>cityAttraction(p,city,d.entities?.[p.wikidata])).filter(p=>d.entities?.[p.wikidata]?.claims?.P17?.some(c=>c.mainsnak?.datavalue?.value?.id===countryId)).map(p=>({...p,name:d.entities[p.wikidata]?.labels?.ru?.value||p.name,city:city.name,country:city.country}));
 accepted=mergePlaces([...accepted,...items]);if(!signal?.aborted)onUpdate(accepted);
 }catch(e){if(signal?.aborted)throw e;}
 }));
 if(!successes)throw Error('Не удалось проверить места');
 cache.set(key,accepted);try{localStorage.setItem(key,JSON.stringify({places:accepted,time:Date.now()}));}catch{}return accepted;
}
export function ticketFilter(p,value){const s=String(p.price||'').trim();if(!value)return true;if(value==='free')return /^(бесплатно|free|¥0$|£0$|€0$)/i.test(s);if(value==='paid')return !!s&&!/^(—|-|бесплатно|free|¥0$|£0$|€0$)/i.test(s);return true;}

// Administrative entities are headings, never attraction cards. Do not reject parks
// or monuments just because their name contains the city name.
export function cityAttraction(place,city,entity={}){
 const norm=s=>String(s||'').toLocaleLowerCase().replace(/\s*\([^)]*\)\s*$/,'').trim();
 if(place.isCity||['city','adm1st','adm2nd','adm3rd','country'].includes(place.geoType))return false;
 if(norm(place.name)===norm(city.name))return false;
 const administrative=new Set(['Q515','Q3957','Q532','Q6256','Q486972','Q56061','Q15284']);
 return !(entity.claims?.P31||[]).some(c=>administrative.has(c.mainsnak?.datavalue?.value?.id));
}

export function seedPlaces(city){return curatedCatalog.filter(p=>countryMatches(p.country,city.country)&&p.city===city.name).sort((a,b)=>(a.guideOrder??999)-(b.guideOrder??999));}

async function countryEntity(country,signal){
 const key='country:'+canonicalCountry(country);if(cache.has(key))return cache.get(key);
 const data=await fetchPlaceJson('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',origin:'*',sites:'ruwiki',titles:canonicalCountry(country),props:'claims|labels',languages:'ru|en'}),signal);
 let entity=Object.values(data.entities||{}).find(e=>e.id&&!('missing' in e));
 if(!entity){const page=await fetchPlaceJson('https://ru.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',origin:'*',titles:canonicalCountry(country),redirects:'1',prop:'pageprops'}),signal);const id=Object.values(page.query?.pages||{})[0]?.pageprops?.wikibase_item;if(!id)throw Error('Не удалось определить страну');const response=await fetchPlaceJson('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',origin:'*',ids:id,props:'claims|labels',languages:'ru|en'}),signal);entity=response.entities?.[id];}
 if(!entity)throw Error('Не удалось определить страну');cache.set(key,entity);return entity;
}
