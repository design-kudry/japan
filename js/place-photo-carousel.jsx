import {useState,useEffect,useRef} from 'react';
import {PlacePhoto} from './place-loading.jsx';
import {placeGallery} from './place-enrichment.js';
import {photoList,photoStep} from './photo-gallery.js';

// Share in-flight gallery lookups and limit concurrency for visible catalogue cards.
const requests=new Map(),queue=[];let running=0;
function pump(){while(running<2&&queue.length){running++;const job=queue.shift();job().finally(()=>{running--;pump();});}}
function gallery(place){
 const key=place.id||place.name;
 if(!requests.has(key)){const promise=new Promise((resolve,reject)=>{queue.push(async()=>{try{resolve(await placeGallery(place));}catch(e){requests.delete(key);reject(e);}});pump();});requests.set(key,promise);}
 return requests.get(key);
}
export function PlacePhotoCarousel({place,photos:provided,onOpen,onIndexChange,pending=false,eager=false,className='',pagination=true,selectedIndex}){
 const [extra,setExtra]=useState([]),[index,setIndex]=useState(0),[loading,setLoading]=useState(false);
 const node=useRef(null),gesture=useRef(null),swallowed=useRef(false),pendingStep=useRef(0);
 const photos=photoList(place,provided===undefined?extra:provided);
 const active=(selectedIndex??index)%Math.max(1,photos.length);
 useEffect(()=>{setExtra([]);setIndex(0);pendingStep.current=0;if(provided!==undefined)return;
  let mounted=true,started=false;
  const load=()=>{if(started)return;started=true;setLoading(true);gallery(place).then(items=>{if(mounted){setExtra(items);if(pendingStep.current){setIndex(photoStep(0,pendingStep.current,photoList(place,items).length));pendingStep.current=0;}}}).catch(()=>{}).finally(()=>{if(mounted)setLoading(false);});};
  const target=node.current;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load();}},{rootMargin:'80px'});if(target)observer.observe(target);
  target?.addEventListener('pointerenter',load,{once:true});target?.addEventListener('focusin',load,{once:true});
  return()=>{mounted=false;observer.disconnect();target?.removeEventListener('pointerenter',load);target?.removeEventListener('focusin',load);};
 },[place.id,provided===undefined]);
 function step(delta){if(photos.length<2){if(loading)pendingStep.current=delta;return;}const next=photoStep(active,delta,photos.length);setIndex(next);onIndexChange?.(next);}
 return <div ref={node} className={'place-photo-carousel '+className} role="group" aria-label={'Фотографии: '+place.name}
  onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();step(e.key==='ArrowRight'?1:-1);}}}
  onPointerDown={e=>{if(e.target.closest('.photo-pagination')||e.button!==0)return;gesture.current={x:e.clientX,y:e.clientY,id:e.pointerId};swallowed.current=false;e.stopPropagation();}}
  onPointerMove={e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)){swallowed.current=true;e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();}}}
  onPointerUp={e=>{const g=gesture.current;gesture.current=null;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){swallowed.current=true;step(dx<0?1:-1);e.preventDefault();e.stopPropagation();}}}
  onPointerCancel={()=>{gesture.current=null;}}
  onClickCapture={e=>{if(swallowed.current){swallowed.current=false;e.preventDefault();e.stopPropagation();}}}>
  <button type="button" className="place-photo-carousel-open" aria-label={'Открыть фото: '+place.name} onClick={()=>onOpen?.(active)}>
   <PlacePhoto src={photos[active]?.img} fallbackSrc={photos[active]?.imageOriginal} alt={place.name} pending={pending} lazy={!eager}/>
  </button>
  {pagination&&<PhotoPagination count={photos.length} active={active} onSelect={next=>{setIndex(next);onIndexChange?.(next);}}/>}
 </div>;
}

export function PhotoPagination({count,active,onSelect}){
 if(count<2)return null;
 return <nav className="photo-pagination" aria-label="Фотографии">{Array.from({length:count},(_,i)=><button type="button" key={i} aria-label={'Фото '+(i+1)+' из '+count} aria-current={i===active?'true':undefined} onClick={e=>{e.stopPropagation();onSelect(i);}}><span/></button>)}</nav>;
}
