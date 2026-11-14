import {useState} from 'react';
import {Skeleton} from '@gravity-ui/uikit';

// A loading card has the same footprint as a real card, without fake actions.
export function PlaceCardSkeleton({compact=false}) {
 return <div className={'places-tile place-card-skeleton'+(compact?' places-tile-map':'')} aria-hidden="true"><Skeleton className="place-card-skeleton-image"/><div className="places-tile-copy"><Skeleton variant="text" width="78%"/><Skeleton variant="text"/><Skeleton variant="text" width="88%"/><Skeleton variant="text" width="58%"/></div></div>;
}
export function PlacePhoto({src,fallbackSrc,alt='',className='',pending=false,lazy=true}) {
 const [failed,setFailed]=useState([]),[loaded,setLoaded]=useState('');
 const active=src&&!failed.includes(src)?src:fallbackSrc&&!failed.includes(fallbackSrc)?fallbackSrc:'';
 const loading=!!active&&loaded!==active||pending&&!active&&!failed.length;
 return <div className={'place-photo-frame '+className} aria-busy={loading||undefined}>
  {loading&&<div className="place-photo-skeleton" aria-hidden="true"><Skeleton/></div>}
  {active?<img key={active} src={active} alt={alt} loading={lazy?'lazy':'eager'} decoding="async" draggable={false} className={loaded===active?'is-loaded':''} onLoad={()=>setLoaded(active)} onError={()=>setFailed(old=>old.includes(active)?old:[...old,active])}/>:!loading&&<span className="place-photo-unavailable" role={alt?'img':undefined} aria-label={alt||undefined}/>}
 </div>;
}
