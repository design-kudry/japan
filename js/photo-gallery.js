export function photoList(place,extra=[]){
 const cover=place.img||place.imageOriginal?{img:place.img||place.imageOriginal,imageOriginal:place.imageOriginal,imageSource:place.imageSource,imageCredit:place.imageCredit,imageLicense:place.imageLicense}:null;
 return [...(cover?[cover]:[]),...extra].filter((p,i,list)=>p.img&&list.findIndex(x=>x.img===p.img||(x.imageSource&&x.imageSource===p.imageSource))===i);
}
export const photoStep=(index,delta,count)=>count?((index+delta)%count+count)%count:0;
