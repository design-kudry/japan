import {useRef} from 'react';
import {Button,Icon,Modal} from '@gravity-ui/uikit';
import {ChevronLeft,ChevronRight,Xmark} from '@gravity-ui/icons';
import {PhotoPagination} from './place-photo-carousel.jsx';
import {photoStep} from './photo-gallery.js';

export default function PhotoViewer({photos,index,onIndexChange,name,onClose}){
 const gesture=useRef(null),closeButton=useRef(null);
 const active=index%photos.length,photo=photos[active];
 const step=delta=>onIndexChange(photoStep(active,delta,photos.length));
 return <Modal open disableTransition disableHeightTransition className="photo-viewer-modal" initialFocus={closeButton} aria-label="Фотографии места" onOpenChange={open=>{if(!open)onClose();}}>
  <section className="photo-viewer" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();step(e.key==='ArrowRight'?1:-1);}}}>
   <Button ref={closeButton} className="photo-viewer-control photo-viewer-close" size="xl" view="normal" aria-label="Закрыть фотографии" onClick={onClose}><Icon data={Xmark} size={20}/></Button>
   <div className="photo-viewer-stage"
    onPointerDown={e=>{if(e.button!==0||e.target.closest('button'))return;gesture.current={x:e.clientX,y:e.clientY,id:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerUp={e=>{const start=gesture.current;gesture.current=null;if(!start||start.id!==e.pointerId)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy))step(dx<0?1:-1);}}
    onPointerCancel={()=>{gesture.current=null;}}>
    <img key={photo.img} src={photo.imageOriginal||photo.img} alt={name+' — фото '+(active+1)} draggable={false}/>
    {photos.length>1&&<><Button className="photo-viewer-control photo-viewer-prev" size="xl" view="normal" aria-label="Предыдущее фото" onClick={()=>step(-1)}><Icon data={ChevronLeft} size={20}/></Button><Button className="photo-viewer-control photo-viewer-next" size="xl" view="normal" aria-label="Следующее фото" onClick={()=>step(1)}><Icon data={ChevronRight} size={20}/></Button></>}
   </div>
   <footer className="photo-viewer-footer"><PhotoPagination count={photos.length} active={active} onSelect={onIndexChange}/>{photo.imageSource&&<a href={photo.imageSource} target="_blank" rel="noopener noreferrer">{[photo.imageCredit,photo.imageLicense].filter(Boolean).join(' · ')}</a>}</footer>
  </section>
 </Modal>;
}
