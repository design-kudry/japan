export const transportKinds={flight:'Самолёт',bus:'Автобус',train:'Поезд',ferry:'Паром'};
export const transportStatuses={scheduled:'По расписанию',delayed:'Задерживается',cancelled:'Отменён',departed:'Отправился',arrived:'Прибыл',unknown:'Не проверен'};
export function localDateTime(utc,zone){if(!utc)return '';const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(utc)).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
export function toUtc(local,zone){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw Error('Укажите дату и время.');
 try{new Intl.DateTimeFormat('ru',{timeZone:zone}).format();}catch{throw Error('Проверьте часовой пояс: например, Europe/London.');}
 const raw=Date.parse(local+'Z');if(!Number.isFinite(raw))throw Error('Проверьте дату и время.');
 let target=raw;for(let i=0;i<4;i++){const represented=Date.parse(localDateTime(new Date(target).toISOString(),zone)+'Z');target+=raw-represented;}
 const matches=[target-3600000,target,target+3600000].filter(t=>localDateTime(new Date(t).toISOString(),zone)===local);
 if(!matches.length)throw Error('Такого местного времени нет из-за перевода часов. Уточните время.');
 if(matches.length>1)throw Error('Время повторяется при переводе часов. Укажите часовой пояс с фиксированным смещением (например, Etc/GMT-1).');
 return new Date(target).toISOString();
}
export function minutesBetween(a,b){return Math.round((Date.parse(b)-Date.parse(a))/60000);}
export function durationLabel(m){return m<0?'Неверное время':`${Math.floor(m/60)?Math.floor(m/60)+' ч ':''}${m%60?m%60+' мин':''}`.trim()||'0 мин';}
export function connectionMinutes(a,b){return minutesBetween(a.arrivalUtc,b.departureUtc);}
export function normalizeBooking(draft,tripId){
 if(!draft.segments?.length)throw Error('Добавьте хотя бы один сегмент.');
 const segments=draft.segments.map(s=>{
  if(!transportKinds[s.kind])throw Error('Выберите транспорт.');
  if(!s.from?.name?.trim()||!s.to?.name?.trim())throw Error('Укажите пункты отправления и прибытия.');
  const departureUtc=toUtc(s.departureLocal,s.from.timeZone),arrivalUtc=toUtc(s.arrivalLocal,s.to.timeZone);
  if(minutesBetween(departureUtc,arrivalUtc)<=0)throw Error('Прибытие должно быть позже отправления с учётом часовых поясов.');
  return {...s,id:s.id||crypto.randomUUID(),from:{...s.from,name:s.from.name.trim(),code:s.from.code?.trim().toUpperCase()||''},to:{...s.to,name:s.to.name.trim(),code:s.to.code?.trim().toUpperCase()||''},departureUtc,arrivalUtc,status:s.status||'unknown'};
 });
 for(let i=1;i<segments.length;i++){if(connectionMinutes(segments[i-1],segments[i])<0)throw Error('Следующий сегмент начинается раньше прибытия предыдущего.');}
 if(draft.price!==''&&draft.price!=null&&(!Number.isFinite(Number(draft.price))||Number(draft.price)<0))throw Error('Проверьте стоимость.');
 const now=new Date().toISOString();return {id:draft.id||crypto.randomUUID(),tripId,supplier:draft.supplier?.trim()||'',pnr:draft.pnr?.trim()||'',passengers:draft.passengers||'',price:draft.price===''||draft.price==null?null:Number(draft.price),currency:draft.currency||'RUB',sourceFile:draft.sourceFile||null,segments,createdAt:draft.createdAt||now,updatedAt:now};
}
export function bookingDraft(booking){return {...booking,segments:booking.segments.map(s=>({...s,departureLocal:localDateTime(s.departureUtc,s.from.timeZone),arrivalLocal:localDateTime(s.arrivalUtc,s.to.timeZone)}))};}
export function segmentDay(s){return s.assignedDay?.startsWith('day-')?s.assignedDay:localDateTime(s.departureUtc,s.from.timeZone).slice(0,10);}

function filesDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open('travel-ticket-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Не удалось открыть хранилище билетов.'));});}
export async function ticketFile(action,id,file){const db=await filesDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('files',action==='get'?'readonly':'readwrite');const store=tx.objectStore('files');const req=action==='put'?store.put(file,id):action==='delete'?store.delete(id):store.get(id);let value;req.onsuccess=()=>value=req.result;tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(Error('Не удалось сохранить или открыть билет.'));tx.onabort=()=>reject(Error('Операция с билетом прервана.'));});}finally{db.close();}}
