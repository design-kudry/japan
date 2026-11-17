const EASE='cubic-bezier(.2,.8,.2,1)';
const reducedMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const SETTLE_MS=240;

function scrollParent(node){
 let parent=node.parentElement;
 while(parent&&!/(auto|scroll)/.test(getComputedStyle(parent).overflowY))parent=parent.parentElement;
 return parent;
}

// Live reorder: the grabbed row follows the pointer, neighbours slide aside and
// the row settles into its slot before the order is committed.
export function beginSort(event,{rows:getRows,from,commit,flush=run=>run()}){
 if(event.pointerType==='mouse'&&event.button!==0)return;
 const handle=event.currentTarget,rows=getRows(),row=rows[from];
 if(!row)return;
 event.preventDefault();
 handle.focus({preventScroll:true});
 try{handle.setPointerCapture(event.pointerId);}catch{}
 const rects=rows.map(item=>item.getBoundingClientRect());
 const centers=rects.map(rect=>rect.top+rect.height/2);
 const neighbour=from<rows.length-1?rects[from+1].top-rects[from].bottom:from>0?rects[from].top-rects[from-1].bottom:0;
 const gap=Math.max(0,neighbour),span=rects[from].height+gap;
 const scroller=scrollParent(handle),scrollStart=scroller?.scrollTop||0;
 const startY=event.clientY,smooth=!reducedMotion();
 let y=startY,target=from,moved=false,frame=0,settling=false;

 const dragOffset=()=>y-startY+((scroller?.scrollTop||0)-scrollStart);
 const slotOffset=index=>{
  let offset=0;
  if(index>from)for(let i=from+1;i<=index;i++)offset+=rects[i].height+gap;
  else for(let i=index;i<from;i++)offset-=rects[i].height+gap;
  return offset;
 };
 const place=()=>{
  rows.forEach((item,i)=>{
   if(i===from)return;
   const shift=from<target&&i>from&&i<=target?-span:target<from&&i>=target&&i<from?span:0;
   item.style.transform=shift?`translate3d(0,${shift}px,0)`:'';
  });
 };
 const begin=()=>{
  moved=true;
  rows.forEach((item,i)=>{
   item.style.willChange='transform';
   if(i===from){item.style.transition='none';item.style.position='relative';item.style.zIndex='6';item.dataset.dragging='true';}
   else item.style.transition=smooth?`transform ${SETTLE_MS}ms ${EASE}`:'none';
  });
 };
 const tick=()=>{
  if(scroller){
   const bounds=scroller.getBoundingClientRect();
   if(y<bounds.top+56)scroller.scrollBy(0,-12);else if(y>bounds.bottom-56)scroller.scrollBy(0,12);
  }
  if(moved){
   const offset=dragOffset();
   row.style.transform=`translate3d(0,${offset}px,0)`;
   const center=centers[from]+offset;
   // Count how many *other* rows sit above the pointer — that is the insert index.
   let next=0;
   for(let i=0;i<centers.length;i++)if(i!==from&&centers[i]<center)next++;
   if(next!==target){target=next;place();}
  }
  frame=requestAnimationFrame(tick);
 };
 const clear=()=>{
  rows.forEach(item=>{item.style.transform='';item.style.transition='';item.style.willChange='';item.style.zIndex='';item.style.position='';delete item.dataset.dragging;});
 };
 const finish=()=>{
  handle.removeEventListener('pointermove',onMove);handle.removeEventListener('pointerup',onUp);
  handle.removeEventListener('pointercancel',onCancel);handle.removeEventListener('lostpointercapture',onCancel);
 };
 function onMove(e){if(e.pointerId!==event.pointerId)return;e.preventDefault();y=e.clientY;if(!moved&&Math.abs(y-startY)>4)begin();}
 function onUp(e){
  if(e.pointerId!==event.pointerId)return;
  cancelAnimationFrame(frame);finish();
  if(!moved||settling){clear();return;}
  settling=true;
  try{if(handle.hasPointerCapture?.(e.pointerId))handle.releasePointerCapture(e.pointerId);}catch{}
  delete row.dataset.dragging;
  row.style.transition=smooth?`transform ${SETTLE_MS}ms ${EASE}`:'none';
  row.style.transform=`translate3d(0,${slotOffset(target)}px,0)`;
  const done=()=>{if(target!==from)flush(()=>commit(from,target));clear();};
  if(smooth)setTimeout(done,SETTLE_MS+20);else done();
 }
 function onCancel(e){
  if(e.pointerId!=null&&e.pointerId!==event.pointerId)return;
  if(settling)return;
  cancelAnimationFrame(frame);finish();clear();
 }
 handle.addEventListener('pointermove',onMove,{passive:false});
 handle.addEventListener('pointerup',onUp);
 handle.addEventListener('pointercancel',onCancel);
 handle.addEventListener('lostpointercapture',onCancel);
 frame=requestAnimationFrame(tick);
}
