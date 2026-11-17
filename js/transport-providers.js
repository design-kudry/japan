// Same-origin server contract. Provider credentials must never enter the browser.
// Deploy a server implementing these endpoints before setting TRANSPORT_API_BASE.
export class TransportProvider {
 constructor(base=globalThis.TRANSPORT_API_BASE||''){this.base=base;}
 get configured(){return Boolean(this.base);}
 async request(path,body,signal){if(!this.configured)throw Error('Поиск ещё не подключён. Можно ввести данные вручную.');const response=await fetch(this.base+path,{method:'POST',credentials:'same-origin',signal,headers:body instanceof FormData?{}:{'Content-Type':'application/json'},body:body instanceof FormData?body:JSON.stringify(body)});if(!response.ok)throw Error('Сервис временно недоступен. Попробуйте позже или введите данные вручную.');return response.json();}
 flight(number,date,signal){return this.request('/flights/lookup',{number,date},signal);}
 route(query,signal){return this.request('/journeys/search',query,signal);}
 extract(file,signal){const body=new FormData();body.append('file',file);return this.request('/tickets/extract',body,signal);}
 verify(segments,signal){return this.request('/segments/verify',{segments},signal);}
}
export const transportProvider=new TransportProvider();
