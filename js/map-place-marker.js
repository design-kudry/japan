// Figma Map / Map-module: the geographic anchor is always the 36px photo circle.
export function renderMapPlaceMarker(element,place,{saved=false,number=null}={}){
 element.classList.add('map-place-marker');
 element.dataset.saved=String(saved);
 element.setAttribute('aria-label',place.name);
 element.replaceChildren();
 const media=document.createElement('span');media.className='map-place-media';
 if(place.img){const img=document.createElement('img');img.src=place.img;img.alt='';img.draggable=false;img.onerror=()=>{img.remove();media.classList.add('map-place-media-empty');};media.append(img);}
 else media.classList.add('map-place-media-empty');
 element.append(media);
 const label=document.createElement('span');label.className='map-place-label';label.textContent=place.name;label.setAttribute('aria-hidden','true');element.append(label);
 if(number!==null){const badge=document.createElement('span');badge.className='map-place-number';badge.textContent=number;badge.setAttribute('aria-hidden','true');element.append(badge);}
 else if(saved){const badge=document.createElement('span');badge.className='map-place-favorite';badge.setAttribute('aria-hidden','true');const heart=document.createElement('img');heart.src='/image/map/favorite.svg';heart.alt='';badge.append(heart);element.append(badge);}
}
