import {libraryPlace,libraryPlaces,registerPlaces,inBounds,hasRecommendationCopy,russianPlaces} from './place-library.js';
import {fetchPlaceJson,wikiPlaces} from './wiki-places.js';
import {hasCyrillic,russianOnly,russianCountry} from './russian.js';
const cache=new Map();
export const placeId=p=>p.id||p.name+'|'+p.lat+'|'+p.lng;
export const normalizePlaceText=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const earthRadius=6371000;
export function distanceMeters(a,b){
 if(!Number.isFinite(a?.lat)||!Number.isFinite(b?.lat)||!Number.isFinite(a?.lng)||!Number.isFinite(b?.lng))return 0;
 const toRad=d=>d*Math.PI/180,dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);
 const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
 return 2*earthRadius*Math.asin(Math.min(1,Math.sqrt(x)));
}
// Walking estimate between consecutive points; visit times are optional extras.
export function routeDurationMinutes(places){
 const pts=places.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 let meters=0;for(let i=1;i<pts.length;i++)meters+=distanceMeters(pts[i-1],pts[i]);
 const travel=pts.length>1?Math.round(meters/75):0;
 const visit=places.reduce((sum,p)=>{const raw=p.duration||p.visitDuration||'';const match=String(raw).match(/(\d+(?:[.,]\d+)?)\s*(ч|час|h|hour|мин|min)?/i);if(!match)return sum;const value=Number(match[1].replace(',','.'));const unit=(match[2]||'мин').toLowerCase();return sum+Math.round(/ч|час|h|hour/.test(unit)?value*60:value);},0);
 return travel+visit;
}
export function formatRouteDuration(minutes){
 if(!Number.isFinite(minutes)||minutes<=0)return '';
 if(minutes<60)return minutes+' мин';
 const hours=Math.floor(minutes/60),rest=minutes%60;
 return rest?hours+' ч '+rest+' мин':hours+' ч';
}
const commerce=/(?:^|\s)(?:cafe|café|coffee|restaurant|cafeteria|pub|bar|sushi|ramen|hotel|hostel|school|кафе|кофейня|ресторан|суши|отель|гостиница|школа)(?:\s|$)/iu;
const landmark=/(museum|gallery|statue|memorial|monument|palace|cathedral|church|temple|shrine|park|garden|tower|castle|historic|bridge|theat[er]+|sculpture|waterfall|beach|mountain|tomb|arch\b|clock|музей|галере|памятник|мемориал|дворец|собор|церковь|храм|парк|сад\b|башн|замок|историческ|мост|театр|скульптур|водопад|пляж|гора|часов)/iu;
const allowed=new Set(['quarter','neighbourhood','hot_spring','attraction','museum','gallery','viewpoint','artwork','memorial','monument','castle','ruins','archaeological_site','wayside_cross','wayside_shrine','city_gate','building','fort','park','garden','nature_reserve','place_of_worship','tower','peak','beach','waterfall','theme_park','zoo','aquarium']);
export function isAttraction(p){
 if(p.isCity)return false;
 if(/^(restaurant|cafe|fast_food|food_court|marketplace|supermarket|shop|retail)$/.test(p.category||'')||/Еда и рынки/.test(p.guideCategory||''))return false;
 if(commerce.test([p.name,p.category,p.kind].join(' ')))return false;
 if(p.metadataOrigin&&allowed.has(p.category))return true;
 if(p.wiki){return p.geoType==='landmark'||landmark.test(p.name+' '+p.desc+' '+(p.kind||''));}
 if(p.category)return allowed.has(p.category);
 return !commerce.test(p.name+' '+(p.desc||''));
}
// Discovery is stricter than explicit search or the user's saved itinerary.
export function isDiscoveryPlace(p){
 if(p.recommended||p.metadataOrigin)return isAttraction(p);
 if(!isAttraction(p)||!p.wikidata||!p.wiki||!p.img)return false;
 if(!hasRecommendationCopy(p))return false;
 if(/station|railway|metro|school|university|cemetery|defunct|demolished|станци|метро|кладбищ/i.test([p.name,p.kind].join(' ')))return false;
 return String(p.desc||p.discoveryDesc||'').length>=60||String(p.kind||'').length>=30;
}
function fromPhoton(f){const p=f.properties;const country=russianCountry(p.countrycode,p.country);return {id:'osm:'+p.osm_type+':'+p.osm_id,name:p.name||p.city,lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],category:p.osm_value,city:russianOnly(p.city),country,address:[p.street,p.housenumber,p.city].filter(hasCyrillic).concat(country).filter(Boolean).join(', '),isCity:['city','town','village'].includes(p.osm_value),extent:p.extent};}
export function mergePlaces(items){
 const result=[],byId=new Map(),byWiki=new Map(),byName=new Map();
 for(const item of items){const p=libraryPlace(item);const id=placeId(p),name=normalizePlaceText(p.name);const previous=byId.get(id)||(p.wikidata&&byWiki.get(p.wikidata))||(byName.get(name)||[]).find(x=>Math.hypot(x.lat-p.lat,x.lng-p.lng)<.002);
 if(previous)Object.assign(previous,{...p,...previous,img:previous.img||p.img,desc:previous.desc||p.desc});
 else{result.push(p);if(!byName.has(name))byName.set(name,[]);byName.get(name).push(p);}
 const merged=previous||p;byId.set(id,merged);if(p.wikidata)byWiki.set(p.wikidata,merged);
 }return result;
}

export async function searchWorld(query,signal,context){
 const lang=/[а-яё]/i.test(query)?'ru':'en';
 // Photon rejects unsupported languages, so Russian queries use its default local names.
 const photonParams=new URLSearchParams({q:query,limit:'16',lang:lang==='en'?'en':'default'});
 if(Number.isFinite(context?.lat)){photonParams.set('lat',context.lat);photonParams.set('lon',context.lng);photonParams.set('location_bias_scale','0.3');}
 const results=await Promise.allSettled([
  fetchPlaceJson('https://photon.komoot.io/api/?'+photonParams,signal),
  fetchPlaceJson('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:query,count:'5',language:'ru'}),signal),
  wikiPlaces('ru',{generator:'search',gsrsearch:query,gsrnamespace:'0',gsrlimit:'12'},signal)
 ]);
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 if(results.every(x=>x.status==='rejected'))throw Error('Не удалось выполнить поиск');
 const value=i=>results[i].status==='fulfilled'?results[i].value:null;
 const cities=(value(1)?.results||[]).filter(p=>/^PPL/.test(p.feature_code||'')&&hasCyrillic(p.name)).map(p=>({id:'city:'+p.id,name:p.name,lat:p.latitude,lng:p.longitude,city:p.name,country:p.country,address:[p.admin1,p.country].filter(Boolean).join(', '),isCity:true,population:p.population||0}));
 const wiki=(value(2)||[]).map(p=>{const city=cities.find(c=>normalizePlaceText(c.name)===normalizePlaceText(p.name)&&Math.hypot(c.lat-p.lat,c.lng-p.lng)<.1);return city?{...p,...city}:p;}).filter(p=>hasCyrillic(p.name)&&(p.isCity||isAttraction(p)));
 const photon=(value(0)?.features||[]).map(fromPhoton).filter(p=>hasCyrillic(p.name)&&(p.isCity||isAttraction(p)));
 const q=normalizePlaceText(query),tokens=q.split(' ');
 const score=p=>{const name=normalizePlaceText(p.name),nameTokens=name.split(' '),matched=tokens.filter(t=>name.includes(t)).length,overlap=matched/tokens.length,precision=matched/Math.max(1,nameTokens.length);const distance=context?Math.hypot((p.lat-context.lat),(p.lng-context.lng)*Math.cos(p.lat*Math.PI/180)):0;return (name===q?100:overlap*60+Math.min(1,precision)*30)+(p.wiki&&!p.isCity?45:0)+(p.isCity?Math.min(8,Math.log10(1+(p.population||0))):8)-Math.min(10,distance/10);};
 return mergePlaces([...wiki,...photon,...cities]).sort((a,b)=>score(b)-score(a)).slice(0,12);
}
async function photonArea(lat,lng,radius,signal){
 const params=new URLSearchParams({lat:String(lat),lon:String(lng),radius:String(radius),limit:'30'});
 ['tourism:attraction','tourism:museum','tourism:gallery','tourism:viewpoint','tourism:artwork','historic','amenity:place_of_worship','leisure:park','leisure:garden','natural:peak','natural:waterfall'].forEach(tag=>params.append('osm_tag',tag));
 const data=await fetchPlaceJson('https://photon.komoot.io/reverse?'+params,signal);return (data.features||[]).map(fromPhoton).filter(isAttraction);
}
export async function placesInBounds(b,signal,onUpdate=()=>{}){
 const local=()=>libraryPlaces().filter(p=>inBounds(p,b)&&isAttraction(p));
 const publish=items=>{const list=mergePlaces([...local(),...items]).filter(p=>inBounds(p,b)).slice(0,120);if(!signal?.aborted)onUpdate(list);return list;};
 publish([]);
 if(b.zoom<5)return publish([]);
 const key=[b.south,b.west,b.north,b.east].map(v=>v.toFixed(3)).join(',');
 if(cache.has(key))return publish(cache.get(key));
 const parameters={generator:'geosearch',ggsbbox:[b.north,b.west,b.south,b.east].join('|'),ggslimit:'40',ggsnamespace:'0',ggsprop:'type'};
 const results=await Promise.allSettled(['ru','en'].map(async lang=>{
  let items=await wikiPlaces(lang,parameters,signal);
  items=await russianPlaces(items,signal);
  const accepted=registerPlaces(items.filter(isDiscoveryPlace));publish(accepted);return accepted;
 }));
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 if(results.every(x=>x.status==='rejected')&&!local().length)throw Error('Не удалось загрузить места');
 const list=publish(results.flatMap(x=>x.status==='fulfilled'?x.value:[]));
 if(cache.size>40)cache.delete(cache.keys().next().value);cache.set(key,list);return list;
}
