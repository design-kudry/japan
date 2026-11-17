const valid=p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng);
const colors=['#0088ff','#d55e00','#009e73','#a855b8','#c78b00','#e25486','#5367be','#687d29'];
export function dayRouteFeatures(days,current){
 return {type:'FeatureCollection',features:days.flatMap((day,index)=>{
  index=day.colorIndex??index;
  const points=(day.places||[]).filter(valid);
  return points.length<2?[]:[{type:'Feature',properties:{date:day.date,color:colors[index]||`hsl(${Math.round(index*137.508)%360} 65% 42%)`,width:day.date===current?3.5:2.5,opacity:day.date===current?1:.65},geometry:{type:'LineString',coordinates:points.map(p=>[p.lng,p.lat])}}];
 }).sort((a,b)=>Number(a.properties.date===current)-Number(b.properties.date===current))};
}
