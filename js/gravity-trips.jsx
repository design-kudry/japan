import {dayRouteFeatures} from './route-map-data.js';
import {placeWithDetails} from './place-identity.js';
import {renderMapPlaceMarker} from './map-place-marker.js';
import TransportFlow,{BookingCards} from './transport.jsx';
import {segmentDay} from './transport-data.js';
import {libraryPlace,libraryPlaces,inBounds} from './place-library.js';
import {curatedCatalog} from './place-catalog.js';
import {PlacePhoto} from './place-loading.jsx';
import {japanCatalog,japanExcluded} from './japan-catalog.js';
window.JapanPlaces={places:japanCatalog,excluded:japanExcluded};
window.CuratedPlaces=curatedCatalog;
window.resolveLibraryPlace=libraryPlace;
import AddPlaceCatalog from './add-place-catalog.jsx';
import {enrichPhotos,enrichPlaces} from './place-enrichment.js';
import {hasCyrillic} from './russian.js';
import {beginSort} from './sortable.js';
import {placeRouteMeta} from './place-meta.js';
import {RoutePlaceSearch,RoutePlacePreview,PlaceSearchTrigger,animateSearch} from './route-place-search.jsx';
import {placeId,placesInBounds,mergePlaces,routeDurationMinutes,formatRouteDuration} from './world-places.js';
import TripSegmentedControl from './trip-segmented-control.jsx';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal, flushSync} from 'react-dom';
import {Button, Card, DropdownMenu, Icon, Modal, Text, TextInput, SegmentedRadioGroup, ThemeProvider, configure} from '@gravity-ui/uikit';
import {RangeDatePicker} from '@gravity-ui/date-components';
import {settings} from '@gravity-ui/date-utils';
import {ArrowDown, ArrowShapeTurnUpRight, ArrowUp, ChevronsExpandUpRight, ChevronDown, ChevronLeft, ChevronUp, Car, Grip, Heart, House, Magnifier, MapPin, PaperPlane, Pencil, PlanetEarth, Plus, FileText, Gear, Tag, TrashBin, Xmark} from '@gravity-ui/icons';
import '@gravity-ui/uikit/styles/styles.css';
import '../css/gravity-trips.css';
import TripExpenses from './trip-expenses.jsx';
import FloatingAction from './floating-action.jsx';
import {PlacesView,PlaceDetail,PlacesMap,Notes} from './travel-pages.jsx';

maplibregl.setWorkerUrl('/js/maplibre-worker.mjs');
configure({lang: 'ru'});
settings.loadLocale('ru');
const MAP_STYLE_URL='https://tiles.openfreemap.org/styles/positron';
let mapStyleCache=null;
function loadMapStyle(){if(mapStyleCache)return mapStyleCache;mapStyleCache=fetch(MAP_STYLE_URL).then(r=>{if(!r.ok)throw Error('style');return r.json();}).catch(()=>{mapStyleCache=null;return MAP_STYLE_URL;});return mapStyleCache;}
loadMapStyle();
// Fixed controls follow the visible viewport, including mobile browser chrome.
function syncVisibleViewport() {
  const v=window.visualViewport, root=document.documentElement;
  if(v && Math.abs(v.scale-1)>.05) return;
  root.style.setProperty('--travel-visible-height',(v?.height || window.innerHeight)+'px');
  root.style.setProperty('--travel-visible-bottom',Math.max(0,root.clientHeight-(v?.height || window.innerHeight)-(v?.offsetTop || 0))+'px');
}
syncVisibleViewport();
window.addEventListener('resize',syncVisibleViewport);
window.visualViewport?.addEventListener('resize',syncVisibleViewport);
window.visualViewport?.addEventListener('scroll',syncVisibleViewport);


function IconButton({icon, label, iconSize=16, ...props}) {
  return <Button size="l" view="flat" aria-label={label} {...props}>
    <Icon data={icon} size={iconSize} />
  </Button>;
}

function Header({title, back, children}) {
  return <header className="gravity-header">
    {back && <IconButton icon={ChevronLeft} label="Назад" href={back} />}
    <Text as="h1" variant="header-2">{title}</Text>
    {children && <div className="gravity-header-action">{children}</div>}
  </header>;
}

function Photo({src}) {
  return <PlacePhoto className="gravity-photo" src={src}/>;
}

function sortHandlers(selector,from,move) {
  return {
    onPointerDown:event => beginSort(event,{rows:() => [...event.currentTarget.closest(selector).parentElement.querySelectorAll(selector)],from,commit:move,flush:run => flushSync(run)}),
    onKeyDown(event){if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();move(from,from+(event.key==='ArrowUp' ? -1 : 1));}},
    onClick:event => event.preventDefault(),
  };
}
window.travelSortable=beginSort;

function SheetHandle({label,direction,onAction,onSwipe}) {
  const start = useRef(null);
  const swiped = useRef(false);
  function reset() {
    if (start.current?.panel) start.current.panel.style.translate='';
    start.current=null;
  }
  return <button type="button" className="gravity-sheet-drag" aria-label={label}
    onPointerDown={event => {
      swiped.current=false;
      start.current={y:event.clientY,panel:event.currentTarget.closest('.gravity-editor-sheet') || event.currentTarget.closest('.g-modal__content')};
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      if (!start.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const delta=event.clientY-start.current.y;
      const offset=onSwipe ? delta : direction*Math.max(0,direction*delta);
      start.current.panel.style.translate='0 '+offset+'px';
    }}
    onPointerUp={event => {
      if (!start.current) return;
      const delta=event.clientY-start.current.y;
      reset();
      if (onSwipe && Math.abs(delta)>32) {swiped.current=true;onSwipe(Math.sign(delta));}
      else if (!onSwipe && direction*delta>32) onAction();
    }}
    onPointerCancel={reset}
    onClick={event => {if (event.detail===0 || (onSwipe && !swiped.current)) onAction();}}><span/></button>;
}

function TripSwitcher({open, onOpenChange, trips, current}) {
  return <Modal open={open} onOpenChange={onOpenChange} className="gravity-trip-modal" contentOverflow="auto" disableTransition disableHeightTransition aria-label="Сменить поездку">
    <div className="gravity-trip-sheet">
      <SheetHandle label="Свернуть список поездок" direction={1} onAction={() => onOpenChange(false)}/>
      <div className="gravity-list">
        {trips.map(trip => <a className="gravity-trip-link" key={trip.href} href={trip.href}
          aria-current={trip.href === current ? 'true' : undefined} onClick={event => {
            if (trip.href === current) event.preventDefault();
            onOpenChange(false);
          }}>
          <RouteCard title={trip.title} detail={trip.date} thumbnail={<Photo src={trip.img} />}/>
        </a>)}
      </div>
      <Button className="gravity-trip-add" href="#new" size="xl" width="max" onClick={() => onOpenChange(false)}>
        <Icon data={Plus} size={16} />Добавить поездку
      </Button>
    </div>
  </Modal>;
}

function ShareTrip({title, href}) {
  const [feedback, setFeedback] = useState('');
  const [manual, setManual] = useState(false);
  const url = new URL(href, window.location.href).href;

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({title, url});
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('Ссылка скопирована');
    } catch {
      setManual(true);
    }
  }

  return <div className="gravity-trip-share">
    <IconButton icon={ArrowShapeTurnUpRight} label="Поделиться" onClick={share}/>
    <span className="gravity-share-status" role="status">{feedback}</span>
    <Modal open={manual} onOpenChange={setManual} aria-label="Поделиться поездкой">
      <div className="gravity-share-dialog">
        <div className="gravity-sheet-top">
          <Text as="h2" variant="subheader-3">Ссылка на поездку</Text>
          <IconButton icon={Xmark} label="Закрыть" onClick={() => setManual(false)}/>
        </div>
        <TextInput value={url} readOnly controlProps={{'aria-label':'Ссылка на поездку'}} onFocus={event => event.target.select()}/>
      </div>
    </Modal>
  </div>;
}

const cityLabel = city => city.name + ', ' + city.country;
const cityKey = city => cityLabel(city).toLocaleLowerCase('ru');

function CitySearch({local, remote, onSelect}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const term = query.trim();
    if (term.split(',')[0].length < 2) return;
    const initial = local(term);
    const request = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const found = await remote(term, request.signal);
        if (request.signal.aborted) return;
        const merged = [...new Map([...initial, ...found].map(city => [cityKey(city), city])).values()].slice(0,10);
        setResults(merged);
        setActive(-1);
      } catch {
        // The local matches remain available if remote search fails.
      }
    }, 250);
    return () => {clearTimeout(timer); request.abort();};
  }, [query, local, remote]);

  function update(value) {
    setQuery(value);
    setActive(-1);
    const enough = value.trim().split(',')[0].length >= 2;
    const matches = enough ? local(value) : [];
    setResults(matches);
  }

  return <div className="gravity-city-search">
    <TextInput size="xl" value={query} onUpdate={update} autoFocus placeholder="Город" controlProps={{
      role:'combobox', 'aria-label':'Город', 'aria-expanded':Boolean(results.length),
      'aria-controls':'gravity-city-options', 'aria-autocomplete':'list',
      'aria-activedescendant':active >= 0 ? 'gravity-city-'+active : undefined,
      autoComplete:'off',
    }} onKeyDown={event => {
      if (event.key === 'Escape') {update(''); return;}
      if (event.key === 'Enter') {
        event.preventDefault();
        if (results.length) onSelect(results[Math.max(0,active)]);
      }
      if (results.length && ['ArrowDown','ArrowUp'].includes(event.key)) {
        event.preventDefault();
        const next = active < 0 ? (event.key === 'ArrowDown' ? 0 : results.length-1)
          : (active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        setActive(next);
        document.getElementById('gravity-city-'+next)?.scrollIntoView({block:'nearest'});
      }
    }} />
    {results.length > 0 && <Card view="outlined" className="gravity-suggestions" id="gravity-city-options" role="listbox" aria-label="Подходящие города">
      {results.map((city,i) => <button key={cityKey(city)} type="button" id={'gravity-city-'+i} role="option" aria-selected={i === active} onClick={() => onSelect(city)}>
        {cityLabel(city)}{city.region && <Text variant="body-1" color="secondary"> · {city.region}</Text>}
      </button>)}
    </Card>}
  </div>;
}

function NewTrip({local, remote, save}) {
  const [range, setRange] = useState(null);
  const [mode,setMode]=useState('dates');
  const [dayCount,setDayCount]=useState('');
  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState(true);
  const [error, setError] = useState('');

  function move(from,to) {
    if (from < 0 || to < 0 || from >= cities.length || to >= cities.length || from === to) return;
    const next = [...cities];
    next.splice(to,0,next.splice(from,1)[0]);
    setCities(next);
  }

  return <form className="gravity-flow gravity-new" onSubmit={event => {
    event.preventDefault();
    if(mode==='days'){if(!/^\d+$/.test(dayCount)||Number(dayCount)<1||Number(dayCount)>366){setError('Укажите от 1 до 366 дней');return;}setError(save({dateMode:'days',dayCount:Number(dayCount),start:'',end:'',cities})||'');return;}
    if (!range?.start?.isValid() || !range?.end?.isValid()) {setError('Укажите даты поездки');return;}
    setError(save({start:range.start.format('YYYY-MM-DD'),end:range.end.format('YYYY-MM-DD'),cities}) || '');
  }}>
    <Header title="Новая поездка" back="#trips" />
    <div className="gravity-new-fields">
      <TripSegmentedControl className="trip-date-mode" size="l" width="max" value={mode} onUpdate={v=>{setMode(v);setError('');}} options={[{value:'dates',content:'Точные даты'},{value:'days',content:'Количество дней'}]}/>
      {mode==='days' ? <TextInput size="xl" type="text" value={dayCount} onUpdate={setDayCount} placeholder="Дни" controlProps={{inputMode:'numeric',pattern:'[0-9]*','aria-label':'Количество дней'}}/> : <RangeDatePicker size="xl" format="DD.MM.YYYY" value={range} onUpdate={setRange}
        disableFocusTrap aria-label="Даты поездки" />}
      <div className="gravity-destinations">
        {cities.map((city,index) => <div key={cityKey(city)} className="gravity-city-row" data-sort-index={index}>
          {cities.length>1 && <button type="button" className="gravity-grip sort-handle" aria-label={'Переместить '+city.name}
            {...sortHandlers('.gravity-city-row',index,move)}><Icon data={Grip} size={20}/></button>}

          <TextInput className="gravity-selected-city" size="xl" value={cityLabel(city)} readOnly controlProps={{'aria-label':cityLabel(city)}} />
          {cities.length > 1 && <IconButton icon={TrashBin} label={'Убрать '+city.name} onClick={() => {
            setCities(cities.filter((_,i) => i !== index));
          }} />}
        </div>)}
        {search ? <CitySearch local={local} remote={remote} onSelect={city => {
          if (cities.some(item => cityKey(item) === cityKey(city))) {setError('Этот город уже добавлен');return;}
          setCities([...cities,city]);setSearch(false);setError('');
        }} /> : <Button size="l" view="outlined" width="max" onClick={() => {setSearch(true);setError('');}}>
          <Icon data={Plus} size={16} />Добавить город
        </Button>}
      </div>
    </div>
    {error && <Text as="p" color="danger" role="alert">{error}</Text>}
    {<div className="gravity-submit"><Button type="submit" size="xl" view="action" width="max" disabled={!cities.length}>Добавить</Button></div>}
  </form>;
}

function RouteMap({day,dayIndex,loadMap,onExpand,onPlace}) {
  const target=useRef(null),[visible,setVisible]=useState(false);
  const points=day.places.filter(place=>Number.isFinite(place.lat)&&Number.isFinite(place.lng));
  const pins=[...points,...day.stays.filter(place=>Number.isFinite(place.lat)&&Number.isFinite(place.lng))];
  useEffect(()=>{if(!target.current)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'120px'});observer.observe(target.current);return()=>observer.disconnect();},[!!points.length]);
  if(!points.length)return null;
  const point=place=>place.lat+','+place.lng;
  const params=new URLSearchParams({api:'1',origin:point(points[0]),destination:point(points.at(-1)),travelmode:'walking'});
  if(points.length>2)params.set('waypoints',points.slice(1,-1).slice(0,8).map(point).join('|'));
  const maps=points.length===1?'https://www.google.com/maps/search/?api=1&query='+point(points[0]):'https://www.google.com/maps/dir/?'+params;
  return <Card view="outlined" className="gravity-map">
    <div ref={target} className="gravity-mini-map" aria-label="Карта маршрута">
      {visible&&<EditorMap compact day={day} places={pins} routePlaces={points} routeDays={[{...day,colorIndex:dayIndex}]} initialPlaces={points} loadMap={loadMap} onSelect={onPlace}/>}
    </div>
    <div className="gravity-map-expand"><IconButton icon={ChevronsExpandUpRight} label="Развернуть карту" onClick={onExpand} size="s" view="outlined" /></div>
    <Button className="gravity-map-link" href={maps} target="_blank" rel="noopener" size="s" view="outlined"><Icon data={MapPin} size={12} />Google Maps</Button>
  </Card>;
}

function RouteCard({title, detail, thumbnail, children, transfer, onOpen}) {
  return <Card type={onOpen ? "action" : "container"} view="outlined" className={transfer ? "gravity-row gravity-transfer-card" : "gravity-row"} role={onOpen ? "button" : undefined} tabIndex={onOpen ? 0 : undefined} onClick={onOpen} onKeyDown={event=>{if(onOpen && (event.key==='Enter'||event.key===' ')){event.preventDefault();onOpen();}}}>
    {thumbnail}
    <span className="gravity-place-copy"><Text as="span" variant="subheader-2" className={transfer ? 'gravity-transfer-title' : undefined}>{title}</Text>
      {detail && <Text as="span" variant="body-2" color="secondary">{detail}</Text>}
      {children}
    </span>
  </Card>;
}

function DayCard({item, transfer = false, onOpen}) {
  const [enrichment,setDetails]=useState(null);
  const extra=enrichment?.id===placeId(item)?enrichment.patch:{};
  useEffect(()=>{
    if(transfer||(item.price&&item.hours)||!(item.id?.startsWith?.('osm:')||item.wiki||item.wikidata||(Number.isFinite(item.lat)&&Number.isFinite(item.lng))))return;
    const request=new AbortController();
    enrichPlaces([item],request.signal,patches=>{if(!request.signal.aborted)setDetails({id:placeId(item),patch:patches[placeId(item)]||{}});}).catch(()=>{});
    return()=>request.abort();
  },[transfer,item.id,item.wiki,item.wikidata,item.price,item.hours]);
  const place=transfer?item:placeWithDetails(item,extra);
  const arrival = transfer && item.route.startsWith('Прилёт · ');
  const time = arrival && item.detail?.match(/^\d{1,2}:\d{2}/)?.[0];
  const title = arrival ? 'Прилёт' : transfer ? item.route : place.name;
  const details = arrival ? [time,item.route.slice('Прилёт · '.length)]
    : transfer ? [item.detail,item.cost] : null;
  const thumbnail = transfer
    ? <span className="gravity-photo gravity-placeholder gravity-transport-icon"><Icon data={item.icon === 'plane' ? PaperPlane : MapPin} size={18} /></span>
    : <Photo src={place.img} />;
  // Places always keep the meta line: price, hours, both, or — when unknown.
  const detail = details ? (details.filter(Boolean).join(' · ') || '—') : placeRouteMeta(place);
  return <RouteCard onOpen={onOpen?()=>onOpen(place):undefined} transfer={transfer} title={title} thumbnail={thumbnail} detail={detail}>
    {transfer && item.link && <Button href={item.link} target="_blank" rel="noopener" view="flat" size="s">{item.linkLabel || 'Билеты'}</Button>}
  </RouteCard>;
}

function DayStrip({days,current,onDay}) {
  const strip = useRef(null);
  useEffect(() => {
    const ensureVisible=() => {
      const selected=strip.current?.querySelector('[data-id="'+current+'"]');
      if (!selected) return;
      const area=strip.current.getBoundingClientRect(), chip=selected.getBoundingClientRect();
      if (chip.left<area.left) strip.current.scrollLeft+=chip.left-area.left;
      else if (chip.right>area.right) strip.current.scrollLeft+=chip.right-area.right;
    };
    ensureVisible();
    const observer=new ResizeObserver(ensureVisible);
    observer.observe(strip.current);
    return () => observer.disconnect();
  },[current]);
  return <nav ref={strip} className="days gravity-days" aria-label="Дни поездки">
    {days.map(day => <Button key={day.date} size="l" view={day.date === current ? 'action' : 'normal'}
      selected={day.date === current} data-id={day.date} onClick={() => onDay(day.date)}>
      <Text as="span" variant="body-1">{day.label}</Text>
    </Button>)}
  </nav>;
}

function EditorMap({day,places,loadMap,onSelect,drawRoute=true,focusPlace,onViewport,onMapClick,initialPlaces,routePlaces=places,savedPlaces=[],routeDays=[],compact=false}) {
  const target=useRef(null),mapRef=useRef(null),callbacks=useRef({}),markers=useRef(new Map()),routeLine=useRef(null),declutter=useRef(()=>{}),automatic=useRef(false);
  callbacks.current={onSelect,onViewport,onMapClick};
  const [cityCenter,setCityCenter]=useState(null),[ready,setReady]=useState(0),[failed,setFailed]=useState(false);
  const mapPadding=compact?{top:28,bottom:48,left:36,right:36}:64;
  const startPoints=(initialPlaces||places).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  const startable=startPoints.length>0||!!cityCenter;
  const [started,setStarted]=useState(startable);
  const latest=useRef({});latest.current={startPoints,cityCenter};
  useEffect(()=>{if(startable)setStarted(true);},[startable]);
  useEffect(()=>{const c=day.fallbackCity;if(!c)return;const request=new AbortController();
    if(Number.isFinite(c.lat)&&Number.isFinite(c.lng)){setCityCenter({lat:c.lat,lng:c.lng});return;}
    // Approximate country centers so the map can boot before geocoding finishes.
    const approx={Япония:[35.68,139.76],Japan:[35.68,139.76],'Великобритания':[51.51,-0.13],Britain:[51.51,-0.13],'Соединённое Королевство':[51.51,-0.13],UK:[51.51,-0.13],Франция:[48.86,2.35],France:[48.86,2.35]};
    const guess=approx[c.country]||approx[c.name];
    if(guess)setCityCenter({lat:guess[0],lng:guess[1]});
    fetch('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:c.name,count:'10',language:'ru'}),{signal:request.signal}).then(r=>r.json()).then(d=>{const p=d.results?.find(p=>p.country===c.country)||d.results?.[0];if(p)setCityCenter({lat:p.latitude,lng:p.longitude});}).catch(()=>{});return()=>request.abort();
  },[day.fallbackCity?.name,day.fallbackCity?.country,day.fallbackCity?.lat,day.fallbackCity?.lng]);
  useEffect(()=>{if(!started)return;const initial=latest.current.startPoints,center=initial[0]||latest.current.cityCenter;if(!center)return;
    let active=true,map,resize,userMove;
    const connect=()=>{if(!active){map.remove();return;}mapRef.current=map;setReady(v=>v+1);
      const report=()=>{declutter.current();const b=map.getBounds();if(!automatic.current)callbacks.current.onViewport?.({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast(),zoom:map.getZoom()});automatic.current=false;};
      userMove=()=>{automatic.current=false;};target.current.addEventListener('pointerdown',userMove);target.current.addEventListener('wheel',userMove,{passive:true});
      map.on('moveend',report);map.on('click',e=>{if(e.originalEvent?.target?.closest?.('.constructor-photo-pin,.fallback-photo-marker'))return;callbacks.current.onMapClick?.();});report();
      resize=new ResizeObserver(()=>{if(map.getCanvas)map.resize();else map.invalidateSize({pan:false});declutter.current();});resize.observe(target.current);
    };
    loadMapStyle().then(style=>{if(!active)return;
      try{map=new maplibregl.Map({container:target.current,style,center:[center.lng,center.lat],zoom:13,interactive:!compact,attributionControl:false,fadeDuration:0,maxTileCacheSize:500});if(!compact)map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
        if(initial.length>1){const bounds=new maplibregl.LngLatBounds([initial[0].lng,initial[0].lat],[initial[0].lng,initial[0].lat]);initial.forEach(p=>bounds.extend([p.lng,p.lat]));map.fitBounds(bounds,{padding:mapPadding,maxZoom:15,duration:0});}
        map.on('load',connect);
      }catch{loadMap().then(()=>{if(!active)return;map=window.L.map(target.current,{scrollWheelZoom:!compact,dragging:!compact,touchZoom:!compact,doubleClickZoom:!compact,boxZoom:!compact,keyboard:!compact,zoomControl:false,attributionControl:false});if(!compact)window.L.control.zoom({position:'topright'}).addTo(map);window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);if(initial.length>1)map.fitBounds(initial.map(p=>[p.lat,p.lng]),{paddingTopLeft:compact?[36,28]:[40,40],paddingBottomRight:compact?[36,48]:[40,40],maxZoom:15,animate:false});else map.setView([center.lat,center.lng],13);connect();}).catch(()=>{if(active)setFailed(true);});}
    });
    return()=>{active=false;resize?.disconnect();target.current?.removeEventListener('pointerdown',userMove);target.current?.removeEventListener('wheel',userMove);markers.current.forEach(m=>m.pin.remove());markers.current.clear();routeLine.current=null;map?.remove();mapRef.current=null;};
  },[loadMap,started]);
  const initialViewKey=day.date||startPoints.map(p=>p.lat+','+p.lng).join('|');
  const firstView=useRef(true);
  useEffect(()=>{const m=mapRef.current;if(!m)return;const {startPoints:pts,cityCenter:city}=latest.current;
    const animate=!firstView.current;firstView.current=false;
    if(pts.length>1){
      if(m.getCanvas){const b=new maplibregl.LngLatBounds();pts.forEach(p=>b.extend([p.lng,p.lat]));m.fitBounds(b,{padding:mapPadding,maxZoom:15,duration:animate?500:0});}
      else m.fitBounds(pts.map(p=>[p.lat,p.lng]),{paddingTopLeft:compact?[36,28]:[40,40],paddingBottomRight:compact?[36,48]:[40,40],maxZoom:15,animate});
    }else{const c=pts[0]||city;if(!c)return;
      if(m.getCanvas)m.easeTo({center:[c.lng,c.lat],zoom:13,duration:animate?500:0});else m.setView([c.lat,c.lng],13,{animate});
    }
  },[initialViewKey,ready,cityCenter&&cityCenter.lat+','+cityCenter.lng]);
  declutter.current=()=>{const m=mapRef.current;if(!m)return;const occupied=[],shownMarkers=[],labels=[];
    const ranked=[...markers.current.values()].sort((a,b)=>Number(b.el.dataset.selected==='true')-Number(a.el.dataset.selected==='true')||Number(!b.el.classList.contains('constructor-photo-pin-area'))-Number(!a.el.classList.contains('constructor-photo-pin-area'))||Number(!!b.place.img)-Number(!!a.place.img));
    for(const item of ranked){const {place,el,pin}=item;const point=m.getCanvas?m.project([place.lng,place.lat]):m.latLngToContainerPoint([place.lat,place.lng]);
      const inView=point.x>=-20&&point.y>=-20&&point.x<=target.current.clientWidth+20&&point.y<=target.current.clientHeight+20;
      const onRoute=!el.classList.contains('constructor-photo-pin-area');
      const shown=(drawRoute&&onRoute)||(inView&&(el.dataset.selected==='true'||!occupied.some(p=>Math.hypot(p.x-point.x,p.y-point.y)<46)));
      if(shown){occupied.push(point);shownMarkers.push({el,point});}el.hidden=!shown;const wrapper=m.getCanvas?el:pin.getElement();if(wrapper){wrapper.style.display=shown?'':'none';wrapper.style.zIndex=el.dataset.selected==='true'?'1000':onRoute?'2':'';}
    }
    for(const {el,point} of shownMarkers){const label=el.querySelector('.map-place-label');if(!label)continue;
      const width=label.offsetWidth||120,height=label.offsetHeight||32,box={left:point.x+24,right:point.x+24+width,top:point.y-height/2,bottom:point.y+height/2};
      const overlap=labels.some(b=>box.left<b.right+4&&box.right>b.left-4&&box.top<b.bottom+4&&box.bottom>b.top-4)||occupied.some(p=>p!==point&&p.x+20>box.left&&p.x-20<box.right&&p.y+20>box.top&&p.y-20<box.bottom);
      const show=el.dataset.selected==='true'||(!overlap&&box.right<target.current.clientWidth-8);label.dataset.hidden=String(!show);if(show)labels.push(box);
    }
  };
  useEffect(()=>{const m=mapRef.current;if(!m)return;const pts=places.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)),ids=new Set(pts.map(placeId));
    for(const [id,item] of markers.current)if(!ids.has(id)){item.pin.remove();markers.current.delete(id);}
    pts.forEach((p,i)=>{const id=placeId(p);let item=markers.current.get(id);
      if(!item){const el=document.createElement('button');el.type='button';el.className='constructor-photo-pin';el.dataset.placeId=id;
        const pin=m.getCanvas?new maplibregl.Marker({element:el}).setLngLat([p.lng,p.lat]).addTo(m):window.L.marker([p.lat,p.lng],{icon:window.L.divIcon({className:'fallback-photo-marker',html:el,iconSize:[36,36],iconAnchor:[18,18]})}).addTo(m);
        item={el,pin,place:p,img:undefined,index:undefined};markers.current.set(id,item);
        el.addEventListener('click',e=>{e.stopPropagation();callbacks.current.onSelect?.(item.place);});
      }
      item.place=p;item.el.setAttribute('aria-label',p.name);item.el.dataset.selected=String(!!focusPlace&&id===placeId(focusPlace));
      const routeIndex=routePlaces.findIndex(r=>placeId(r)===id);
      const onRoute=routeIndex>=0||routeDays.some(d=>(d.places||[]).some(r=>placeId(r)===id)),numbered=drawRoute&&routeIndex>=0;item.el.classList.toggle('constructor-photo-pin-area',!onRoute);
      const favorite=savedPlaces.some(saved=>placeId(saved)===id);
      if(item.img!==p.img||item.index!==routeIndex||item.numbered!==numbered||item.name!==p.name||item.saved!==favorite){item.img=p.img;item.index=routeIndex;item.numbered=numbered;item.name=p.name;item.saved=favorite;
        renderMapPlaceMarker(item.el,p,{saved:favorite,number:numbered?routeIndex+1:null});
      }
    });
    routeLine.current?.remove();routeLine.current=null;
    const data=drawRoute?dayRouteFeatures(routeDays.length?routeDays:[{date:day.date,places:routePlaces}],day.date):{type:'FeatureCollection',features:[]};
    if(m.getCanvas){
      if(m.getSource('route'))m.getSource('route').setData(data);
      else{m.addSource('route',{type:'geojson',data});m.addLayer({id:'route-line',type:'line',source:'route',paint:{'line-color':['get','color'],'line-width':['get','width'],'line-opacity':['get','opacity']},layout:{'line-cap':'round','line-join':'round'}});}
    }else routeLine.current=window.L.featureGroup(data.features.map(feature=>window.L.polyline(feature.geometry.coordinates.map(([lng,lat])=>[lat,lng]),{color:feature.properties.color,weight:feature.properties.width,opacity:feature.properties.opacity}))).addTo(m);
    declutter.current();
  },[places,ready,drawRoute,routePlaces,focusPlace,savedPlaces,routeDays,day.date]);
  useEffect(()=>{const m=mapRef.current;if(!m)return;markers.current.forEach(item=>{item.el.dataset.selected=String(!!focusPlace&&placeId(item.place)===placeId(focusPlace));});declutter.current();if(!Number.isFinite(focusPlace?.lat))return;
    automatic.current=!(focusPlace.isCity||focusPlace.searchTarget);const zoom=focusPlace.isCity?12:Math.max(m.getZoom(),14);if(m.getCanvas)m.flyTo({center:[focusPlace.lng,focusPlace.lat],zoom,duration:450});else m.flyTo([focusPlace.lat,focusPlace.lng],zoom,{duration:.45});
  },[focusPlace,ready]);
  return <div className="gravity-editor-map"><div ref={target} aria-label="Карта мест"/>{failed&&<p role="status">Не удалось загрузить карту</p>}<span className="gravity-map-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a></span></div>;
}

function RouteExplorer({day,places,routeDays=[],loadMap,onPlace,savedPlaces,toggleSaved,children,current,initialMode='full',initialPlace=null,footer,controller,onModeChange,onQuickSchedule,onRemove,assignedDates,blocked}) {
  const stage=useRef(null), sheet=useRef(null), scroll=useRef(null), drag=useRef(null), carousel=useRef(null), scrollTimer=useRef(null), positioning=useRef(false);
  const [height,setHeight]=useState(600),[mode,setMode]=useState(initialMode),[selected,setSelected]=useState(initialPlace),[error,setError]=useState('');
  const heightRef=useRef(height), yRef=useRef(null), modeRef=useRef(mode);
  const [focus,setFocus]=useState(initialPlace),[nearby,setNearby]=useState([]),[bounds,setBounds]=useState(null),[cards,setCards]=useState(initialPlace?[initialPlace]:[]);
  useEffect(()=>()=>clearTimeout(scrollTimer.current),[]);
  useEffect(()=>{if(mode==='full'||!bounds)return;const request=new AbortController();const timer=setTimeout(()=>placesInBounds(bounds,request.signal,list=>setNearby(list)).then(list=>{const local=list;setNearby(local);return enrichPlaces(local,request.signal,patches=>setNearby(local.map(p=>({...p,...patches[placeId(p)],img:p.img||patches[placeId(p)]?.img,desc:p.desc||patches[placeId(p)]?.desc,hours:p.hours||patches[placeId(p)]?.hours,price:p.price||patches[placeId(p)]?.price}))));}).catch(()=>{}),mode==='browse'?180:280);return()=>{clearTimeout(timer);request.abort();};},[bounds,mode]);
  // Footer stays pinned. Free height in the middle; magnets at the edges:
  // near top → snap to full (handle hidden, «Карта» back); near bottom → peek.
  const footerSpace=()=>{const raw=getComputedStyle(document.documentElement).getPropertyValue('--constructor-footer-space').trim();const n=parseFloat(raw);return Number.isFinite(n)?n:56;};
  const offsets=h=>{const foot=footerSpace();return {full:68,half:Math.max(68,Math.round((h-foot)*.48)),map:Math.max(68,h-foot-34),peek:Math.max(68,h-foot-34),browse:h};};
  function position(y,animate=false) {
    yRef.current=y;
    if(sheet.current) {sheet.current.style.transition=animate?'transform 260ms cubic-bezier(.22,.8,.25,1)':'none';sheet.current.style.transform=`translate3d(0,${y}px,0)`;}
  }
  function applyMode(modeName){
    if(modeRef.current===modeName)return;
    modeRef.current=modeName;setMode(modeName);onModeChange?.(modeName);
  }
  function snap(next) {
    const modeName=next==='map'?'peek':next;
    applyMode(modeName);
    position(offsets(heightRef.current)[modeName],true);
  }
  function settle(y,animate=true){
    const points=offsets(heightRef.current);
    const next=Math.max(points.full,Math.min(points.peek,y));
    const span=Math.max(1,points.peek-points.full);
    // Pulling almost to the top docks full and restores «Карта».
    if(next<=points.full+Math.max(88,Math.round(span*.24))){snap('full');return;}
    // Near the footer strip collapses to handle-only peek.
    if(next>=points.peek-Math.max(36,Math.round(span*.1))){snap('peek');return;}
    applyMode('half');
    position(next,animate);
  }
  function openCards(place,list){const next=list.some(p=>placeId(p)===placeId(place))?list:mergePlaces([place,...list]);setCards(next);setSelected(place);setFocus(place);setError('');}
  if(controller)controller.current={mode,showPlace(place){setFocus({...place,searchTarget:true});if(place.isCity){setSelected(null);setCards([]);snap('browse');return;}const fromRoute=places.some(p=>placeId(p)===placeId(place));openCards(place,fromRoute?places:mergePlaces([place,...nearby]));snap('browse');},restore(next='half'){setSelected(null);setFocus(null);setCards([]);snap(next);}};
  useEffect(()=>{const observer=new ResizeObserver(([entry])=>{const h=entry.contentRect.height;heightRef.current=h;setHeight(h);const points=offsets(h);const modeName=modeRef.current;if(modeName==='browse'){position(points.browse);return;}if(modeName==='full'||modeName==='peek'||modeName==='half'&&yRef.current==null){position(points[modeName==='half'? 'half':modeName]);return;}const y=Math.max(points.full,Math.min(points.peek,yRef.current));position(y);});observer.observe(stage.current);return()=>observer.disconnect();},[]);
  const previousDay=useRef(current);
  useEffect(()=>{if(previousDay.current!==current){setSelected(null);setFocus(null);setCards([]);setError('');previousDay.current=current;}},[current]);
  useEffect(()=>{if(!selected||!carousel.current||mode!=='browse')return;positioning.current=true;const i=cards.findIndex(p=>placeId(p)===placeId(selected));carousel.current.scrollTo({left:Math.max(0,i)*(carousel.current.children[1]?.offsetLeft-carousel.current.children[0]?.offsetLeft||carousel.current.children[0]?.clientWidth+6||1),behavior:'instant'});requestAnimationFrame(()=>{positioning.current=false;});},[cards,mode,selected]);
  function handleCycle(){
    if(modeRef.current==='full')return 'half';
    if(modeRef.current==='peek')return 'half';
    return yRef.current>offsets(heightRef.current).half?'peek':'full';
  }
  function start(e) {
    if(e.button!==0 || (e.target.closest('button,a,input,[role=button]') && !e.target.closest('.route-sheet-handle'))) return;
    const onHandle=!!e.target.closest('.route-sheet-handle');
    // Full list scrolls; only handle / «Карта» collapses (handle is hidden in full CSS).
    if(!onHandle && modeRef.current==='full') return;
    if(!onHandle && modeRef.current==='peek') return;
    drag.current={id:e.pointerId,start:e.clientY,y:yRef.current??offsets(heightRef.current)[modeRef.current]??68,last:e.clientY,time:performance.now(),speed:0,moved:false};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {const d=drag.current;if(!d || d.id!==e.pointerId)return;
    const now=performance.now();d.speed=(e.clientY-d.last)/Math.max(1,now-d.time);d.last=e.clientY;d.time=now;
    d.moved ||= Math.abs(e.clientY-d.start)>4;
    const points=offsets(heightRef.current);
    const next=Math.max(points.full,Math.min(points.peek,d.y+e.clientY-d.start));
    // While dragging stay in half chrome so peek does not blank the schedule mid-gesture.
    if(modeRef.current!=='browse'&&modeRef.current!=='half')applyMode('half');
    position(next);
  }
  function end(e) {const d=drag.current;if(!d || d.id!==e.pointerId)return;drag.current=null;
    if(!d.moved && e.target.closest('.route-sheet-handle')) {snap(handleCycle());return;}
    const coast=performance.now()-d.time<80?d.speed*90:0;
    settle(yRef.current+coast,true);
  }
  const mapPlaces=mergePlaces([...(selected?[selected]:[]),...places,...routeDays.flatMap(d=>d.places||[]),...savedPlaces,...libraryPlaces().filter(p=>bounds&&inBounds(p,bounds)),...nearby]);
  const sheetScrollable=mode!=='peek'&&mode!=='browse';
  return <div className="route-explorer" ref={stage} data-sheet={mode} inert={blocked?'':undefined} aria-hidden={blocked||undefined}>
    <EditorMap day={day} routeDays={routeDays} savedPlaces={savedPlaces} places={mapPlaces} initialPlaces={places} loadMap={loadMap} drawRoute routePlaces={places} focusPlace={focus} onViewport={setBounds} onMapClick={()=>{setSelected(null);setCards([]);setFocus(null);setError('');snap('half');}} onSelect={place=>{const fromRoute=places.some(p=>placeId(p)===placeId(place));openCards(place,fromRoute?places:mergePlaces([place,...nearby.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng))]));snap('browse');}}/>
    {selected && mode==='browse' && <div ref={carousel} className="constructor-preview-carousel" onScroll={e=>{if(positioning.current)return;const node=e.currentTarget;clearTimeout(scrollTimer.current);scrollTimer.current=setTimeout(()=>{const i=Math.round(node.scrollLeft/(node.children[1]?.offsetLeft-node.children[0]?.offsetLeft||node.children[0]?.clientWidth+6||1));if(cards[i]&&placeId(cards[i])!==placeId(selected)){setSelected(cards[i]);setFocus(cards[i]);}},100);}}>{cards.map(place=><RoutePlacePreview key={placeId(place)} place={place} current={day} assigned={assignedDates?.has(placeId(place))} saved={savedPlaces.some(p=>placeId(p)===placeId(place))} onSave={toggleSaved} onOpen={onPlace} onSchedule={onQuickSchedule} onRemove={onRemove}/>)}</div>}
    <section ref={sheet} className="route-drag-sheet" aria-label="Расписание маршрута" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={()=>{drag.current=null;if(modeRef.current!=='browse')settle(yRef.current,false);}}>
      <button className="route-sheet-handle" aria-label={mode==='full'?'Показать карту':mode==='peek'?'Показать маршрут':'Развернуть маршрут'} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();snap(handleCycle());}}}><span/></button>
      <div className="route-sheet-scroll" ref={scroll} inert={mode==='peek'||mode==='browse'?'':undefined} style={{overflowY:sheetScrollable?'auto':'hidden',touchAction:sheetScrollable?'pan-y':'none'}}>{children}</div>
    </section>
    {mode!=='browse'&&footer}
    {mode==='full'&&<Button className="route-show-map" size="xl" view="action" onClick={()=>{setSelected(null);setCards([]);snap('half');}}><Icon data={MapPin} size={18}/>Карта</Button>}
  </div>;
}

function RouteEditor({bookings,onTransport,tripCities,days,current,editPlaces,loadMap,saveDay,onClose,initialMap=false,initialPlace=null,onPlace,savedPlaces,toggleSaved,schedulePlace,removePlace}) {
  const [date,setDate] = useState(current);
  const [edits,setEdits] = useState({});
  const [adding,setAdding] = useState(false);
  const [catalog,setCatalog] = useState(false);
  const [query,setQuery] = useState('');
  const [error,setError] = useState('');
  const explorer=useRef(null);
  const [explorerMode,setExplorerMode]=useState(initialPlace?'browse':initialMap?'half':'full'),[detail,setDetail]=useState(null),[searchOrigin,setSearchOrigin]=useState('full'),[searchLabel,setSearchLabel]=useState(''),[detailFromSearch,setDetailFromSearch]=useState(false);
  const day = days.find(item => item.date === date);
  const basePlaces = edits[date] ?? day.places;
  const [meta,setMeta]=useState({});
  const placesKey=basePlaces.map(p=>placeId(p)).join('|');
  useEffect(()=>{
    const need=basePlaces.filter(p=>!(p.price&&p.hours)&&(p.id?.startsWith?.('osm:')||p.wiki||p.wikidata||(Number.isFinite(p.lat)&&Number.isFinite(p.lng))));
    if(!need.length)return;
    const request=new AbortController();
    let timer=0;
    const apply=patches=>{if(document.querySelector('[data-dragging]')){clearTimeout(timer);timer=setTimeout(()=>apply(patches),120);return;}setMeta(old=>({...old,...patches}));};
    enrichPlaces(need,request.signal,apply).catch(()=>{});
    return()=>{clearTimeout(timer);request.abort();};
  },[date,placesKey]);
  const places = basePlaces.map(p=>{const patch=meta[placeId(p)]||{};return {...p,...patch,img:p.img||patch.img,price:p.price||patch.price,hours:p.hours||patch.hours};});
  const update = next => {
    if (!saveDay(date,next)) {setError('Не удалось сохранить маршрут.');return;}
    setError('');
    setEdits(previous => ({...previous,[date]:next}));
  };
  function move(from,to) {
    if (from == null || to < 0 || to >= places.length || from === to) return;
    const next = [...places];
    next.splice(to,0,...next.splice(from,1));
    update(next);
  }
  function optimize() {
    const positioned = place => Number.isFinite(place.lat) && Number.isFinite(place.lng);
    const remaining = places.filter(positioned);
    if (remaining.length < 3) return;
    const ordered = [remaining.shift()];
    while (remaining.length) {
      const from = ordered.at(-1);
      const distance = place => (place.lat-from.lat)**2 + ((place.lng-from.lng)*Math.cos(from.lat*Math.PI/180))**2;
      const nearest = remaining.reduce((best,place,index) => distance(place)<distance(remaining[best]) ? index : best,0);
      ordered.push(...remaining.splice(nearest,1));
    }
    update(places.map(place => positioned(place) ? ordered.shift() : place));
  }
  const context=places.find(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng))||day.fallbackCity;
  const effectiveDays=days.map((d,colorIndex)=>({...d,colorIndex,places:edits[d.date]??d.places}));
  const assignedDates=new Set(effectiveDays.flatMap(d=>d.places.map(placeId)));
  // Empty search shows «Найти место» until the user types.
  const searchTriggerLabel=(searchLabel||query).trim()||'Найти место';
  function search() {setSearchOrigin(explorer.current?.mode||'full');animateSearch(()=>setAdding(true));}
  function openDetail(place) {setSearchOrigin(explorer.current?.mode||'full');setDetailFromSearch(false);setDetail(place);}
  function choose(place) {setAdding(false);if(searchOrigin==='full'&&!place.isCity){setDetailFromSearch(true);setDetail(place);}else explorer.current?.showPlace(place);}
  function schedule(targetDate,place,returnMode=searchOrigin==='full'?'full':'half') {const message=schedulePlace(place,targetDate);if(!message){setEdits({});setDate(targetDate);setDetail(null);setAdding(false);setQuery('');setSearchLabel('');explorer.current?.restore(returnMode);}return message;}
  function remove(place) {const message=removePlace(place);if(!message)setEdits({});return message;}
  return <Modal open onOpenChange={open => {if (!open) onClose(date);}} aria-label="Конструктор"
    className="gravity-editor-modal" disableTransition disableHeightTransition>
    <section className="gravity-flow gravity-editor gravity-sheet-editor">
      <header className="gravity-editor-header" inert={adding?'':undefined} aria-hidden={adding||undefined}>
        <div className={'constructor-toolbar'+(explorerMode==='browse'?' constructor-toolbar-map':'')}>
          <IconButton icon={ChevronLeft} iconSize={20} label={explorerMode==='browse'?'Назад к расписанию':'Назад к маршруту'} onClick={() => explorerMode==='browse'?explorer.current?.restore('half'):onClose(date)}/>
          <PlaceSearchTrigger value={query} onClick={search}/>
        </div>
      </header>
      <RouteExplorer routeDays={effectiveDays} blocked={adding} controller={explorer} onModeChange={setExplorerMode} assignedDates={assignedDates} onQuickSchedule={place=>schedule(date,place,'half')} onRemove={remove} day={day} places={places} current={date} loadMap={loadMap} onPlace={openDetail} savedPlaces={savedPlaces} toggleSaved={toggleSaved} initialMode={initialPlace?'browse':initialMap?'half':'full'} initialPlace={initialPlace} footer={<footer className="constructor-footer"><span aria-label={formatRouteDuration(routeDurationMinutes(places))?'Оценка времени маршрута':'Время маршрута не рассчитано'}><img src="image/constructor/time.svg" alt=""/>{formatRouteDuration(routeDurationMinutes(places))||'—'}</span><Button view="flat" size="s" disabled={places.filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lng)).length<3} onClick={optimize}>Оптимизировать</Button></footer>}>
      <div className="gravity-editor-items">
        <DayStrip days={days} current={date} onDay={next => {setDate(next);setAdding(false);setQuery('');setSearchLabel('');setError('');}} />
        {places.map((place,index) => <div className="gravity-editor-row" key={placeId(place)} data-sort-index={index}>
          <button type="button" className="gravity-editor-grip sort-handle" aria-label={'Переместить '+place.name} disabled={places.length<2}
            {...sortHandlers('.gravity-editor-row',index,move)}><Icon data={Grip} size={16}/></button>
          <Photo src={place.img}/>
          <div className="gravity-place-copy" role="button" tabIndex={0} onClick={()=>openDetail(place)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail(place);}}}><Text as="div" variant="subheader-2">{index+1}. {place.name}</Text><Text as="div" variant="body-2" color="secondary">{placeRouteMeta(place)}</Text></div>
          <IconButton icon={TrashBin} label={'Удалить '+place.name} onClick={() => update(places.filter((_,i) => i!==index))}/>
        </div>)}
        <div className="transport-editor-bookings">{bookings.filter(b=>b.segments.some(s=>segmentDay(s)===date)).map(b=><BookingCards key={b.id} booking={b} segments={b.segments.filter(s=>segmentDay(s)===date)} onOpen={onTransport}/>)}</div>
        <div className="gravity-editor-actions">
          <Button view="normal" size="xl" width="max" aria-expanded={catalog} onClick={()=>setCatalog(true)}>
            <Button.Icon><img src="image/constructor/plus.svg" alt=""/></Button.Icon>Добавить место
          </Button>
          <Button view="outlined" size="xl" width="max" onClick={()=>onTransport(null,date)}><Button.Icon><Icon data={Car} size={20}/></Button.Icon>Добавить перемещение</Button>
        </div>
        {error && <Text color="danger" role="alert">{error}</Text>}
      </div>
      </RouteExplorer>
      {catalog&&<AddPlaceCatalog tripCities={tripCities} days={effectiveDays} current={date} saved={savedPlaces} onSave={toggleSaved} onSchedule={schedule} onRemove={remove} onClose={()=>setCatalog(false)} MapComponent={EditorMap} loadMap={loadMap}/>}
      {adding&&<RoutePlaceSearch initialQuery={query} places={editPlaces} context={context} onQueryChange={value=>{setQuery(value);setSearchLabel(value);}} onChoose={choose} onClose={()=>animateSearch(()=>setAdding(false))}/>}
      {detail&&<PlaceDetail constructorMode initialDate={date} place={detail} days={effectiveDays} saved={savedPlaces.some(p=>placeId(p)===placeId(detail))} onSave={toggleSaved} onSchedule={schedule} onRemove={remove} onClose={()=>{setDetail(null);if(detailFromSearch)setAdding(true);}}/>}
    </section>
  </Modal>;
}

function Itinerary({bookings=[],saveBooking,deleteBooking,title, date, trips, current, days, tab, placesContent, expenses, routeHref, placesHref, expensesHref, citiesHref, onDay, onAction, editPlaces, browsePlaces, tripCities, loadMap, saveDay, savedPlaces, toggleSaved, schedulePlace, removePlace, deleteTrip}) {
  const [transport,setTransport]=useState(null);
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [deleteError,setDeleteError]=useState('');
  const [routeMapDay,setRouteMapDay]=useState(null);
  const [detail,setDetail]=useState(null);
  const [switcherOpen,setSwitcherOpen] = useState(false);
  const [editorOpen,setEditorOpen] = useState(false);
  const [collapsed,setCollapsed] = useState({});
  const [activeDate,setActiveDate] = useState(current);
  const [editorMap,setEditorMap] = useState(false);
  const [editorPlace,setEditorPlace] = useState(null);
  const routeRef=useRef(null);
  const day = days.find(item => item.date === activeDate);
  useEffect(() => {setActiveDate(current);},[current]);
  useEffect(() => {
    const scroller=document.getElementById('trips');
    scroller.scrollTo(0,0);
    if (tab !== 'route') return;
    let frame;
    const update=() => {
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(() => {
        const header=routeRef.current?.querySelector('.gravity-route-header');
        const sections=[...routeRef.current.querySelectorAll('.gravity-day')];
        const line=(header?.getBoundingClientRect().bottom || 0)+24;
        const visible=sections.findLast(section => section.getBoundingClientRect().top<=line) || sections[0];
        if (visible) setActiveDate(visible.dataset.date);
      });
    };
    scroller.addEventListener('scroll',update,{passive:true});
    return () => {cancelAnimationFrame(frame);scroller.removeEventListener('scroll',update);};
  },[tab]);
  function select(next) {
    setCollapsed(previous => ({...previous,[next]:false}));
    setActiveDate(next);
    onDay(next);
    requestAnimationFrame(() => {
      const scroller=document.getElementById('trips');
      const section=routeRef.current?.querySelector('[data-date="'+next+'"]');
      const header=routeRef.current?.querySelector('.gravity-route-header');
      if (section && header) scroller.scrollTo({top:scroller.scrollTop+section.getBoundingClientRect().top-scroller.getBoundingClientRect().top-header.offsetHeight-12,behavior:'instant'});
    });
  }
  function openEditor(date,map=false,place=null) {setActiveDate(date);setEditorMap(map);setEditorPlace(place);setEditorOpen(true);}
  return <div ref={routeRef} className="gravity-flow gravity-route">
    {tab === 'route' && <div className="gravity-route-header">
      <div className="gravity-route-title-row"><h1 className="gravity-trip-title">
        <Button view="flat" size="xl" aria-haspopup="dialog" aria-expanded={switcherOpen} onClick={() => setSwitcherOpen(true)}>
          <Icon data={ChevronDown} size={16} /><span>{date}</span><span className="gravity-trip-name">{title}</span>
        </Button>
      </h1><ShareTrip title={title} href={routeHref}/></div>
      <DayStrip days={days} current={activeDate} onDay={select}/>
    </div>}
    {tab === 'route' && <TripSwitcher open={switcherOpen} onOpenChange={setSwitcherOpen} trips={trips} current={routeHref} />}
    {tab === 'route' && day && <FloatingAction icon={Pencil} label="Редактировать маршрут" onClick={() => openEditor(activeDate)}/>}
    {tab === 'route' && editorOpen && day && <RouteEditor bookings={bookings} onTransport={(booking,date)=>setTransport({booking,day:date||activeDate})} tripCities={tripCities} days={days} current={activeDate} initialMap={editorMap} initialPlace={editorPlace} editPlaces={editPlaces}
      loadMap={loadMap} saveDay={saveDay} schedulePlace={schedulePlace} removePlace={removePlace} savedPlaces={savedPlaces} toggleSaved={toggleSaved} onPlace={setDetail} onClose={next => {setEditorOpen(false);select(next);}}/>}
    {createPortal(<nav className="gravity-bottom-nav" aria-label="Разделы поездки">
      {[
        ['route','Маршрут',MapPin,routeHref],
        ['places','Места',PlanetEarth,placesHref],
        ['expenses','Расходы',Tag,expensesHref],
        ['notes','Заметки',FileText,routeHref+'/notes'],
      ].map(([value,label,icon,href]) => <Button key={value} className="gravity-bottom-button"
        view={tab === value ? 'normal' : 'flat'} href={href} disabled={!href}
        aria-current={tab === value ? 'page' : undefined}><span className="gravity-bottom-label"><Icon data={icon} size={20} /><span>{label}</span></span></Button>)}
      <DropdownMenu items={[
        ...(citiesHref ? [{text:'Города и даты',action:() => {location.hash = citiesHref;}}] : []),
        {text:'Добавить перемещение',action:() => setTransport({day:activeDate})},
        {text:'Удалить поездку',theme:'danger',action:()=>{setDeleteError('');setDeleteOpen(true);}},
      ]} renderSwitcher={props => <Button {...props} className="gravity-bottom-button" view="flat">
        <span className="gravity-bottom-label"><Icon data={Gear} size={20} /><span>Настройки</span></span>
      </Button>} />
    </nav>,document.body)}
    {transport&&<TransportFlow day={transport.day} days={days} tripId={routeHref} booking={transport.booking} onSave={saveBooking} onDelete={deleteBooking} onClose={()=>setTransport(null)}/>}
    {deleteOpen && <Modal open className="gravity-trip-modal" aria-label="Удалить поездку" onOpenChange={setDeleteOpen}><div className="delete-trip-confirm"><h2>Удалить поездку «{title}»?</h2><p>Поездка исчезнет из списка путешествий.</p>{deleteError&&<p role="alert">{deleteError}</p>}<div><Button size="l" onClick={()=>setDeleteOpen(false)}>Отмена</Button><Button size="l" view="outlined-danger" onClick={()=>{const error=deleteTrip();if(error)setDeleteError(error);else setDeleteOpen(false);}}>Удалить</Button></div></div></Modal>}
    {tab === 'places' && <PlacesView days={days} tripCities={tripCities} places={browsePlaces} saved={savedPlaces} onOpen={setDetail} onSave={toggleSaved} MapComponent={EditorMap} loadMap={loadMap} fallbackCity={days[0]?.fallbackCity} initialPlaces={days.flatMap(d=>d.places)}/>}
    {tab === 'notes' && <Notes tripKey={routeHref}/>}
    {routeMapDay&&<PlacesMap places={routeMapDay.places} routeMode initialSelected={routeMapDay.selectedPlace} initialPlaces={routeMapDay.places} fallbackCity={routeMapDay.fallbackCity} MapComponent={EditorMap} loadMap={loadMap} saved={savedPlaces} onSave={toggleSaved} onOpen={setDetail} onClose={()=>setRouteMapDay(null)}/>}
    {detail && <PlaceDetail place={detail} days={routeMapDay?[]:days} saved={savedPlaces.some(p=>placeId(p)===placeId(detail))} onSave={p=>toggleSaved(p||detail)} onSchedule={(date,p)=>schedulePlace(p||detail,date)} onRemove={removePlace} onClose={()=>setDetail(null)}/>}
    {tab === 'expenses' && <TripExpenses tripKey={routeHref} planned={expenses} />}
    {tab === 'route' && days.map((day,dayIndex) => <section className="gravity-day" key={day.date} data-date={day.date}>
      <h2><Button className="gravity-day-heading" view="normal" size="l" width="max" aria-expanded={!collapsed[day.date]} onClick={() => setCollapsed(previous => ({...previous,[day.date]:!previous[day.date]}))}>
        <span className="gravity-day-label">{day.label}{day.city ? ' — '+day.city : ''}</span><Icon data={collapsed[day.date] ? ChevronDown : ChevronUp} size={16} />
      </Button></h2>
      {!collapsed[day.date] && <div className="gravity-day-content">
        <RouteMap day={day} dayIndex={dayIndex} loadMap={loadMap} onExpand={() => setRouteMapDay(day)} onPlace={place=>setRouteMapDay({...day,selectedPlace:place})} />
        {bookings.filter(b=>b.segments.some(s=>segmentDay(s)===day.date)).map(b=><BookingCards key={b.id} booking={b} segments={b.segments.filter(s=>segmentDay(s)===day.date)} onOpen={booking=>setTransport({booking,day:day.date})}/>)}
        {day.transfers.map((item,i) => <DayCard key={i} item={item} transfer />)}
        {day.places.map(item => <DayCard key={placeId(item)} item={item} onOpen={setDetail} />)}
        {!day.places.length && !day.transfers.length && !bookings.some(b=>b.segments.some(s=>segmentDay(s)===day.date)) && <p className="trip-empty-day">Вы пока ничего не добавили</p>}
      </div>}
    </section>)}
  </div>;
}

let mounted;
window.GravityTrips = {
  render(element, page, props) {
    mounted ??= createRoot(element);
    const Component = {new:NewTrip,route:Itinerary}[page];
    const {key,...componentProps} = props;
    flushSync(() => mounted.render(<ThemeProvider theme="light"><Component key={key} {...componentProps} /></ThemeProvider>));
  },
  clear() {
    if (!mounted) return;
    mounted.unmount();
    mounted = undefined;
  },
};

let japanPhotoTimer;
enrichPhotos(japanCatalog,(place,photo)=>{Object.assign(place,photo);clearTimeout(japanPhotoTimer);japanPhotoTimer=setTimeout(()=>window.dispatchEvent(new Event('japan-photos-ready')),300);}).catch(()=>{});
