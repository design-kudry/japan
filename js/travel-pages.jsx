import {PlacePhotoCarousel} from './place-photo-carousel.jsx';
import {photoList} from './photo-gallery.js';
import {libraryPlace,libraryPlaces,inBounds} from './place-library.js';
import {PlacePhoto} from './place-loading.jsx';
import AddPlaceCatalog from './add-place-catalog.jsx';
import {curatedCatalog} from './place-catalog.js';
import {RoutePlaceSearch,FavoriteButton,PlaceSearchTrigger,animateSearch} from './route-place-search.jsx';
import {enrichPlaces,placeGallery,placeCategory} from './place-enrichment.js';
import {hasCyrillic,placeDescription} from './russian.js';
import {placeMeta,placeRouteMeta} from './place-meta.js';
import {placesInBounds,placeId,isAttraction,mergePlaces} from './world-places.js';
import {useState,useRef,useMemo,useEffect,useLayoutEffect} from 'react';
import {Button,Icon,Modal,TextInput,Select} from '@gravity-ui/uikit';
import {Xmark,Plus,TrashBin,MapPin,Check,Heart,Magnifier,ChevronRight,ChevronLeft} from '@gravity-ui/icons';

function SavePlace({place,saved,onSave}) {
 const [error,setError]=useState(false);
 return <><FavoriteButton className="place-heart" saved={saved} label={(saved?'Убрать из избранного: ':'Хочу посетить: ')+place.name} onClick={()=>setError(onSave(place)===false)}/>{error&&<span role="alert">Не удалось сохранить</span>}</>;
}
export function PlaceTile({place,saved,onSave,onOpen,compact=false}) {
 place=libraryPlace(place);
 return <article className={'places-tile'+(compact?' places-tile-map':'')}><PlacePhotoCarousel place={place} onOpen={()=>onOpen(place)}/><button className="places-tile-open" onClick={()=>onOpen(place)}>
 <div className="places-tile-copy"><strong>{place.name}</strong><p>{placeDescription(place,true)}</p><span className="places-tile-meta">{placeRouteMeta(place)}</span></div></button>
 <SavePlace place={place} saved={saved} onSave={onSave}/></article>;
}
export function PlacesMap({places,saved,onSave,onOpen,onClose,MapComponent,loadMap,fallbackCity,initialPlaces,routeMode=false,initialSelected=null}) {
 const [query,setQuery]=useState(''),[searchOpen,setSearchOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [bounds,setBounds]=useState(null),[remote,setRemote]=useState([]),[focus,setFocus]=useState(initialSelected),[selected,setSelected]=useState(initialSelected),[cards,setCards]=useState(initialSelected?places:[]);
 const carousel=useRef(null),scrollTimer=useRef(null),positioning=useRef(false),pendingSearch=useRef(null);
 const [details,setDetails]=useState({});
 const decorate=input=>{const p=libraryPlace(input);const patch=details[placeId(p)]||{};return {...p,...patch,name:p.name,shortDesc:p.shortDesc,img:p.img||patch.img,desc:p.desc||patch.desc,hours:p.hours||patch.hours,price:p.price||patch.price};};
 useEffect(()=>()=>clearTimeout(scrollTimer.current),[]);
 useEffect(()=>{if(!initialSelected)return;const i=places.findIndex(p=>placeId(p)===placeId(initialSelected));if(carousel.current)carousel.current.scrollTo({left:Math.max(0,i)*(carousel.current.children[1]?.offsetLeft-carousel.current.children[0]?.offsetLeft||carousel.current.children[0]?.clientWidth+6||1),behavior:'instant'});},[]);
 const basePins=useMemo(()=>routeMode?places:[...new Map([...(selected?[selected]:[]),...places,...libraryPlaces().filter(p=>bounds&&inBounds(p,bounds)),...remote].map(p=>[placeId(p),p])).values()],[places,remote,routeMode,selected,bounds]);
 const pins=useMemo(()=>mergePlaces(basePins.map(decorate)).filter(p=>routeMode||isAttraction(p)),[basePins,details,routeMode]);
 const metadataKey=basePins.filter(p=>(p.id?.startsWith('osm:')||p.wiki)).map(placeId).sort().join('|');
 useEffect(()=>{if(routeMode||!metadataKey)return;const request=new AbortController();enrichPlaces(basePins,request.signal,patches=>setDetails(old=>({...old,...patches}))).catch(()=>{});return()=>request.abort();},[metadataKey,routeMode]);
 useLayoutEffect(()=>{if(!selected||!carousel.current)return;positioning.current=true;const i=cards.findIndex(p=>placeId(p)===placeId(selected));carousel.current.scrollTo({left:Math.max(0,i)*(carousel.current.children[1]?.offsetLeft-carousel.current.children[0]?.offsetLeft||carousel.current.children[0]?.clientWidth+6||1),behavior:'instant'});requestAnimationFrame(()=>{positioning.current=false;});},[cards]);
 const visible=useMemo(()=>routeMode?places:!bounds?[]:pins.filter(p=>p.lat>=bounds.south&&p.lat<=bounds.north&&p.lng>=bounds.west&&p.lng<=bounds.east),[pins,bounds,places,routeMode]);
 useEffect(()=>{if(routeMode||!bounds)return;setLoading(true);const controller=new AbortController();const timer=setTimeout(()=>{placesInBounds(bounds,controller.signal,list=>setRemote(list)).then(list=>{setRemote(list);setError('');if(pendingSearch.current){setCards(mergePlaces([pendingSearch.current,...list]));pendingSearch.current=null;}}).catch(e=>{if(e.name!=='AbortError')setError('Не удалось загрузить места в этой области');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});},220);return()=>{clearTimeout(timer);controller.abort();};},[bounds,routeMode]);


 function choose(p,list=visible){const next=list.some(x=>placeId(x)===placeId(p))?list:[p,...list];setCards(next);setSelected(p);setFocus(p);setSearchOpen(false);clearTimeout(scrollTimer.current);}
 return <Modal open className="places-map-modal" disableTransition disableHeightTransition aria-label={routeMode?'Карта маршрута':'Карта мест'} onOpenChange={v=>{if(!v)onClose();}}><div className={'places-map-screen'+(routeMode?' route-map-screen':'')}>
 <MapComponent day={{fallbackCity}} places={pins} initialPlaces={initialPlaces?.length?initialPlaces:places} loadMap={loadMap} onSelect={p=>choose(p)} drawRoute={routeMode} focusPlace={focus} onViewport={setBounds} onMapClick={()=>{pendingSearch.current=null;setSelected(null);setFocus(null);setSearchOpen(false);}}/>
 <header className="places-map-toolbar" inert={searchOpen?'':undefined} aria-hidden={searchOpen||undefined}><Button className="places-map-back" size="xl" view="outlined" aria-label="Назад к местам" onClick={onClose}><Icon data={ChevronLeft} size={20}/></Button>{!routeMode&&<PlaceSearchTrigger value={query} onClick={()=>animateSearch(()=>setSearchOpen(true))}/>}</header>
 {searchOpen&&!routeMode&&<RoutePlaceSearch initialQuery={query} places={places} context={bounds?{lat:(bounds.north+bounds.south)/2,lng:(bounds.east+bounds.west)/2}:undefined} onQueryChange={setQuery} onClose={()=>animateSearch(()=>setSearchOpen(false))} onChoose={p=>{animateSearch(()=>setSearchOpen(false));setQuery('');setFocus(p);if(p.isCity){pendingSearch.current=null;setSelected(null);setRemote([]);}else{pendingSearch.current=p;choose({...p,searchTarget:true},[p]);}}}/> }
 {!routeMode&&loading&&<div className="world-map-loading" role="status">Загружаем места…</div>}{!routeMode&&bounds?.zoom<5&&<div className="world-map-loading" role="status">Приблизьте карту, чтобы увидеть достопримечательности</div>}
 {error&&<button className="world-map-error" onClick={()=>setError('')}>{error} ×</button>}
 {selected&&<div ref={carousel} className="places-map-carousel" onScroll={e=>{if(positioning.current)return;const node=e.currentTarget;clearTimeout(scrollTimer.current);scrollTimer.current=setTimeout(()=>{const i=Math.round(node.scrollLeft/(node.children[1]?.offsetLeft-node.children[0]?.offsetLeft||node.children[0]?.clientWidth+6||1));if(cards[i]&&placeId(cards[i])!==placeId(selected)){setSelected(cards[i]);setFocus(cards[i]);}},100);}}>{cards.map(p=><PlaceTile compact key={placeId(p)} place={decorate(p)} saved={saved.some(x=>placeId(x)===placeId(p))} onSave={onSave} onOpen={onOpen}/>)}</div>}

 </div></Modal>;
}
export function PlacesView({saved,onOpen,onSave,MapComponent,loadMap,fallbackCity,tripCities=[],days=[]}) {
 const destinations=tripCities.length?tripCities:fallbackCity?[fallbackCity]:[];
 return <AddPlaceCatalog embedded tripCities={destinations} days={days} saved={saved} onSave={onSave} onOpenPlace={onOpen} MapComponent={MapComponent} loadMap={loadMap}/>;
}
export function PlaceDetail({place:original,days,saved,onSave,onSchedule,onRemove,onClose,initialDate,constructorMode=false}) {
 original=libraryPlace(original);
 const [extra,setExtra]=useState({}),[enriching,setEnriching]=useState(true);
 // Always enrich — hours/price/photo may still be missing even when desc/img exist.
 useEffect(()=>{setEnriching(true);const request=new AbortController();enrichPlaces([original],request.signal,patches=>setExtra(patches[placeId(original)]||{})).catch(()=>{}).finally(()=>{if(!request.signal.aborted)setEnriching(false);});return()=>request.abort();},[placeId(original)]);
 const place={...original,...extra,name:original.name,shortDesc:original.shortDesc,img:original.img||extra.img,desc:original.desc||extra.desc,hours:original.hours||extra.hours,price:original.price||extra.price,duration:original.duration||extra.duration,category:original.category||extra.category};
 const metadata=placeMeta(place);
 const [gallery,setGallery]=useState([]),[photoOpen,setPhotoOpen]=useState(false),[photoIndex,setPhotoIndex]=useState(0);
 const photos=photoList(place,gallery);
 useEffect(()=>{setGallery([]);setPhotoIndex(0);const request=new AbortController();placeGallery(original,request.signal).then(setGallery).catch(()=>{});return()=>request.abort();},[placeId(original)]);
 const paragraphs=(placeDescription(place)||'Описание пока не найдено').split(/\n\s*\n/).flatMap(text=>{const sentences=text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)||[text];const result=[];for(let i=0;i<sentences.length;i+=2)result.push(sentences.slice(i,i+2).join('').trim());return result;});

 const existing=days.find(d=>d.places?.some(p=>placeId(p)===placeId(place)));
 const [date,setDate]=useState(existing?.date||initialDate||days[0]?.date||''),[message,setMessage]=useState(''),[assigned,setAssigned]=useState(existing?.date||'');
 return <Modal open className={"place-detail-modal"+(constructorMode?" constructor-detail-modal":"")} disableTransition disableHeightTransition onOpenChange={v=>{if(!v)onClose();}} aria-label={place.name}>
 <article className="place-detail-screen"><div className="place-detail-hero"><PlacePhotoCarousel place={place} photos={photos} pending={enriching} eager onIndexChange={setPhotoIndex} onOpen={index=>{setPhotoIndex(index);setPhotoOpen(true);}}/><Button className="place-detail-back" view="flat" size="xl" aria-label="Закрыть описание" onClick={onClose}><Icon data={ChevronLeft} size={20}/></Button><SavePlace place={place} saved={saved} onSave={onSave}/></div>
 <div className="place-detail-content"><h2>{place.name}</h2><div className="place-detail-description">{paragraphs.map((text,i)=><p key={i}>{text}</p>)}</div><dl className="place-detail-meta"><div><dt>Время работы</dt><dd>{placeRouteMeta({...place,price:''})}</dd></div>{metadata.price&&<div><dt>Билет</dt><dd>{metadata.price}</dd></div>}{place.duration&&<div><dt>На посещение</dt><dd>{place.duration}</dd></div>}</dl>{place.descriptionUrl&&<a className="place-source" href={place.descriptionUrl} target="_blank" rel="noopener noreferrer">Wikipedia · {place.descriptionLicense}</a>}{place.metaSource&&<a className="place-source" href={place.metaSource} target="_blank" rel="noopener noreferrer">Часы и билет: {place.metaProvider||'Wikivoyage'}{place.metaLicense?' · '+place.metaLicense:''}</a>}{place.imageSource&&<a className="place-source" href={place.imageSource} target="_blank" rel="noopener noreferrer">Фото: {[place.imageCredit,place.imageLicense].filter(Boolean).join(' · ')}</a>}</div>
 {days.length>0&&<footer className="place-detail-footer"><Select size="xl" width="max" aria-label="День посещения" value={[date]} onUpdate={v=>setDate(v[0])} options={days.map(d=>({value:d.date,content:d.label}))}/><Button size="xl" aria-label={assigned===date?'Убрать из маршрута':assigned?'Перенести':'В маршрут'} onClick={()=>{const removing=assigned===date;const result=removing?onRemove(place):onSchedule(date,place);setMessage(result||'');if(!result)setAssigned(removing?'':date);}}><Icon data={assigned===date?TrashBin:Plus} size={20}/>{assigned===date?'Убрать':assigned?'Перенести':'В маршрут'}</Button></footer>}
 {message&&<p className="place-detail-message" role="alert">{message}</p>}
 {photoOpen&&photos.length>0&&<Modal open className="place-gallery-modal" aria-label="Фотографии места" onOpenChange={v=>{if(!v)setPhotoOpen(false);}}><div className="place-gallery" onKeyDown={e=>{if(e.key==='ArrowRight')setPhotoIndex(i=>(i+1)%photos.length);if(e.key==='ArrowLeft')setPhotoIndex(i=>(i-1+photos.length)%photos.length);}}><Button className="place-gallery-close" view="normal" aria-label="Закрыть фотографии" onClick={()=>setPhotoOpen(false)}><Icon data={Xmark}/></Button><img src={photos[photoIndex%photos.length].imageOriginal||photos[photoIndex%photos.length].img} alt={place.name} onTouchStart={e=>{e.currentTarget.dataset.start=String(e.touches[0].clientX);}} onTouchEnd={e=>{const delta=e.changedTouches[0].clientX-Number(e.currentTarget.dataset.start);if(Math.abs(delta)>40)setPhotoIndex(i=>(i+(delta<0?1:-1)+photos.length)%photos.length);}}/>{photos.length>1&&<nav aria-label="Переключение фотографий"><Button view="normal" aria-label="Предыдущее фото" onClick={()=>setPhotoIndex(i=>(i-1+photos.length)%photos.length)}><Icon data={ChevronLeft}/></Button><span>{photoIndex%photos.length+1} / {photos.length}</span><Button view="normal" aria-label="Следующее фото" onClick={()=>setPhotoIndex(i=>(i+1)%photos.length)}><Icon data={ChevronRight}/></Button></nav>}<a href={photos[photoIndex%photos.length].imageSource} target="_blank" rel="noopener noreferrer">{[photos[photoIndex%photos.length].imageCredit,photos[photoIndex%photos.length].imageLicense].filter(Boolean).join(' · ')}</a></div></Modal>}

 </article></Modal>;
}
export function Notes({tripKey}) {
 const key='travel-notes-v1:'+tripKey;
 const [notes,setNotes]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))||[];}catch{return [];}});
 const [editing,setEditing]=useState(null),[error,setError]=useState('');
 const persist=next=>{try{localStorage.setItem(key,JSON.stringify(next));setNotes(next);setError('');return true;}catch{setError('Не удалось сохранить заметку.');return false;}};
 if(editing)return <section className="travel-page"><div className="detail-toolbar"><h1>Заметка</h1><Button view="flat" aria-label="Закрыть заметку" onClick={()=>setEditing(null)}><Icon data={Xmark}/></Button></div>
 <TextInput size="xl" aria-label="Название заметки" placeholder="Название" value={editing.title} onUpdate={title=>setEditing({...editing,title})}/>
 <textarea className="note-editor" aria-label="Текст заметки" placeholder="Текст заметки" value={editing.text} onChange={e=>setEditing({...editing,text:e.target.value})}/>
 {error&&<p role="alert">{error}</p>}<Button size="xl" view="action" disabled={!editing.title.trim()&&!editing.text.trim()} onClick={()=>{const n={...editing,title:editing.title.trim()||'Без названия'};if(persist(notes.some(x=>x.id===n.id)?notes.map(x=>x.id===n.id?n:x):[n,...notes]))setEditing(null);}}>Сохранить</Button></section>;
 return <section className="travel-page"><div className="detail-toolbar"><h1>Заметки</h1><Button size="l" aria-label="Добавить заметку" onClick={()=>setEditing({id:crypto.randomUUID(),title:'',text:''})}><Icon data={Plus}/></Button></div>
 {!notes.length&&<p>Пока нет заметок</p>}<div className="travel-notes">{notes.map(n=><div className="note-card" key={n.id}><button onClick={()=>setEditing({...n})}><strong>{n.title}</strong><span>{n.text||' '}</span></button><Button view="flat" size="l" aria-label={'Удалить заметку '+n.title} onClick={()=>persist(notes.filter(x=>x.id!==n.id))}><Icon data={TrashBin}/></Button></div>)}</div>{error&&<p role="alert">{error}</p>}</section>;
}
