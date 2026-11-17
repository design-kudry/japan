import {samePlaceLocation} from './place-identity.js';
import {fetchPlaceJson,wikiPlaces} from './wiki-places.js';
import {curatedCatalog} from './place-catalog.js';
import {hasCyrillic,polishDescription} from './russian.js';

// Shared records for catalogue, map, saved places and route cards. Authored copy wins.
const records=new Map();
const wikiId=p=>p.wikidata||(/^wd:Q\d+$/.test(p.id||'')?p.id.slice(3):'');
const identity=p=>wikiId(p)?'wd:'+wikiId(p):p.id;
const authoredById=new Map(curatedCatalog.map(p=>[p.id,p]));
const authoredByWiki=new Map(curatedCatalog.filter(p=>wikiId(p)).map(p=>[wikiId(p),p]));
export function libraryPlace(p){
 if(!p)return p;
 const norm=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const author=authoredById.get(p.id)||authoredByWiki.get(wikiId(p))||curatedCatalog.find(c=>[c.name,c.nameEn].some(n=>n&&norm(n)===norm(p.name))&&Math.hypot(c.lat-p.lat,c.lng-p.lng)<.003);
 const shared=records.get(identity(p));
 const preferred=[author,shared].find(candidate=>candidate&&samePlaceLocation(p,candidate));
 return preferred?{...p,...preferred,id:preferred.id||p.id,img:preferred.img||p.img}:p;
}
export function registerPlaces(items){
 const result=items.map(p=>{
  const merged=libraryPlace(p),key=identity(merged);
  if(key){records.set(key,merged);if(merged.id)records.set(merged.id,merged);}
  return merged;
 });
 if(typeof window!=='undefined')window.dispatchEvent(new Event('place-library-updated'));
 return result;
}
export function libraryPlaces(){return [...new Map([...curatedCatalog,...records.values()].map(p=>{const value=libraryPlace(p);return [value.id,value];})).values()];}
export const inBounds=(p,b)=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.lat>=b.south&&p.lat<=b.north&&p.lng>=b.west&&p.lng<=b.east;
export function hasRecommendationCopy(p){
 if(p.authorSupplied||p.metadataOrigin)return true;
 return hasCyrillic(p.name)&&hasCyrillic(p.desc)&&polishDescription(p.desc).length>=60;
}

// Both viewport and city discovery ingest the same Russian source records.
export async function russianPlaces(items,signal){
 const ready=items.filter(p=>hasRecommendationCopy(libraryPlace(p))).map(libraryPlace);
 const ids=[...new Set(items.filter(p=>!hasRecommendationCopy(libraryPlace(p))).map(p=>p.wikidata).filter(Boolean))];
 for(let i=0;i<ids.length;i+=40){
  try{const data=await fetchPlaceJson('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',origin:'*',ids:ids.slice(i,i+40).join('|'),props:'sitelinks',sitefilter:'ruwiki'}),signal);
  const titles=[...new Set(Object.values(data.entities||{}).map(e=>e.sitelinks?.ruwiki?.title).filter(Boolean))];
  if(titles.length)ready.push(...await wikiPlaces('ru',{titles:titles.join('|')},signal));
  }catch(e){if(signal?.aborted)throw e;}
 }
 return ready.map(libraryPlace).filter(hasRecommendationCopy);
}
