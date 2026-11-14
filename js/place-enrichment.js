import {officialMeta,wikidataMeta} from './extra-place-meta.js';
import {voyageMeta} from './voyage-meta.js';
import {placeId} from './world-places.js';
import {hasCyrillic,russianOnly,categoryName,usefulPlaceDesc} from './russian.js';
import {priceFromOsmTags,visitDurationLabel} from './place-meta.js';
const takeDesc=raw=>{const polished=usefulPlaceDesc(raw);return polished||'';}

// Photos: Wikipedia + Commons (+ Wikidata P18). Hours/fee: OSM/Overpass when available.
// No Google. No local Japan image catalog.

const visitHint=tags=>visitDurationLabel({category:tags.tourism||tags.historic||tags.attraction||tags.amenity});
const cache=new Map();
export const placeCategory=categoryName;
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:'';}catch{return '';}};
const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const englishName=p=>{
 const idName=String(p.id||'').includes('|')?String(p.id).split('|')[0]:'';
 return p.nameEn||(/^[^\u0400-\u04FF]+$/.test(String(p.name||''))?p.name:idName)||p.name||'';
};
const nameCandidates=p=>[p.nameEn,englishName(p),p.name,String(p.id||'').includes('|')?String(p.id).split('|')[0]:''].map(norm).filter(Boolean);
const nameHit=(wants,titles)=>wants.length&&titles.length&&wants.some(want=>titles.some(n=>n.includes(want)||want.includes(n)||n.split(' ').some(w=>w.length>3&&want.includes(w))));

async function json(url,signal,init={}){
 const request=new AbortController(),abort=()=>request.abort();
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)request.abort();
 const timer=setTimeout(abort,12000);
 try{
  const r=await fetch(url,{...init,signal:request.signal,credentials:'omit'});
  if(!r.ok)throw Error('Source unavailable '+r.status);
  return await r.json();
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
const api=(host,params)=>'https://'+host+'/w/api.php?'+new URLSearchParams({format:'json',origin:'*',...params});

const OVERPASS=[
 'https://overpass-api.de/api/interpreter',
 'https://lz4.overpass-api.de/api/interpreter',
 'https://overpass.kumi.systems/api/interpreter',
];
async function overpass(query,signal){
 let last;
 for(const host of OVERPASS){
  try{
   return await json(host,signal,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(query)});
  }catch(e){last=e;}
 }
 throw last||Error('Overpass unavailable');
}

async function commonsPhoto(file,signal){
 if(!file)return {};
 const title=String(file).replace(/^File:/i,'');
 const media=await json(api('commons.wikimedia.org',{action:'query',titles:'File:'+title,prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'600'}),signal);
 const info=Object.values(media.query?.pages||{})[0]?.imageinfo?.[0],meta=info?.extmetadata;
 if(!info)return {};
 return {
  img:safeUrl(info.thumburl||info.url),imageOriginal:safeUrl(info.url),
  imageCredit:clean(meta?.Artist?.value||''),
  imageLicense:clean(meta?.LicenseShortName?.value||''),
  imageSource:safeUrl(info.descriptionurl),
  imageLicenseUrl:safeUrl(meta?.LicenseUrl?.value||''),
 };
}

/** Fast Wikipedia photo+desc for a coordinate place (EN then RU). */
async function wikiPhotoFill(p,patch,signal){
 const wants=nameCandidates(p);
 for(const lang of ['en','ru']){
  try{
   const d=await json(api(lang+'.wikipedia.org',{action:'query',list:'geosearch',gscoord:p.lat+'|'+p.lng,gsradius:'1000',gslimit:'8'}),signal);
   const hits=d.query?.geosearch||[];if(!hits.length)continue;
   const hit=hits.find(h=>nameHit(wants,[norm(h.title)]))||hits[0];
   const page=await json(api(lang+'.wikipedia.org',{
    action:'query',pageids:String(hit.pageid),
    prop:'pageimages|extracts|info|pageprops',inprop:'url',
    exintro:'1',explaintext:'1',exsentences:'4',
    piprop:'thumbnail|name',pithumbsize:'600',pilicense:'any',
   }),signal);
   const info=page.query?.pages?.[String(hit.pageid)];if(!info)continue;
   if(!patch.img&&info.thumbnail?.source)patch.img=safeUrl(info.thumbnail.source);
   if(!patch.img&&info.pageimage)Object.assign(patch,await commonsPhoto(info.pageimage,signal));
   if(!patch.desc&&info.extract&&(lang==='ru'?hasCyrillic(info.extract):lang==='en')){
    const next=takeDesc(info.extract);
    if(next&&(lang==='ru'||!patch.desc)){
     patch.desc=next;
     patch.descriptionUrl=safeUrl(info.fullurl);
     patch.descriptionLicense='CC BY-SA';
    }
   }
   if(!patch.wikidata&&info.pageprops?.wikibase_item)patch.wikidata=info.pageprops.wikibase_item;
   if(patch.img)return;
  }catch{}
 }
}

async function wikidataPhotoFill(p,patch,signal){
 const query=englishName(p)||p.name;if(!query||query.length<2)return;
 try{
  const search=await json(api('www.wikidata.org',{action:'wbsearchentities',search:query,language:'en',type:'item',limit:'5'}),signal);
  const hit=(search.search||[]).find(s=>nameHit(nameCandidates(p),[norm(s.label)]))||search.search?.[0];
  if(!hit?.id)return;
  patch.wikidata||=hit.id;
  const ent=(await json(api('www.wikidata.org',{action:'wbgetentities',ids:hit.id,props:'claims|labels|descriptions|sitelinks',languages:'ru|en',sitefilter:'ruwiki|enwiki'}),signal)).entities?.[hit.id];
  if(!ent)return;
  if(!patch.name&&russianOnly(ent.labels?.ru?.value))patch.name=ent.labels.ru.value.trim();
  // Wikidata one-liners are usually too thin — only keep if polish accepts them.
  if(!patch.desc){const d=takeDesc(russianOnly(ent.descriptions?.ru?.value));if(d)patch.desc=d;}
  const image=ent.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if(!patch.img&&image)Object.assign(patch,await commonsPhoto(image,signal));
  const title=ent.sitelinks?.ruwiki?.title||ent.sitelinks?.enwiki?.title;
  const lang=ent.sitelinks?.ruwiki?'ru':'en';
  if(title&&(!patch.img||!patch.desc)){
   const d=await json(api(lang+'.wikipedia.org',{action:'query',titles:title,redirects:'1',prop:'pageimages|extracts|info',inprop:'url',exintro:'1',explaintext:'1',exsentences:'4',piprop:'thumbnail|name',pithumbsize:'600',pilicense:'any'}),signal);
   const page=Object.values(d.query?.pages||{}).find(x=>!('missing' in x));
   if(page){
    if(!patch.img&&page.thumbnail?.source)patch.img=safeUrl(page.thumbnail.source);
    if(!patch.img&&page.pageimage)Object.assign(patch,await commonsPhoto(page.pageimage,signal));
    if(!patch.desc&&page.extract&&(lang==='ru'?hasCyrillic(page.extract):true)){
     const next=takeDesc(page.extract);if(next){patch.desc=next;patch.descriptionUrl=safeUrl(page.fullurl);patch.descriptionLicense='CC BY-SA';}
    }
   }
  }
 }catch{}
}

export async function enrichPlaces(places,signal,onUpdate=()=>{}){
 const patches=new Map();
 const pending=places.filter(p=>{
  const id=placeId(p);
  const hit=cache.get(id);
  if(hit&&hit.expires>=Date.now()){
   patches.set(id,{...hit.patch});
   // Retry soon if photo or hours still missing.
   return !(hit.patch.img&&hit.patch.hours&&hit.patch.price);
  }
  return !!(/^osm:[NWR]:\d+$/.test(p.id||'')||p.wiki||p.wikidata||(Number.isFinite(p.lat)&&Number.isFinite(p.lng)));
 });
 places.forEach(p=>{if(cache.has(placeId(p))&&!patches.has(placeId(p)))patches.set(placeId(p),{...cache.get(placeId(p)).patch});});
 const emit=()=>{if(!signal?.aborted)onUpdate(Object.fromEntries(patches));};emit();
 if(!pending.length)return;
 const patchFor=p=>{const id=placeId(p);if(!patches.has(id))patches.set(id,{});return patches.get(id);};

 for(const p of pending){const meta=officialMeta(p);if(meta.price||meta.hours)Object.assign(patchFor(p),meta);}emit();
 const metadataTask=Promise.allSettled(pending.slice(0,30).map(async p=>{
  const timeout=new AbortController(),abort=()=>timeout.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,12000);
  try{const meta=await voyageMeta(p,timeout.signal);if(signal?.aborted)return;const patch=patchFor(p);if(!p.hours&&!patch.hours&&meta.hours)patch.hours=meta.hours;if(!p.price&&!patch.price&&meta.price)patch.price=meta.price;if(meta.metaSource&&!patch.metaSource){patch.metaSource=meta.metaSource;patch.metaProvider='Wikivoyage';patch.metaLicense=meta.metaLicense;}emit();}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }));
 const photoTask=(async()=>{
 // Photos load independently of opening hours and tickets.
 const needPhoto=pending.filter(p=>!p.img&&!patchFor(p).img&&(p.wiki||p.wikiFile||p.wikidata||(Number.isFinite(p.lat)&&Number.isFinite(p.lng))));
 await Promise.all(needPhoto.slice(0,30).map(async p=>{
  if(signal?.aborted)return;
  const patch=patchFor(p);
  if(p.wikiFile&&!patch.img)Object.assign(patch,await commonsPhoto(p.wikiFile,signal).catch(()=>({})));
  if(p.wiki?.title&&!patch.img){
   try{
    const lang=p.wiki.lang||'en';
    const d=await json(api(lang+'.wikipedia.org',{action:'query',titles:p.wiki.title,redirects:'1',prop:'pageimages|extracts|info',inprop:'url',exintro:'1',explaintext:'1',exsentences:'4',piprop:'thumbnail|name',pithumbsize:'600',pilicense:'any'}),signal);
    const page=Object.values(d.query?.pages||{}).find(x=>!('missing' in x));
    if(page){
     if(page.thumbnail?.source)patch.img=safeUrl(page.thumbnail.source);
     if(!patch.img&&page.pageimage)Object.assign(patch,await commonsPhoto(page.pageimage,signal));
     if(!patch.desc&&page.extract&&(lang==='ru'?hasCyrillic(page.extract):true)){
      const next=takeDesc(page.extract);if(next){patch.desc=next;patch.descriptionUrl=safeUrl(page.fullurl);patch.descriptionLicense='CC BY-SA';}
     }
    }
   }catch{}
  }
  if(!patch.img&&Number.isFinite(p.lat)&&Number.isFinite(p.lng))await wikiPhotoFill(p,patch,signal);
  if(!patch.img)await wikidataPhotoFill(p,patch,signal);
  emit();
 }));
 if(signal?.aborted)return;

 })();
 // 2) Hours/fee from OSM ids.
 const tagsById=new Map();
 await Promise.allSettled(['N','W','R'].map(async type=>{
  const group=pending.filter(p=>/^osm:[NWR]:\d+$/.test(p.id||'')&&p.id.split(':')[1]===type);if(!group.length)return;
  const plural={N:'nodes',W:'ways',R:'relations'}[type];
  const data=await json('https://www.openstreetmap.org/api/0.6/'+plural+'.json?'+new URLSearchParams({[plural]:group.map(p=>p.id.split(':')[2]).join(',')}),signal);
  for(const e of data.elements||[]){
   const id='osm:'+e.type[0].toUpperCase()+':'+e.id,t=e.tags||{};tagsById.set(id,t);
   const patch=patchFor({id});
   Object.assign(patch,{
    category:t.tourism||t.historic||t.amenity||patch.category,
    hours:patch.hours||t.opening_hours||'',
    price:patch.price||priceFromOsmTags(t)||undefined,
    desc:patch.desc||takeDesc(russianOnly(clean(t['description:ru']||t.description))),
    website:patch.website||safeUrl(t.website||t['contact:website']),
    wikidata:patch.wikidata||t.wikidata,
   });
   if(russianOnly(t['name:ru']))patch.name=t['name:ru'].trim();
   if(!patch.price)delete patch.price;if(!patch.hours)delete patch.hours;
   const dur=visitHint(t);if(dur&&!patch.duration)patch.duration=dur;
   if(!patch.img&&t.wikimedia_commons?.startsWith('File:'))Object.assign(patch,await commonsPhoto(t.wikimedia_commons,signal).catch(()=>({})));
   for(const p of pending)if(placeId(p)===id||p.id===id)Object.assign(patchFor(p),patch);
  }
 }));
 emit();

 // Photon search results initially lack Wikidata IDs. Retry after exact OSM identity resolution.
 const resolvedMetadata=Promise.allSettled(pending.slice(0,30).map(async p=>{
  const patch=patchFor(p),resolved={...p,wikidata:p.wikidata||patch.wikidata};
  if(!resolved.wikidata)return;
  const request=new AbortController(),abort=()=>request.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,12000);
  try{await Promise.allSettled([wikidataMeta(resolved,request.signal),voyageMeta(resolved,request.signal)].map(async task=>{const meta=await task;if(signal?.aborted)return;if(!p.price&&!patch.price&&meta.price)patch.price=meta.price;if(!p.hours&&!patch.hours&&meta.hours)patch.hours=meta.hours;if(meta.metaSource&&!patch.metaSource){patch.metaSource=meta.metaSource;patch.metaProvider=meta.metaProvider||'Wikivoyage';}emit();}));}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }));
 // 3) Overpass hours for wiki / coordinate places (best-effort, may fail).
 const needHours=pending.filter(p=>(!patchFor(p).hours||!patchFor(p).price)&&(p.wikidata||patchFor(p).wikidata||(Number.isFinite(p.lat)&&Number.isFinite(p.lng)))).slice(0,16);
 if(needHours.length){
  try{
   const withWiki=needHours.map(p=>p.wikidata||patchFor(p).wikidata).filter(id=>/^Q\d+$/.test(id||''));
   if(withWiki.length){
    const q='[out:json][timeout:15];('+[...new Set(withWiki)].slice(0,20).map(id=>'nwr[wikidata='+id+'];').join('')+');out tags center;';
    const over=await overpass(q,signal);
    const byWiki=new Map();
    for(const e of over.elements||[]){
     const wid=e.tags?.wikidata;if(!wid||byWiki.has(wid))continue;
     byWiki.set(wid,{hours:e.tags.opening_hours||'',price:priceFromOsmTags(e.tags||{}),duration:visitHint(e.tags||{}),category:e.tags.tourism||e.tags.historic||e.tags.attraction||''});
    }
    for(const p of needHours){
     const meta=byWiki.get(p.wikidata||patchFor(p).wikidata);if(!meta)continue;const patch=patchFor(p);
     if(!patch.hours&&meta.hours)patch.hours=meta.hours;
     if(!patch.price&&meta.price)patch.price=meta.price;
     if(!patch.duration&&meta.duration)patch.duration=meta.duration;
     if(!patch.category&&meta.category)patch.category=meta.category;
    }
    emit();
   }
  }catch{}
  try{
   const around=needHours.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&!patchFor(p).hours).slice(0,12);
   if(around.length){
    const q='[out:json][timeout:20];('+around.map(p=>'nwr(around:280,'+p.lat+','+p.lng+')[name];').join('')+');out tags center;';
    const over=await overpass(q,signal);
    for(const p of around){
     const wants=nameCandidates(p);let best=null,bestScore=0;
     for(const e of over.elements||[]){
      const tags=e.tags||{};if(!tags.opening_hours&&!tags.fee)continue;
      const names=[tags.name,tags['name:ru'],tags['name:en']].filter(Boolean).map(norm);
      if(!nameHit(wants,names))continue;
      const elat=e.lat??e.center?.lat,elng=e.lon??e.center?.lon;if(!Number.isFinite(elat))continue;
      const dist=Math.hypot((elat-p.lat)*111000,(elng-p.lng)*111000*Math.cos(p.lat*Math.PI/180));
      const score=1/(1+dist/60)+(tags.opening_hours?0.6:0);
      if(score>bestScore){bestScore=score;best=tags;}
     }
     if(!best)continue;
     const patch=patchFor(p);
     if(best.opening_hours)patch.hours=best.opening_hours;
     if(!patch.price){const price=priceFromOsmTags(best);if(price)patch.price=price;}
     if(!patch.duration){const d=visitHint(best);if(d)patch.duration=d;}
    }
    emit();
   }
  }catch{}
 }

 await Promise.allSettled([photoTask,metadataTask,resolvedMetadata]);
 if(signal?.aborted)return;
 for(const p of pending){
  const id=placeId(p),patch=patches.get(id);if(!patch)continue;
  const ttl=(patch.img?8:2)*60*1000;
  cache.set(id,{patch,expires:Date.now()+ttl});
  if(cache.size>500)cache.delete(cache.keys().next().value);
 }
 emit();
}

// Dedicated photo queue: independent from tickets, geocoding and city catalogue requests.
export async function enrichPhotos(places,onPhoto,signal){
 // Restore cached photos before making any network request.
 for(const p of places){if(p.img)continue;try{const hit=JSON.parse(localStorage.getItem('place-photo-v2:'+placeId(p))||'null');if(hit?.img){Object.assign(p,hit);onPhoto(p,hit);}}catch{}}
 const files=new Map();
 // Resolve several page titles in one request; keep licence checks in Commons.
 for(let i=0;i<places.length;i+=20){const batch=places.slice(i,i+20).filter(p=>!p.img);if(!batch.length)continue;
 try{const data=await json(api('en.wikipedia.org',{action:'query',titles:batch.map(p=>englishName(p)).filter(Boolean).join('|'),redirects:'1',prop:'pageimages',piprop:'name',pilicense:'free'}),signal);
 const aliases=new Map([...(data.query?.normalized||[]),...(data.query?.redirects||[])].map(r=>[r.from,r.to]));
 const pages=Object.values(data.query?.pages||{});for(const p of batch){let title=englishName(p);for(let n=0;n<5&&aliases.has(title);n++)title=aliases.get(title);const page=pages.find(pg=>pg.title===title);if(page?.pageimage)files.set(placeId(p),page.pageimage);}
 }catch{}
 }
 let index=0;
 await Promise.all(Array.from({length:4},async()=>{
 while(index<places.length&&!signal?.aborted){const p=places[index++];if(p.img)continue;
 const key='place-photo-v2:'+placeId(p);try{const hit=JSON.parse(localStorage.getItem(key)||'null');if(hit?.img){onPhoto(p,hit);continue;}}catch{}
 try{
 const title=p.wiki?.title||englishName(p);if(!title)continue;
 const lang=p.wiki?.lang||'en';
 const data=files.has(placeId(p))?{}:await json(api(lang+'.wikipedia.org',{action:'query',titles:title,redirects:'1',prop:'pageimages',piprop:'name',pilicense:'free'}),signal);
 const page=Object.values(data.query?.pages||{}).find(x=>!('missing' in x));
 const file=files.get(placeId(p))||page?.pageimage;if(!file)continue;
 const photo=await commonsPhoto(file,signal);
 if(!photo.img||!photo.imageLicense||!photo.imageSource)continue;
 if(!signal?.aborted){onPhoto(p,photo);try{localStorage.setItem(key,JSON.stringify(photo));}catch{}}
 }catch{}
 }
 }));
}

const galleryCache=new Map();
export async function placeGallery(place,signal){
 const key=placeId(place);if(galleryCache.has(key))return galleryCache.get(key);
 const title=place.wiki?.title||englishName(place);if(!title)return [];
 const lang=place.wiki?.lang||'en';
 const d=await json(api(lang+'.wikipedia.org',{action:'query',titles:title,redirects:'1',prop:'images',imlimit:'30'}),signal);
 const pages=Object.values(d.query?.pages||{});const words=norm(title).split(' ').filter(w=>w.length>3&&!['temple','shrine','castle','museum','tokyo','osaka'].includes(w));
 const names=pages.flatMap(p=>p.images||[]).map(p=>p.title).filter(n=>/\.(jpe?g|webp)$/i.test(n)&&!/(map|logo|flag|portrait|plan|diagram)/i.test(n)&&(!words.length||words.some(w=>norm(n).includes(w)))).slice(0,6);
 const photos=(await Promise.allSettled(names.map(n=>commonsPhoto(n,signal)))).flatMap(r=>r.status==='fulfilled'&&r.value.img&&r.value.imageLicense&&r.value.imageSource?[r.value]:[]);
 if(photos.length)galleryCache.set(key,photos);return photos;
}
