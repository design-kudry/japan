import {usefulPlaceDesc} from './russian.js';

const responseCache=new Map();
export async function fetchPlaceJson(url,signal){
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const cached=responseCache.get(url);if(cached&&Date.now()-cached.time<1200000)return cached.data;
 let last;
 for(let attempt=0;attempt<2;attempt++){
 const request=new AbortController(),abort=()=>request.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,12000);
 try{const r=await fetch(url,{signal:request.signal,credentials:'omit'});if(!r.ok){const e=Error('Источник недоступен');e.retry=r.status===429||r.status>=500;throw e;}const data=await r.json();if(data.error)throw Error(data.error.info||'Источник недоступен');responseCache.set(url,{data,time:Date.now()});if(responseCache.size>200)responseCache.delete(responseCache.keys().next().value);return data;
 }catch(e){last=e;if(signal?.aborted)throw new DOMException('Aborted','AbortError');if(attempt||e.retry===false)throw e;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
 throw last;
}
const russianText=value=>/[а-яё]/i.test(value||'')?value:'';
const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:'';}catch{return '';}};

// Wikipedia places come back with a usable thumbnail URL immediately (no local assets).
export async function wikiPlaces(lang,parameters,signal){
 const params=new URLSearchParams({
  action:'query',format:'json',origin:'*',
  prop:'coordinates|extracts|pageimages|info|pageprops|pageterms',
  inprop:'url',exintro:'1',explaintext:'1',exsentences:'4',exlimit:'20',
  wbptterms:'description',coprimary:'primary',coprop:'type',colimit:'max',
  // thumbnail|name — previously only "name", so UI never got an img URL
  piprop:'thumbnail|name',pithumbsize:'600',pilimit:'50',
  ...parameters,
 });
 // Only freely licensed image results; missing photos use the existing placeholder.
 if(!params.has('pilicense'))params.set('pilicense','free');
 const d=await fetchPlaceJson('https://'+lang+'.wikipedia.org/w/api.php?'+params,signal);
 return Object.values(d.query?.pages||{}).filter(p=>p.coordinates?.[0]&&!('missing' in p)).sort((a,b)=>(a.index||0)-(b.index||0)).map(p=>{
  // Prefer a visit-useful lead; drop thin Wikidata labels — UI will show a category teaser.
  const desc=usefulPlaceDesc(russianText(p.extract))||usefulPlaceDesc(russianText(p.terms?.description?.[0]))||'';
  return {
  id:p.pageprops?.wikibase_item?'wd:'+p.pageprops.wikibase_item:'wiki:'+lang+':'+p.pageid,
  wikidata:p.pageprops?.wikibase_item,
  name:p.title,
  lat:p.coordinates[0].lat,
  lng:p.coordinates[0].lon,
  geoType:p.coordinates[0].type,
  kind:p.terms?.description?.[0]||'',
  desc,
  discoveryDesc:usefulPlaceDesc(p.extract)||'',
  wiki:{lang,title:p.title,pageid:p.pageid},
  wikiFile:p.pageimage,
  img:safeUrl(p.thumbnail?.source),
  descriptionUrl:p.fullurl,
  descriptionLicense:'CC BY-SA',
  category:'attraction',
 };
 });
}
