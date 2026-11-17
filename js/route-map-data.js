const valid=p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng);
const colors=['#0088ff','#d55e00','#009e73','#a855b8','#c78b00','#e25486','#5367be','#687d29'];
export function dayRouteFeatures(days,current){
 return {type:'FeatureCollection',features:days.flatMap((day,index)=>{
  const points=(day.places||[]).filter(valid);
  return points.length<2?[]:[{type:'Feature',properties:{date:day.date,color:colors[index]||`hsl(${Math.round(index*137.508)%360} 65% 42%)`,width:day.date===current?3.5:2.5,opacity:day.date===current?1:.65},geometry:{type:'LineString',coordinates:points.map(p=>[p.lng,p.lat])}}];
 }).sort((a,b)=>Number(a.properties.date===current)-Number(b.properties.date===current))};
}
const project=(p,z)=>{const size=256*2**z,lat=Math.max(-85.05112878,Math.min(85.05112878,p.lat))*Math.PI/180;return [(p.lng+180)/360*size,(1-Math.asinh(Math.tan(lat))/Math.PI)/2*size];};
// Raster tiles and pins share one Web Mercator projection, including after resizing.
export function routePreview(points,width,height){
 const pins=points.filter(valid);if(!pins.length||!width||!height)return {tiles:[],positions:[]};
 let zoom=15,xy;
 for(;zoom>1;zoom--){xy=pins.map(p=>project(p,zoom));if(Math.max(...xy.map(p=>p[0]))-Math.min(...xy.map(p=>p[0]))<=Math.max(1,width-88)&&Math.max(...xy.map(p=>p[1]))-Math.min(...xy.map(p=>p[1]))<=Math.max(1,height-98))break;}
 xy=pins.map(p=>project(p,zoom));
 const left=(Math.min(...xy.map(p=>p[0]))+Math.max(...xy.map(p=>p[0]))-width)/2,top=(Math.min(...xy.map(p=>p[1]))+Math.max(...xy.map(p=>p[1]))-height)/2;
 const tiles=[],n=2**zoom;
 for(let x=Math.floor(left/256);x<=Math.floor((left+width)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+height)/256);y++)if(y>=0&&y<n)tiles.push({x:((x%n)+n)%n,y,z:zoom,left:x*256-left,top:y*256-top});
 return {tiles,positions:xy.map(([x,y])=>[x-left,y-top])};
}
