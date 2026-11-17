// Supplemental metadata must never change the destination of an existing card.
export function placeWithDetails(place,extra={}){
 const result={...extra,...place};
 for(const key of ['img','desc','hours','price','duration','category','shortDesc'])result[key]=place[key]||extra[key];
 for(const key of ['id','name','nameEn','lat','lng','wikidata','wiki'])if(key in place)result[key]=place[key];
 return result;
}
export function samePlaceLocation(a,b){
 if(![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return true;
 return Math.hypot(a.lat-b.lat,(a.lng-b.lng)*Math.cos(a.lat*Math.PI/180))<.01;
}
