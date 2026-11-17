import {useEffect,useState} from 'react';
import {searchWorld,placeId} from './world-places.js';
import {enrichPlaces} from './place-enrichment.js';
export default function usePlaceSearch(query,{enabled=true,context,minLength=2}={}){
 const [results,setResults]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const contextKey=context?context.lat?.toFixed(2)+','+context.lng?.toFixed(2):'';
 useEffect(()=>{setResults([]);setError('');if(!enabled||query.trim().length<minLength){setLoading(false);return;}
  const controller=new AbortController();setLoading(true);
  const timer=setTimeout(async()=>{try{
   const list=await searchWorld(query.trim(),controller.signal,context);if(controller.signal.aborted)return;setResults(list);setLoading(false);
   await enrichPlaces(list,controller.signal,patches=>setResults(list.map(p=>({...p,...patches[placeId(p)],desc:p.desc||patches[placeId(p)]?.desc,img:p.img||patches[placeId(p)]?.img}))));
  }catch(e){if(!controller.signal.aborted){setError('Не удалось выполнить поиск');setLoading(false);}}},350);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query,enabled,contextKey,minLength]);
 return {results,loading,error};
}
