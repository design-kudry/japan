import {PlacePhotoCarousel} from './place-photo-carousel.jsx';
import {PlacePhoto} from './place-loading.jsx';
import {useState,useEffect,useRef} from 'react';
import {flushSync} from 'react-dom';
import {Button,Icon,TextInput} from '@gravity-ui/uikit';
import {Magnifier,MapPinPlus,MapPin,PaperPlane,Heart,HeartFill,Plus,TrashBin} from '@gravity-ui/icons';
import usePlaceSearch from './use-place-search.js';
import {placeId,isAttraction,normalizePlaceText,mergePlaces} from './world-places.js';
import {enrichPlaces,placeCategory} from './place-enrichment.js';
import {placeDescription,russianOnly} from './russian.js';
import {placeRouteMeta} from './place-meta.js';

export function animateSearch(update) {
 if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.startViewTransition(()=>flushSync(update));}else update();
}
export function PlaceSearchTrigger({value='',onClick,className=''}) {
 return <div className={'place-search-rest '+className} role="button" tabIndex={0} aria-label="Найти место" onClick={onClick} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onClick();}}}><TextInput size="xl" value={value} readOnly placeholder="Найти место" startContent={<Icon data={Magnifier} size={16}/>} controlProps={{tabIndex:-1,'aria-label':'Найти место'}}/></div>;
}
export function FavoriteButton({saved,onClick,label,className='',size=16}) {
 return <Button className={'favorite-control '+className} view="flat" size="l" selected={saved} aria-pressed={saved} aria-label={label|| (saved?'Убрать из избранного':'Хочу посетить')} onClick={onClick}><Icon data={saved?HeartFill:Heart} size={size}/></Button>;
}
export function RoutePlaceSearch({initialQuery='',places,context,onChoose,onClose,onQueryChange}) {
 // Never invent a query — only what the user typed (or '' → empty field + «Найти место» placeholder).
 const [query,setQuery]=useState(initialQuery||'');
 const listRef=useRef(null);
 const focusResult=index=>{const options=listRef.current?.querySelectorAll('[role="option"]');if(options?.length)options[(index+options.length)%options.length].focus();};
 const {results,loading,error}=usePlaceSearch(query,{context,minLength:1});
 const q=normalizePlaceText(query);
 const local=q?places.filter(p=>isAttraction(p)&&normalizePlaceText([p.name,p.city,p.country].join(' ')).includes(q)):[];
 const shown=mergePlaces([...local,...results]).filter(p=>p.isCity||isAttraction(p)).slice(0,16);
 return <section className="constructor-search-screen" aria-label="Поиск" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}}}>
  <header><TextInput autoFocus size="xl" value={query} onUpdate={value=>{setQuery(value);onQueryChange?.(value);}} placeholder="Найти место" onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();focusResult(0);}}} startContent={<Icon data={Magnifier} size={16}/>} controlProps={{role:'combobox','aria-label':'Найти место','aria-expanded':true,'aria-controls':'constructor-search-results'}}/><Button className="constructor-search-cancel" view="flat" size="xl" onClick={onClose}>Отмена</Button></header>
  <div ref={listRef} className="constructor-search-list" onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const index=[...e.currentTarget.querySelectorAll('[role="option"]')].indexOf(e.target);focusResult(index+(e.key==='ArrowDown'?1:-1));}}} id="constructor-search-results" role="listbox" aria-label="Результаты поиска">
   {shown.map(p=><button type="button" key={placeId(p)} role="option" aria-selected="false" onClick={()=>onChoose(p)}><Icon data={p.isCity?MapPin:p.category==='aerodrome'?PaperPlane:MapPinPlus} size={16}/><span><strong>{p.name}</strong><span>{[p.isCity?'Город':placeCategory(p)||'Достопримечательность',[russianOnly(p.city),russianOnly(p.country)].filter(Boolean).join(', ')||russianOnly(p.address)].filter(Boolean).join(' · ')}</span></span></button>)}
   {loading&&<p role="status">Поиск…</p>}
   {error&&<p role="alert">{error}</p>}
   {q&&!loading&&!error&&!shown.length&&<p>Ничего не найдено</p>}
  </div>
 </section>;
}

export function RoutePlacePreview({place:original,saved,onSave,onOpen,onSchedule,onRemove,current,assigned}) {
 const [extra,setExtra]=useState({}),[enriching,setEnriching]=useState(true),[error,setError]=useState('');
 useEffect(()=>{setExtra({});setEnriching(true);const request=new AbortController();enrichPlaces([original],request.signal,patches=>setExtra(patches[placeId(original)]||{})).catch(()=>{}).finally(()=>{if(!request.signal.aborted)setEnriching(false);});return()=>request.abort();},[placeId(original)]);
 const place={...original,...extra,img:original.img||extra.img,desc:original.desc||extra.desc,hours:original.hours||extra.hours,price:original.price||extra.price};
 return <article className="constructor-place-preview" aria-label="Выбранное место">
  <PlacePhotoCarousel place={place} pending={enriching} onOpen={()=>onOpen(place)}/>
  <button className="constructor-preview-open" onClick={()=>onOpen(place)}>

   <div className="constructor-preview-copy"><h2>{place.name}</h2><p>{placeDescription(place,true)}</p><span>{placeRouteMeta(place)}</span></div>
  </button>
  <FavoriteButton className="constructor-preview-heart" saved={saved} onClick={()=>{if(onSave(place)===false)setError('Не удалось сохранить место.');}}/>
  <div className="constructor-preview-action"><Button size="l" width="max" view="normal" onClick={()=>{const result=assigned?onRemove(place):onSchedule(place);setError(result||'');}}><Icon data={assigned?TrashBin:Plus} size={16}/>{assigned?'Убрать из маршрута':'В маршрут '+current.label.replace(/^.*?,?\s(?=\d)/,'')}</Button></div>
  {error&&<p role="alert">{error}</p>}
 </article>;
}
