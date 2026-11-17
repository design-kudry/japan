import {libraryPlace,libraryPlaces} from './place-library.js';
import {PlaceCardSkeleton} from './place-loading.jsx';
import TripSegmentedControl from './trip-segmented-control.jsx';
import {curatedCatalog} from './place-catalog.js';
import {useState,useEffect,useMemo,useRef,Fragment} from 'react';
import {Button,Icon,Modal,TextInput,Select,Checkbox,Radio} from '@gravity-ui/uikit';
import {ChevronLeft,ChevronRight,ChevronDown,Heart,Magnifier,ArrowUpArrowDown,Xmark,MapPin} from '@gravity-ui/icons';
import {PlaceSearchTrigger,RoutePlaceSearch,animateSearch} from './route-place-search.jsx';
import {PlaceTile,PlaceDetail,PlacesMap} from './travel-pages.jsx';
import {canonicalCountry,countryMatches} from './country-places.js';
import {cityKey,countryOptions,worldDirections,discoverCities,cityPlaces,resolveCity,ticketFilter,seedPlaces} from './add-place-data.js';
import {enrichPlaces,enrichPhotos} from './place-enrichment.js';
import {PLACE_TYPES,placeType} from './place-filters.js';
import {placeId,mergePlaces} from './world-places.js';

export default function AddPlaceCatalog({tripCities=[],days,current,saved,onSave,onSchedule,onRemove,onClose,MapComponent,loadMap,embedded=false,onOpenPlace}){
 const initial=[...new Set(tripCities.map(c=>canonicalCountry(c.country)).filter(Boolean))];
 const [countries,setCountries]=useState(initial),[city,setCity]=useState(null),[favorites,setFavorites]=useState(false),[picker,setPicker]=useState(false),[draft,setDraft]=useState([]),[countryQuery,setCountryQuery]=useState(''),[type,setType]=useState(''),[cost,setCost]=useState(''),[sort,setSort]=useState(false),[query,setQuery]=useState(''),[search,setSearch]=useState(false),[detail,setDetail]=useState(null),[map,setMap]=useState(false),[mapTarget,setMapTarget]=useState(null),[groups,setGroups]=useState([]),[discoveryLoading,setDiscoveryLoading]=useState(false),[discoveryError,setDiscoveryError]=useState(false),[retry,setRetry]=useState(0),[filterSheet,setFilterSheet]=useState(null),[draftFilter,setDraftFilter]=useState(''),[countrySuggestions,setCountrySuggestions]=useState([]),[cityLimit,setCityLimit]=useState(24),[hasMoreCities,setHasMoreCities]=useState(false);
 const loadSentinel=useRef(null),loadLock=useRef(false),groupContext=useRef('');
 const selection=countries.join('|');
 useEffect(()=>{const refresh=()=>setGroups(old=>old.map(g=>({...g,places:mergePlaces([...seedPlaces(g.city),...g.places.map(libraryPlace)])})));window.addEventListener('place-library-updated',refresh);return()=>window.removeEventListener('place-library-updated',refresh);},[]);
 useEffect(()=>{const refresh=()=>setGroups(old=>old.map(g=>({...g,places:g.places.map(p=>{const seed=seedPlaces(g.city).find(s=>s.id===p.id);return seed?.img?{...p,...seed}:p;})})));window.addEventListener('japan-photos-ready',refresh);return()=>window.removeEventListener('japan-photos-ready',refresh);},[]);
 useEffect(()=>{setCityLimit(24);},[selection]);
 useEffect(()=>{
  const request=new AbortController();let active=true;setDiscoveryError(false);setHasMoreCities(false);setDiscoveryLoading(countries.length>0);
  const selected=countries.length?countries.flatMap(country=>{const planned=tripCities.filter(c=>countryMatches(c.country,country));return planned.length?planned:worldDirections.filter(c=>countryMatches(c.country,country));}):worldDirections;
  const unique=[...new Map(selected.map(c=>[cityKey(c),{...c,country:canonicalCountry(c.country)}])).values()];
  const context=selection+'|'+retry;const keep=groupContext.current===context;groupContext.current=context;
  setGroups(old=>keep?old:unique.map(c=>({city:c,places:seedPlaces(c),loading:true,error:false})));
  const update=(c,patch)=>{if(active)setGroups(old=>old.map(g=>cityKey(g.city)===cityKey(c)?{...g,...patch}:g));};
  async function load(c){const seeds=seedPlaces(c);if(seeds.length){update(c,{places:seeds,loading:false,error:false});if(!countryMatches(c.country,'Япония'))enrichPhotos(seeds,(p,photo)=>{Object.assign(p,photo);update(c,{places:[...seeds]});}).catch(()=>{});return;}try{const center=await resolveCity(c,request.signal);update(c,{city:center});const places=await cityPlaces(center,request.signal,places=>update(c,{places,loading:false,error:false}));update(c,{places,loading:false,error:false});enrichPlaces(places.slice(0,12),request.signal,patches=>update(c,{places:places.map(p=>p.metadataOrigin?{...patches[placeId(p)],...p,img:p.img||patches[placeId(p)]?.img}:{...p,...patches[placeId(p)]})})).catch(()=>{});}catch(e){if(e.name!=='AbortError')update(c,{loading:false,error:true});}}
  async function queue(items){let index=0;await Promise.all(Array.from({length:Math.min(3,items.length)},async()=>{while(index<items.length&&!request.signal.aborted)await load(items[index++]);}));}
  queue(unique);
  if(countries.length)Promise.allSettled(countries.map(async country=>{
   for(const expand of [false,true]){const others=await discoverCities(country,request.signal,expand);if(!active)return;
   const candidates=others.filter(c=>!unique.some(x=>cityKey(x)===cityKey(c)));if(expand&&candidates.length>cityLimit)setHasMoreCities(true);const extra=expand?candidates.slice(0,cityLimit):candidates;unique.push(...extra);setGroups(old=>[...old,...extra.filter(c=>!old.some(g=>cityKey(g.city)===cityKey(c))).map(c=>({city:c,places:seedPlaces(c),loading:true,error:false}))]);await queue(extra);}

  })).then(results=>{if(active){setDiscoveryLoading(false);if(results.some(r=>r.status==='rejected'&&r.reason?.name!=='AbortError'))setDiscoveryError(true);}});
  return()=>{active=false;request.abort();};
 },[selection,retry,cityLimit]);
 useEffect(()=>{
  const node=loadSentinel.current;if(!node||!hasMoreCities||discoveryLoading||city||favorites||discoveryError)return;
  loadLock.current=false;const root=embedded?null:node.closest('.add-catalog');
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!loadLock.current){loadLock.current=true;setCityLimit(v=>v+24);}},{root,rootMargin:'400px'});
  observer.observe(node);return()=>observer.disconnect();
 },[embedded,hasMoreCities,discoveryLoading,city,favorites,discoveryError,cityLimit]);
 const all=mergePlaces(groups.flatMap(g=>g.places));
 const filter=p=>(!type||placeType(p)===type)&&ticketFilter(p,cost);
 const display=useMemo(()=>{
  if(favorites){const list=saved.filter(filter);if(city)return [{city,places:list.filter(p=>p.city===city.name),loading:false}];return [{city:{name:'Хочу посетить',country:''},places:list,loading:false}];}
  let list=city?groups.filter(g=>cityKey(g.city)===cityKey(city)):groups;
  if(!countries.length&&!city){const byCountry=new Map();for(const p of mergePlaces([...libraryPlaces(),...countrySuggestions,...groups.flatMap(g=>g.places)])){if(!p.country)continue;let group=byCountry.get(p.country);if(!group){group={city:{name:p.country,country:p.country,isCountry:true},places:[],loading:false};byCountry.set(p.country,group);}group.places.push(p);}list=[...byCountry.values()];}

  return sort?[...list].sort((a,b)=>a.city.name.localeCompare(b.city.name,'ru')):list;
 },[groups,city,favorites,saved,type,cost,sort,selection,countrySuggestions]);
 function openPlace(p){if(onOpenPlace)onOpenPlace(p);else setDetail(p);}
 function back(){if(city)setCity(null);else if(favorites)setFavorites(false);else onClose();}
 function countryPicker(){setDraft(countries);setCountryQuery('');setPicker(true);}
 function openCity(c){setCity(c);}
 const Wrapper=embedded?Fragment:Modal;
 return <Wrapper {...(embedded?{}:{open:true,className:'gravity-editor-modal add-catalog-modal',disableTransition:true,onOpenChange:v=>{if(!v)onClose();},'aria-label':'Добавить место'})}><section className={embedded?'travel-page places-page add-catalog places-catalog':'add-catalog'}>
  <header className="add-catalog-header" inert={search?'':undefined}>
  {embedded&&<><div className="places-heading"><h1>Места</h1></div><TripSegmentedControl value={favorites?'saved':'all'} onUpdate={v=>{setFavorites(v==='saved');setCity(null);}} options={[{value:'all',content:'Все места'},{value:'saved',content:'Хочу посетить'}]}/></>}
  <div className="add-catalog-toolbar">{(!embedded||city)&&<Button view="outlined" size="xl" aria-label="Назад" onClick={back}><Icon data={ChevronLeft} size={20}/></Button>}<PlaceSearchTrigger value={query} onClick={()=>animateSearch(()=>setSearch(true))}/>{!embedded&&<Button view="outlined" size="xl" selected={favorites} aria-label="Хочу посетить" onClick={()=>{setFavorites(v=>!v);setCity(null);}}><Icon data={Heart} size={20}/></Button>}</div>
  <div className="add-catalog-chips"><Button view="normal" size="l" aria-label="Сортировать города по алфавиту" selected={sort} onClick={()=>setSort(v=>!v)}><Icon data={ArrowUpArrowDown} size={16}/></Button>
   {!city&&<div className="add-country-chip"><Button view="normal" size="l" onClick={countryPicker}>{countries.length===1?countries[0]:countries.length?'Страны ('+countries.length+')':'Страна'}{!countries.length&&<Icon data={ChevronDown} size={16}/>}</Button>{countries.length>0&&<Button view="normal" size="l" aria-label="Сбросить страны" onClick={()=>{setCountrySuggestions(mergePlaces([...countrySuggestions,...groups.flatMap(g=>g.places)]));setCity(null);setCountries([]);}}><Icon data={Xmark} size={16}/></Button>}</div>}
   {[['type','Чем заняться',type,PLACE_TYPES],['cost','Стоимость',cost,[{value:'free',content:'Бесплатно'},{value:'paid',content:'Платно'}]]].map(([key,label,value,options])=><div className="add-country-chip" key={key}><Button view="normal" size="l" aria-label={label} onClick={()=>{setDraftFilter(value);setFilterSheet(key);}}>{options.find(o=>o.value===value)?.content||label}{!value&&<Icon data={ChevronDown} size={16}/>}</Button>{value&&<Button view="normal" size="l" aria-label={'Сбросить фильтр «'+label+'»'} onClick={()=>{(key==='type'?setType:setCost)('');}}><Icon data={Xmark} size={16}/></Button>}</div>)}
  </div></header>
  <main className="add-catalog-content" aria-busy={discoveryLoading||groups.some(g=>g.loading)||undefined}>
   {!!countries.length&&!groups.length&&!favorites&&(discoveryLoading?<div className="add-city-section" role="status" aria-label="Загружаем места"><div className="add-city-carousel"><div><PlaceCardSkeleton/></div><div><PlaceCardSkeleton/></div></div></div>:<p>{discoveryError?'Не удалось загрузить список городов. Попробуйте ещё раз.':'В справочнике пока нет городов этой страны. Найдите город через поиск.'}{discoveryError&&<Button view="flat" onClick={()=>setRetry(v=>v+1)}>Повторить</Button>}</p>)}
   {!discoveryLoading&&display.length>0&&display.every(g=>!g.loading&&!g.error&&!g.places.some(filter))&&<p className="trip-empty-day">Нет мест по выбранным фильтрам</p>}
   {display.map(g=>{const items=g.places.filter(filter);if(!items.length&&!g.loading&&!g.error&&!city&&!favorites)return null;return <section className="add-city-section" key={cityKey(g.city)}><Button className="add-city-heading" view="flat" onClick={()=>{if(!city&&!favorites){if(g.city.isCountry)setCountries([g.city.country]);else openCity(g.city);}}} disabled={!!city||favorites}><span>{g.city.name}</span>{!city&&!favorites&&<Icon data={ChevronRight} size={20}/>}</Button>
    {g.error&&!items.length&&<p role="alert">Не удалось загрузить места. <Button view="flat" onClick={()=>setRetry(v=>v+1)}>Повторить</Button></p>}
    {!g.loading&&!g.error&&!items.length&&<p className="trip-empty-day">{favorites?'Вы пока ничего не добавили':'Места по выбранным фильтрам не найдены'}</p>}
    <div className={city||favorites?'add-city-grid':'add-city-carousel'} aria-label={'Места: '+g.city.name} tabIndex={city||favorites?undefined:0} aria-busy={g.loading||undefined}>{items.map(p=><div key={placeId(p)}><PlaceTile place={p} saved={saved.some(s=>placeId(s)===placeId(p))} onSave={onSave} onOpen={openPlace}/></div>)}{g.loading&&<><div><PlaceCardSkeleton/></div><div><PlaceCardSkeleton/></div></>}</div>
   </section>;})}
   {hasMoreCities&&!city&&!favorites&&<div ref={loadSentinel} className="catalog-load-sentinel" aria-hidden="true"/>}{discoveryLoading&&groups.length>0&&!groups.some(g=>g.loading)&&<div className="add-city-section" role="status" aria-label="Загружаем места"><div className="add-city-carousel"><div><PlaceCardSkeleton/></div><div><PlaceCardSkeleton/></div></div></div>}
   <details className="places-source"><summary>Источники данных</summary><a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames · CC BY 4.0</a></details>
  </main>
  <Button className={embedded?"places-map-button":"add-catalog-map"} view="action" size="xl" onClick={()=>{setMapTarget(null);setMap(true);}}><Icon data={MapPin} size={20}/>Карта</Button>
  {filterSheet&&<Modal open className="add-country-modal" disableTransition onOpenChange={v=>{if(!v)setFilterSheet(null);}} aria-label={filterSheet==='type'?'Чем заняться':'Стоимость'}><section className="add-country-sheet"><header><h2>{filterSheet==='type'?'Чем заняться':'Стоимость'}</h2><Button view="flat" onClick={()=>setFilterSheet(null)}>Отмена</Button></header><div className="add-country-list">{[{value:'',content:'Все'},...(filterSheet==='type'?PLACE_TYPES:[{value:'free',content:'Бесплатно'},{value:'paid',content:'Платно'}])].map(o=><Radio key={o.value} value={o.value} checked={draftFilter===o.value} onUpdate={()=>setDraftFilter(o.value)}>{o.content}</Radio>)}</div><Button view="action" size="xl" width="max" onClick={()=>{(filterSheet==='type'?setType:setCost)(draftFilter);setFilterSheet(null);}}>Применить</Button></section></Modal>}
  {picker&&<Modal open className="add-country-modal" disableTransition onOpenChange={v=>{if(!v)setPicker(false);}} aria-label="Страны"><section className="add-country-sheet"><header><h2>Страны</h2><Button view="flat" onClick={()=>setPicker(false)}>Отмена</Button></header><TextInput size="xl" startContent={<Icon data={Magnifier} size={16}/>} placeholder="Найти страну" value={countryQuery} onUpdate={setCountryQuery}/><div className="add-country-list">{countryOptions.filter(c=>c.content.toLowerCase().includes(countryQuery.toLowerCase())).map(c=><Checkbox key={c.value} size="l" checked={draft.includes(c.value)} onUpdate={checked=>setDraft(old=>checked?[...old,c.value]:old.filter(v=>v!==c.value))}>{c.content}</Checkbox>)}</div><Button view="action" size="xl" width="max" onClick={()=>{setCountries(draft);setCity(null);setPicker(false);}}>Применить</Button></section></Modal>}
  {search&&<RoutePlaceSearch initialQuery={query} places={all} onQueryChange={setQuery} onClose={()=>animateSearch(()=>setSearch(false))} onChoose={p=>{setSearch(false);setQuery('');if(p.isCity){setMapTarget(p);setMap(true);}else openPlace(p);}}/>}
  {map&&<PlacesMap places={city?display.flatMap(g=>g.places):all} saved={saved} onSave={onSave} onOpen={openPlace} onClose={()=>setMap(false)} MapComponent={MapComponent} loadMap={loadMap} fallbackCity={mapTarget||city||groups[0]?.city||tripCities[0]} initialPlaces={mapTarget?[mapTarget]:[]} />}
  {detail&&<PlaceDetail place={detail} days={days} initialDate={current} saved={saved.some(p=>placeId(p)===placeId(detail))} onSave={onSave} onSchedule={onSchedule} onRemove={onRemove} onClose={()=>setDetail(null)}/>}
 </section></Wrapper>;
}
