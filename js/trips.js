(() => {
  const root = document.querySelector('#trips');
  const storageKey = 'japan-travel-trips-v1';
  const originalJapan=window.JapanPlaces?.places||[];
  const allowedJapan=p=>!p.asShop&&!(window.JapanPlaces?.excluded||[]).includes(p.nameEn||p.name);
  const enrichJapan=p=>{const original=originalJapan.find(x=>x.id===p.id||x.nameEn===(p.nameEn||p.name)||x.name===p.name);return original?{...p,...original,img:original.img||p.img}:p;};
  const uniqueJapan=items=>[...new Map(items.filter(allowedJapan).map(p=>{const next=enrichJapan(localizePlace(p));return [next.id||next.name+'|'+next.lat+'|'+next.lng,next];})).values()];
  const japanDays = DAYS.map(day => ({...day,places:uniqueJapan(day.places)}));
  const japanStart = '2026-09-17';
  const japanEnd = '2026-09-30';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const attr = value => escape(value);
  const placeKey = p => p.id || p.name+'|'+p.lat+'|'+p.lng;
  const dateText = (date, options = {day:'numeric',month:'long'}) => date.startsWith('day-') ? date.slice(4) : new Intl.DateTimeFormat('ru',{...options,timeZone:'UTC'}).format(new Date(date + 'T00:00:00Z'));
  const daysBetween = (start,end) => {
    const days = [];
    for (let time = Date.parse(start); time <= Date.parse(end); time += 86400000) days.push(new Date(time).toISOString().slice(0,10));
    return days;
  };
  const range = (start,end) => start.slice(0,7) === end.slice(0,7)
    ? (start === end ? dateText(start) : Number(start.slice(8))+'–'+dateText(end))
    : dateText(start)+' — '+dateText(end);
  const today = () => {
    const date = new Date();
    return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10);
  };
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {trips:[],japanTransfers:[]}; }
  catch { saved = {trips:[],japanTransfers:[]}; }
  let draft, step = 0, editId = '', citySearchOpen = false, openCityDates = -1;
  let cityResults = [], cityRequest, cityTimer, activeCity = -1;
  let pageForm = null, placeView = 'saved', placeFilter = '', placeQuery = '', currentPlace = null, placeDay = '';
  saved.japanPlaces ??= [];
  saved.japanWishlist ??= [];
  let selectedDay = '';
  let currentRoute = '';
  const persist = () => localStorage.setItem(storageKey,JSON.stringify(saved));
  const route = () => location.hash.slice(1);
  const getTrip = () => saved.trips.find(trip => trip.id === route().split('/')[1]);
  const tripPath = trip => trip ? '#trip/'+trip.id : '#japan';
  const inPlaces = () => route().endsWith('/places');
  const wishlist = trip => trip ? (trip.wishlist ??= []) : saved.japanWishlist;
  const scheduled = trip => trip ? trip.places : saved.japanPlaces;
  const name = trip => [...new Set(trip.cities.map(city => city.name))].join(', ');
  const button = (text,action,id='',className='') => `<button type="button" class="button ${className}" data-action="${action}" data-id="${attr(id)}">${escape(text)}</button>`;
  const back = (label,href='#trips') => `<a class="quiet back" href="${href}">‹ ${label}</a>`;
  const input = (label,key,type,value='',extra='') => `<label>${label}<input name="${key}" type="${type}" value="${attr(value)}" ${extra}></label>`;
  const cover = (src) => src ? `<img class="thumb" src="${attr(src)}" alt="" loading="lazy">` : '<span class="thumb" aria-hidden="true"></span>';
  const activeTripKey = 'japan-active-trip';
  const activeTrip = () => {
    let href;
    try {href = localStorage.getItem(activeTripKey);} catch {}
    return saved.trips.some(trip => tripPath(trip) === href) ? href : saved.japanDeleted ? (saved.trips[0] ? tripPath(saved.trips[0]) : '#new') : '#japan';
  };
  const shortDate = date => date.slice(8)+'.'+date.slice(5,7);
  const shortRange = (start,end) => start === end ? shortDate(start) : shortDate(start)+'–'+shortDate(end);
  function tripOptions() {
    return [...(saved.japanDeleted ? [] : [{href:'#japan',title:'Япония',date:shortRange(japanStart,japanEnd),img:japanDays.flatMap(day => day.places).find(place => place.img)?.img}]),
      ...saved.trips.map(trip => ({href:tripPath(trip),title:name(trip),date:trip.dateMode==='days' ? '' : shortRange(trip.start,trip.end),img:trip.places.find(place => place.img)?.img}))];
  }
  function createTrip() {
    GravityTrips.render(root,'new',{local:localCityMatches,remote:remoteCityMatches,save(next) {
      const count = next.dateMode==='days' ? next.dayCount-1 : (Date.parse(next.end)-Date.parse(next.start))/86400000;
      if (!next.cities.length || !Number.isFinite(count) || count < 0 || count > 365) return 'Добавьте город и выберите период до 366 дней';
      const trip = {...next,id:crypto.randomUUID(),cities:next.cities.map(city => ({name:city.name,country:city.country,start:'',end:''})),transfers:[],places:[]};
      saved.trips.push(trip);
      try {persist();} catch {saved.trips.pop();return 'Не удалось сохранить поездку в браузере';}
      location.hash = tripPath(trip);
    }});
  }
  function cityRows(details) {
    return draft.cities.map((city,index) => `<article class="city" data-city="${index}" >
      <div class="row">${details && draft.cities.length > 1 ? '<span class="legacy-city-grip" aria-hidden="true">⠿</span>' : ''}<h3>${escape(city.name)}, ${escape(city.country)}</h3>
      ${details ? `<div class="actions">${button(city.start && city.end ? range(city.start,city.end) : 'Без дат ▾','city-dates',index)}
      ${index > 0 ? `<button type="button" class="quiet" data-action="up" data-id="${index}" aria-label="Переместить ${attr(city.name)} выше">↑</button>` : ''}
      ${index < draft.cities.length-1 ? `<button type="button" class="quiet" data-action="down" data-id="${index}" aria-label="Переместить ${attr(city.name)} ниже">↓</button>` : ''}</div>`
      : `<button type="button" class="quiet" data-action="remove-city" data-id="${index}" aria-label="Убрать ${attr(city.name)}">×</button>`}</div>${details && openCityDates === index ? `<div class="fields city-dates">${input('С','city-start','date',city.start,`min="${draft.start}" max="${draft.end}"`)}${input('По','city-end','date',city.end,`min="${draft.start}" max="${draft.end}"`)}</div><div class="actions">${button('Сохранить даты','apply-city-dates',index)}${button('Без дат','clear-city-dates',index,'quiet')}</div>` : ''}</article>`).join('');
  }
  function editor() {
    const dates = daysBetween(draft.start,draft.end);
    return `<form class="form-step" id="trip-form">
      <div>${step && !editId ? button('‹ Назад','previous','','quiet') : back('Отмена',editId ? '#trip/'+editId : '#trips')}</div>
      <h1>${step ? 'Города и даты' : 'Новая поездка'}</h1>
      ${step ? `<p>${range(draft.start,draft.end)} · ${dates.length} дн.</p><p>Расположите города в нужном порядке.</p>`
      : `<p>Сначала даты, потом направления</p><div class="fields">${input('Начало поездки','start','date',draft.start,'required')}${input('Конец поездки','end','date',draft.end,'required')}</div><h2>Направления</h2>`}
      <div class="stack">${cityRows(step === 1)}${citySearchOpen ? citySearch() : button('+ Добавить город','add-city','','wide')}</div>
      ${step ? `<div class="panel"><h3>Даты городов — по желанию</h3><p>Распределите дни сейчас или после создания поездки.</p></div>
      ${editId ? '' : button('Распределить даты позже','skip-dates','','wide')}` : '<p>Можно объединить города из разных стран.</p>'}
      <p class="error" role="alert"></p>
      <div class="submit"><button class="button primary" type="submit">${step ? (editId ? 'Сохранить' : 'Создать поездку') : 'Продолжить'}</button></div></form>`;
  }
  function formPage(title,contents,submit,apply,backLabel) {
    pageForm = {title,contents,submit,apply,backLabel};
    render();
    root.scrollTo(0,0);
    root.querySelector('input,select')?.focus({preventScroll:true});
  }
  function formMarkup() {
    const {title,contents,submit,backLabel} = pageForm;
    return `<form id="page-form" class="form-step">${button('‹ '+backLabel,'close-form','','quiet back')}<h1>${title}</h1>${contents}
      <p class="error" role="alert"></p><div class="submit"><button class="button primary">${submit}</button></div></form>`;
  }
  function saveDraft(skip) {
    if (!draft.cities.length) return 'Добавьте хотя бы один город.';
    const dates = daysBetween(draft.start,draft.end);
    if (!dates.length || dates.length > 366) return 'Выберите период поездки до 366 дней.';
    if (skip) draft.cities = draft.cities.map(city => ({...city,start:'',end:''}));
    const old = saved.trips.find(item => item.id === editId);
    const trip = {...old,...draft,id:editId || crypto.randomUUID(),transfers:old?.transfers || [],places:old?.places || []};
    if (old) Object.assign(old,trip);
    else saved.trips.push(trip);
    persist();
    location.hash = 'trip/'+trip.id;
  }
  const routeEdits = trip => (trip || saved).routeEdits ??= {};
  const dayPlaces = (trip,date,index) => (routeEdits(trip)[date] ??
    [...(trip ? [] : japanDays[index]?.places || []),...scheduled(trip).filter(item => item.date === date)]).map(localizePlace);
  function itinerary(trip) {
    const isJapan = !trip;
    const dates = placeDates(trip);
    selectedDay = dates.includes(selectedDay) ? selectedDay : dates[0];
    const days = dates.map((date,index) => {
      const base = isJapan ? japanDays[index] : null;
      return {
        date,
        fallbackCity:trip?.cities[0],
        label:dateText(date,{weekday:'short',day:'numeric',month:'2-digit'}),
        city:base?.city || trip?.cities.filter(item => item.start && item.start <= date && date <= item.end).map(item => item.name).join(' · '),
        places:isJapan?uniqueJapan(dayPlaces(trip,date,index)):dayPlaces(trip,date,index),
        transfers:isJapan?[]:[...(trip?.transfers || []).filter(item => item.date === date)],
        stays:isJapan ? STAYS[DAY_REGION[index]] || [] : [],
        fullMap:isJapan ? 'japan.html#day/'+date.slice(8) : '',
      };
    });
    const tab = inPlaces() ? 'places' : route().endsWith('/expenses') ? 'expenses' : route().endsWith('/notes') ? 'notes' : 'route';
    const trips = tripOptions();
    const href = tripPath(trip);
    try {localStorage.setItem(activeTripKey,href);} catch {}
    GravityTrips.render(root,'route',{
      key:tripPath(trip),tab, placesContent:tab === 'places' ? (pageForm ? formMarkup() : currentPlace ? placeDetails(trip) : placesPage(trip)) : '',
      expenses:isJapan ? EXPENSES : [],trips,
      title:isJapan ? 'Япония' : name(trip),date:trips.find(item => item.href === href).date,current:selectedDay,days,routeHref:href,placesHref:href+'/places',
      expensesHref:href+'/expenses',citiesHref:trip && trip.dateMode!=='days' ? '#cities/'+trip.id : '',
      browsePlaces:isJapan?originalJapan:[],
      tripCities:trip?.cities||[...new Set(catalog.map(p=>p.city).filter(Boolean))].map(name=>({name,country:'Япония'})),
      editPlaces:[...new Map([...(isJapan?originalJapan:[]),...wishlist(trip).map(localizePlace)].map(item => [placeKey(item),item])).values()],
      savedPlaces:wishlist(trip).map(localizePlace),
      toggleSaved(place) {
        const items=wishlist(trip),index=items.findIndex(p=>placeKey(p)===placeKey(place));
        const previous=[...items];
        if(index<0)items.push(place);else items.splice(index,1);
        try{persist();render();return true;}catch{items.splice(0,items.length,...previous);return false;}
      },
      schedulePlace(place,date){const previous=structuredClone(saved);try{
        if(!placeDates(trip).includes(date))return 'Выберите день';
        for(const oldDate of placeDates(trip)){const entries=dayPlaces(trip,oldDate,placeDates(trip).indexOf(oldDate));if(oldDate!==date&&entries.some(p=>placeKey(p)===placeKey(place)))routeEdits(trip)[oldDate]=entries.filter(p=>placeKey(p)!==placeKey(place));}
        const message=addToDay(trip,place,date);if(message){saved=previous;return message;}render();return '';
      }catch{saved=previous;return 'Не удалось сохранить место.';}},
      removePlace(place){const previous=structuredClone(saved);try{
        for(const date of placeDates(trip)){const entries=dayPlaces(trip,date,placeDates(trip).indexOf(date));if(entries.some(p=>placeKey(p)===placeKey(place)))routeEdits(trip)[date]=entries.filter(p=>placeKey(p)!==placeKey(place));}
        persist();render();return '';
      }catch{saved=previous;return 'Не удалось убрать место из маршрута.';}},
      loadMap:loadLeaflet,
      deleteTrip() {
        const previous=structuredClone(saved);
        if(trip) saved.trips=saved.trips.filter(item=>item.id!==trip.id);
        else saved.japanDeleted=true;
        try {persist();} catch {saved=previous;return 'Не удалось удалить поездку. Попробуйте ещё раз.';}
        location.hash=activeTrip();
        render();
        return '';
      },
      onDay(date) {
        selectedDay = date;render();
      },
      saveDay(date,places) {
        const edits = routeEdits(trip);
        const previous = edits[date];
        edits[date] = places;
        try {persist();} catch {
          if (previous) edits[date] = previous;
          else delete edits[date];
          return false;
        }
        return true;
      },
      onAction(action,date) {
        handleAction(action,date);
      },
    });
  }
  function render() {
    const page = route();
    if (page === 'places') {location.replace('#japan/places');return;}
    if (page === 'expenses') {location.replace('#japan/expenses');return;}
    if (page.startsWith('day/') || page.startsWith('places')) {
      location.replace('japan.html'+location.hash);
      return;
    }
    if(saved.japanDeleted && page.startsWith('japan')) {location.replace(activeTrip());return;}
    const trip = getTrip();
    if (currentRoute !== page) {
      const baseRoute = value => value.replace(/\/(places|expenses|notes)$/,'');
      if (baseRoute(page) !== baseRoute(currentRoute)) selectedDay = '';
      pageForm = null; currentPlace = null; placeDay = ''; placeQuery = ''; placeFilter = ''; placeView = 'saved';
      citySearchOpen = false; openCityDates = -1;
      if (page === 'new') {draft = {start:today(),end:today(),cities:[]};step = 0;editId = '';}
      if (page.startsWith('cities/')) {
        const existing = saved.trips.find(item => item.id === page.slice(7));
        if (existing) {
          editId = existing.id;
          draft = structuredClone({start:existing.start,end:existing.end,cities:existing.cities});
          step = 1;
        } else {location.hash = 'trips';return;}
      }
      currentRoute = page;
    }
    const legacy = (pageForm && !inPlaces()) || page.startsWith('cities/');
    if (legacy) {
      GravityTrips.clear();
      if (pageForm) root.innerHTML = formMarkup();
      else root.innerHTML = editor();
    } else if (page === 'new') createTrip();
    else if (['japan','japan/places','japan/expenses','japan/notes'].includes(page) || trip) itinerary(trip);
    else {location.replace(activeTrip());return;}
    document.title = page === 'japan' ? 'Япония · Путешествия' : trip ? name(trip)+' · Путешествия' : 'Путешествия';
  }
  function readDates(form = document.querySelector('#trip-form')) {
    if (!form || step !== 0) return;
    const fields = new FormData(form);
    draft.start = fields.get('start');
    draft.end = fields.get('end');
  }
  function error(message) {root.querySelector('[role=alert]').textContent = message || '';}
  root.addEventListener('submit', event => {
    if (event.target.id === 'page-form') {
      event.preventDefault();
      const form = pageForm;
      const data = new FormData(event.target);
      Promise.resolve(form.apply(data)).then(message => {
        if (pageForm !== form) return;
        if (message) error(message);
        else {pageForm = null;render();}
      }).catch(() => {if (pageForm === form) error('Не удалось сохранить. Проверьте данные и попробуйте ещё раз.');});
      return;
    }
    if (event.target.id !== 'trip-form') return;
    event.preventDefault();
    if (step) return error(saveDraft(false));
    readDates(event.target);
    if (!draft.cities.length) return error('Добавьте хотя бы один город.');
    const count = (Date.parse(draft.end) - Date.parse(draft.start)) / 86400000;
    if (!Number.isFinite(count) || count < 0 || count > 365) return error('Выберите период поездки до 366 дней.');
    draft.cities = draft.cities.map(city => city.start >= draft.start && city.end <= draft.end ? city : {...city,start:'',end:''});
    step = 1;
    render();
    root.scrollTo(0,0);
  });
  function moveCity(from,to) {
    if (from === to || !draft.cities[from] || !draft.cities[to]) return;
    const [city] = draft.cities.splice(from,1);
    draft.cities.splice(to,0,city);
    render();
  }
  root.addEventListener('pointerdown',event => {
    const grip = event.target.closest('.legacy-city-grip');
    if (!grip || !window.travelSortable) return;
    const row = grip.closest('[data-city]');
    window.travelSortable({currentTarget:grip,pointerId:event.pointerId,pointerType:event.pointerType,button:event.button,clientY:event.clientY,preventDefault:() => event.preventDefault()},{
      rows:() => [...root.querySelectorAll('article[data-city]')],from:Number(row.dataset.city),commit:moveCity,
    });
  });
  const localCities = [
    ['Осака','Япония','Osaka'],['Токио','Япония','Tokyo'],['Киото','Япония','Kyoto'],['Нара','Япония','Nara'],
    ['Камакура','Япония','Kamakura'],['Йокогама','Япония','Yokohama'],['Хиросима','Япония','Hiroshima'],
    ['Сеул','Южная Корея','Seoul'],['Пусан','Южная Корея','Busan'],['Лондон','Великобритания','London'],
    ['Эдинбург','Великобритания','Edinburgh'],['Глазго','Великобритания','Glasgow'],['Манчестер','Великобритания','Manchester'],
    ['Париж','Франция','Paris'],['Рим','Италия','Rome'],['Милан','Италия','Milan'],['Берлин','Германия','Berlin'],
    ['Амстердам','Нидерланды','Amsterdam'],['Барселона','Испания','Barcelona'],['Мадрид','Испания','Madrid'],
    ['Стамбул','Турция','Istanbul'],['Дубай','ОАЭ','Dubai'],['Пекин','Китай','Beijing'],['Шанхай','Китай','Shanghai'],
    ['Бангкок','Таиланд','Bangkok'],['Нью-Йорк','США','New York'],['Москва','Россия','Moscow'],
    ['Санкт-Петербург','Россия','Saint Petersburg'],['Тула','Россия','Tula'],['Алматы','Казахстан','Almaty'],['Астана','Казахстан','Astana'],
  ];
  const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё','е').trim();
  const cityKey = city => normalize(city.name)+','+normalize(city.country);
  function citySearch() {
    return `<div class="city-search stack"><div class="row"><label>Город<input id="city-query" placeholder="Начните вводить название" type="search" role="combobox" aria-controls="city-options" aria-expanded="false" aria-autocomplete="list" autocomplete="off"></label>${button('Отмена','close-city-search','','quiet')}</div>
      <div id="city-options" role="listbox" aria-label="Подходящие города" hidden></div><p class="search-status" role="status"></p></div>`;
  }
  function updateCityOptions(message = '') {
    const list = root.querySelector('#city-options');
    if (!list) return;
    const field = root.querySelector('#city-query');
    list.hidden = !cityResults.length;
    field.setAttribute('aria-expanded',String(!list.hidden));
    if (activeCity < 0) field.removeAttribute('aria-activedescendant');
    else field.setAttribute('aria-activedescendant','city-option-'+activeCity);
    list.innerHTML = cityResults.map((city,i) => `<button type="button" id="city-option-${i}" role="option" aria-selected="${i === activeCity}" data-action="choose-city" data-id="${i}">${escape(city.name)}, ${escape(city.country)}${city.region ? ` <small>· ${escape(city.region)}</small>` : ''}</button>`).join('');
    root.querySelector('.search-status').textContent = message;
  }
  function localCityMatches(query) {
    const normalized = normalize(query.split(',')[0]);
    return localCities.filter(row => row.some((value,i) => i !== 1 && normalize(value).startsWith(normalized))).map(([name,country]) => ({name,country}));
  }
  async function remoteCityMatches(query,signal) {
    const queryParams = new URLSearchParams({name:query,language:'ru',count:'12'});
    const response = await fetch('https://geocoding-api.open-meteo.com/v1/search?'+queryParams,{signal});
    if (!response.ok) throw new Error('Geocoding unavailable');
    const data = await response.json();
    return (data.results || []).filter(item => item.name && item.country && (!item.feature_code || item.feature_code.startsWith('PPL'))).map(item => ({name:item.name,country:item.country,region:item.admin1 === item.name ? '' : item.admin1}));
  }
  function searchCities(field) {
    clearTimeout(cityTimer);
    cityRequest?.abort();
    const query = field.value.trim();
    const normalized = normalize(query.split(',')[0]);
    activeCity = -1;
    cityResults = normalized.length < 2 ? [] : localCityMatches(query);
    updateCityOptions(normalized.length >= 2 && !cityResults.length ? 'Ищем города…' : '');
    if (normalized.length < 2) return;
    const controller = new AbortController();
    cityRequest = controller;
    cityTimer = setTimeout(async () => {
      try {
        const remote = await remoteCityMatches(query,controller.signal);
        if (controller.signal.aborted || !field.isConnected) return;
        cityResults = [...new Map([...cityResults,...remote].map(city => [cityKey(city),city])).values()].slice(0,10);
        activeCity = -1;
        updateCityOptions(cityResults.length ? '' : 'Город не найден. Попробуйте другое написание.');
      } catch {
        if (!controller.signal.aborted && field.isConnected && !cityResults.length) updateCityOptions('Поиск сейчас недоступен. Попробуйте ещё раз.');
      }
    },250);
  }
  function chooseCity(index) {
    const city = cityResults[index];
    if (!city) return;
    if (draft.cities.some(item => cityKey(item) === cityKey(city))) return updateCityOptions('Этот город уже добавлен.');
    readDates();
    draft.cities.push({name:city.name,country:city.country,start:'',end:''});
    citySearchOpen = false;cityRequest?.abort();render();
    root.querySelector('[data-action="add-city"]')?.focus();
  }
  root.addEventListener('keydown',event => {
    if (event.target.id !== 'city-query') return;
    if (event.key === 'Escape') {event.preventDefault();readDates();citySearchOpen = false;render();return;}
    if (event.key === 'Enter') {event.preventDefault();if (cityResults.length) chooseCity(Math.max(0,activeCity));return;}
    if (!cityResults.length || !['ArrowDown','ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    activeCity = (activeCity < 0 ? (event.key === 'ArrowDown' ? 0 : cityResults.length-1) : (activeCity + (event.key === 'ArrowDown' ? 1 : -1) + cityResults.length) % cityResults.length);
    updateCityOptions();
    root.querySelector('#city-option-'+activeCity)?.scrollIntoView({block:'nearest'});
  });
  const catalog = [...new Map([
    ...japanDays.flatMap((day,index) => day.places.map(place => ({...place,city:REGIONS.find(region=>region.id===DAY_REGION[index])?.name||day.city}))),
    ...Object.entries(EXTRA_PLACES).flatMap(([region,places]) => places.map(place => ({...localizePlace(place),city:REGIONS.find(item => item.id === region)?.name}))),
  ].map(place => [place.name,place])).values()];
  function shownPlaces(trip) {
    const items = placeView === 'saved' ? wishlist(trip) : catalog;
    return items.filter(item => (!placeFilter || item.city === placeFilter) && normalize([item.name,item.jp,item.address,item.city,item.desc].join(' ')).includes(normalize(placeQuery)));
  }
  const placeImage = place => place.img ? `<img class="place-image" src="${attr(place.img)}" alt="" loading="lazy">` : '<span class="place-image placeholder" aria-hidden="true"></span>';
  const meta = (...parts) => parts.filter(Boolean).map(escape).join(' · ');
  const placeDates = trip => trip?.dateMode==='days' ? Array.from({length:trip.dayCount},(_,i)=>'day-'+(i+1)) : daysBetween(trip?.start || japanStart,trip?.end || japanEnd);
  function placeDayPicker(trip) {
    const dates = placeDates(trip);
    const selected = dates.includes(placeDay) ? placeDay : dates[0];
    return `<div class="days" aria-label="День посещения">${dates.map(date => `<button type="button" class="button day" data-action="place-day" data-id="${date}" aria-pressed="${date === selected}">${dateText(date,{weekday:'short',day:'numeric',month:'2-digit'})}</button>`).join('')}</div>`;
  }
  function placesPage(trip) {
    const allCities = [...new Set((placeView === 'saved' ? wishlist(trip) : catalog).map(place => place.city).filter(Boolean))].sort((a,b) => a.localeCompare(b,'ru'));
    return `<div class="stack">
      <h2>${trip ? 'Места поездки' : 'Места в Японии'}</h2>
      <div class="place-controls"><input type="search" id="place-query" aria-label="Название или адрес" placeholder="Название или адрес" value="${attr(placeQuery)}">
      <div class="tabs"><button type="button" class="button" data-action="place-tab" data-id="all" aria-pressed="${placeView === 'all'}">Все места</button>
      <button type="button" class="button" data-action="place-tab" data-id="saved" aria-pressed="${placeView === 'saved'}">Хочу посетить</button>
      ${allCities.length ? `<select id="place-filter" aria-label="Город"><option value="">Все города</option>${allCities.map(city => `<option ${city === placeFilter ? 'selected' : ''}>${escape(city)}</option>`).join('')}</select>` : ''}</div></div>
      <div id="place-results" class="stack">${placeResults(trip)}</div>
      <div class="actions">${button('+ Добавить своё место','own-place')}${placeView === 'saved' && wishlist(trip).length ? button('Разложить по дням','schedule-saved','','primary') : ''}</div></div>`;
  }
  function placeResults(trip) {
    const items = shownPlaces(trip);
    return `${placeView === 'saved' ? `<p>Без даты · ${items.length}</p>` : ''}
      ${items.length ? `<div class="place-grid">${items.map((place,i) => `<button type="button" class="place-tile" data-action="place-open" data-id="${i}">${placeImage(place)}<strong>${escape(place.name)}</strong><small>${meta(place.city,place.hours || place.address)}</small></button>`).join('')}</div>`
      : `<p class="panel">${placeQuery || placeFilter ? 'Ничего не найдено.' : 'Пока здесь пусто. Выберите место в каталоге или добавьте своё.'}</p>`}`;
  }
  const safeUrl = value => /^https?:\/\//i.test(value || '') ? value : '';
  function placeDetails(trip) {
    const place = currentPlace;
    const date = placeDay || placeDates(trip)[0];
    const mapQuery = Number.isFinite(place.lat) ? place.lat+','+place.lng : place.address;
    const link = safeUrl(place.link) || (mapQuery ? 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(mapQuery) : '');
    const stored = wishlist(trip).some(item => placeKey(item) === placeKey(place));
    return `<section class="stack place-detail">${button('‹ Места','place-back','','quiet back')}
      ${placeImage(place)}<h1>${escape(place.name)}</h1><p>${meta(place.city,place.address)}</p><p>${escape(place.desc)}</p><p>${meta(place.hours,place.price)}</p>
      ${link ? `<a href="${attr(link)}" target="_blank" rel="noopener">Открыть место ↗</a>` : ''}
      <h2>Можно сразу выбрать день</h2>${placeDayPicker(trip)}
      <p class="error" role="alert"></p>${button('Добавить на '+dateText(date),'place-schedule','','wide')}
      ${stored ? '<p>Место в «Хочу посетить»</p>' : button('В «Хочу посетить»','place-save','','primary wide')}</section>`;
  }
  function addToDay(trip,place,date) {
    if (!place || !placeDates(trip).includes(date)) return 'Выберите место и день.';
    const existing = dayPlaces(trip,date,placeDates(trip).indexOf(date)).some(item => placeKey(item) === placeKey(place));
    if (existing) return 'Это место уже есть в выбранном дне.';
    (routeEdits(trip)[date] ?? scheduled(trip)).push({...place,date});
    persist();
  }
  function assignPlace(trip,place,date) {
    const message = addToDay(trip,place,date);
    if (message) return error(message);
    selectedDay = date;
    location.hash = tripPath(trip);
  }
  function scheduleSaved(trip) {
    const items = wishlist(trip);
    const options = items.map((item,i) => `<option value="${i}">${escape(item.name)}</option>`).join('');
    const dates = placeDates(trip).map(date => `<option value="${date}" ${date === selectedDay ? 'selected' : ''}>${dateText(date)}</option>`).join('');
    formPage('Разложить по дням',`<label>Место<select name="place">${options}</select></label><label>День<select name="date">${dates}</select></label>`,'Добавить в день',data => {
      const date = data.get('date');
      const message = addToDay(trip,items[Number(data.get('place'))],date);
      if (message) return message;
      selectedDay = date;
      location.hash = tripPath(trip);
    },'Места');
  }
  function photoData(file) {
    return new Promise((resolve,reject) => {
      const photo = new Image();
      const url = URL.createObjectURL(file);
      photo.onerror = () => {URL.revokeObjectURL(url);reject(new Error('Invalid photo'));};
      photo.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1,800/Math.max(photo.width,photo.height));
          canvas.width = Math.max(1,Math.round(photo.width*scale));canvas.height = Math.max(1,Math.round(photo.height*scale));
          canvas.getContext('2d').drawImage(photo,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',.75));
        } catch (error) {reject(error);}
        finally {URL.revokeObjectURL(url);}
      };
      photo.src = url;
    });
  }
  function ownPlace(trip) {
    const cities = (trip?.cities || REGIONS).map(city => city.name);
    formPage('Добавить место',`<label class="panel">+ Добавить фотографию<input type="file" name="photo" accept="image/*"></label>
      <label>Способ добавления<select name="method" id="place-method"><option value="address">Адрес</option><option value="link">Ссылка</option><option value="map">На карте</option></select></label>
      ${input('Название','name','text','','required maxlength="120"')}
      <label>Город<select name="city"><option value="">Без города</option>${[...new Set(cities)].map(city => `<option>${escape(city)}</option>`).join('')}</select></label>
      <div data-place-field="address">${input('Адрес','address','text','','maxlength="180"')}</div>
      <div data-place-field="link" hidden>${input('Ссылка','link','url','','disabled')}</div>
      <div class="stack" data-place-field="map" hidden><div id="own-map" aria-label="Карта для выбора точки"></div><p>Нажмите на карту или введите координаты.</p><div class="fields">${input('Широта','lat','number','','step="any" min="-90" max="90" disabled')}${input('Долгота','lng','number','','step="any" min="-180" max="180" disabled')}</div></div>
      ${input('Заметка','desc','text','','maxlength="500"')}<p>Сохраним в «Хочу посетить». День можно выбрать позже.</p>`,'Сохранить место',async data => {
      const {name,city,address,link,lat,lng,desc,method,photo} = Object.fromEntries(data);
      if (!name.trim()) return 'Укажите название места.';
      if (method === 'link' && !safeUrl(link)) return 'Введите ссылку, которая начинается с https:// или http://.';
      if (method === 'map' && (!lat || !lng)) return 'Укажите точку на карте или заполните обе координаты.';
      const items = wishlist(trip);
      if (items.some(item => item.name === name.trim())) return 'Это место уже сохранено.';
      const form = pageForm;
      const img = photo.size ? await photoData(photo) : '';
      if (pageForm !== form) return;
      items.push({name:name.trim(),city,address:address?.trim(),link,lat:lat ? Number(lat) : undefined,lng:lng ? Number(lng) : undefined,desc,img});
      try {persist();} catch {items.pop();return 'Не удалось сохранить. Попробуйте фотографию меньшего размера.';}
      currentPlace = null;placeView = 'saved';placeFilter = '';placeQuery = '';
      if (!inPlaces()) location.hash = tripPath(trip)+'/places';
    },'Места');
  }
  let leaflet;
  function loadLeaflet() {
    return leaflet ??= new Promise((resolve,reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.append(css);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = resolve;script.onerror = reject;document.head.append(script);
    });
  }
  function ownMap(form) {
    const target = form.querySelector('#own-map');
    if (target.dataset.started) return;
    target.dataset.started = 'true';
    loadLeaflet().then(() => {
      if (!target.isConnected || target.parentElement.hidden) {delete target.dataset.started;return;}
      const map = L.map(target).setView(getTrip() ? [20,0] : [35.68,139.69],getTrip() ? 2 : 5);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'© OpenStreetMap contributors © CARTO',maxZoom:19}).addTo(map);
      let marker;
      map.on('click',({latlng}) => {
        form.elements.lat.value = latlng.lat.toFixed(5);
        form.elements.lng.value = ((latlng.lng+540)%360-180).toFixed(5);
        if (marker) marker.setLatLng(latlng);
        else marker = L.circleMarker(latlng,{radius:7,color:'#111110'}).addTo(map);
      });
      form.elements.method.addEventListener('change',() => {if (form.elements.method.value === 'map') requestAnimationFrame(() => map.invalidateSize());});
    }).catch(() => {target.textContent = 'Карта сейчас недоступна. Введите координаты ниже.';});
  }
  root.addEventListener('input',event => {
    if (event.target.id === 'city-query') return searchCities(event.target);
    if (event.target.id === 'place-query') {
      placeQuery = event.target.value;
      root.querySelector('#place-results').innerHTML = placeResults(getTrip());
    }
  });
  root.addEventListener('change',event => {
    if (event.target.id === 'place-filter') {placeFilter = event.target.value;root.querySelector('#place-results').innerHTML = placeResults(getTrip());}
    if (event.target.id === 'place-method') {
      const form = event.target.form;
      for (const group of form.querySelectorAll('[data-place-field]')) {
        group.hidden = group.dataset.placeField !== event.target.value;
        for (const input of group.querySelectorAll('input')) input.disabled = group.hidden;
      }
      if (event.target.value === 'map') ownMap(form);
    }
  });
  root.addEventListener('click', event => {
    const control = event.target.closest('[data-action]');
    if (!control) return;
    handleAction(control.dataset.action,control.dataset.id);
  });
  function handleAction(action,id) {
    const index = Number(id);
    const trip = getTrip();
    switch (action) {
      case 'previous': step = 0;render();return;
      case 'add-city':
        readDates();citySearchOpen = true;cityResults = [];activeCity = -1;render();root.querySelector('#city-query').focus();return;
      case 'choose-city': return chooseCity(index);
      case 'close-city-search': readDates();citySearchOpen = false;render();return;
      case 'remove-city': readDates();draft.cities.splice(index,1);render();return;
      case 'up': return moveCity(index,index-1);
      case 'down': return moveCity(index,index+1);
      case 'city-dates': openCityDates = openCityDates === index ? -1 : index;render();return;
      case 'clear-city-dates':
      case 'apply-city-dates': {
        const row = root.querySelector(`[data-city="${index}"]`);
        const start = row.querySelector('[name=city-start]'), end = row.querySelector('[name=city-end]');
        if (action === 'apply-city-dates' && (!start.reportValidity() || !end.reportValidity() || Boolean(start.value) !== Boolean(end.value) || start.value > end.value)) return error('Выберите обе даты в правильном порядке.');
        Object.assign(draft.cities[index],{start:action === 'clear-city-dates' ? '' : start.value,end:action === 'clear-city-dates' ? '' : end.value});
        openCityDates = -1;render();return;
      }
      case 'skip-dates': return error(saveDraft(true));
      case 'edit-cities': location.hash = 'cities/'+trip.id;return;
      case 'place-tab': placeView = id;placeFilter = '';render();return;
      case 'place-open':
        currentPlace = shownPlaces(trip)[index];placeDay = selectedDay || trip?.start || japanStart;render();root.scrollTo(0,0);return;
      case 'place-back': currentPlace = null;render();return;
      case 'place-day': placeDay = id;render();root.querySelector('[data-action="place-day"][aria-pressed=true]')?.scrollIntoView({block:'nearest',inline:'nearest'});return;
      case 'place-save': {
        const items = wishlist(trip);
        if (!items.some(item => item.name === currentPlace.name)) items.push(currentPlace);
        persist(); currentPlace = null; placeView = 'saved';placeFilter = '';placeQuery = '';render();return;
      }
      case 'place-schedule': return assignPlace(trip,currentPlace,placeDay);
      case 'schedule-saved': return scheduleSaved(trip);
      case 'close-form': pageForm = null;render();return;
      case 'own-place': return ownPlace(trip);
      case 'add-transfer':
        return formPage('Добавить переезд',`<label>Транспорт<select name="kind"><option>Поезд</option><option>Самолёт</option><option>Автобус</option><option>Автомобиль</option><option>Паром</option></select></label>
          <div class="fields">${input('Откуда','from','text','','required maxlength="100"')}${input('Куда','to','text','','required maxlength="100"')}</div>
          <div class="fields">${input('Отправление','start','time')}${input('Прибытие','end','time')}</div>
          ${input('Заметка','note','text','','maxlength="200"')}`,'Добавить переезд',data => {
          const {kind,from,to,start,end,note} = Object.fromEntries(data);
          if (!from.trim() || !to.trim()) return 'Укажите пункты отправления и прибытия.';
          const items = trip ? trip.transfers : saved.japanTransfers;
          const icons = {'Поезд':'train','Самолёт':'plane','Автобус':'bus'};
          items.push({date:id,icon:icons[kind],route:kind+' · '+from.trim()+' → '+to.trim(),detail:[[start,end].filter(Boolean).join('–'),note.trim()].filter(Boolean).join(' · ')});
          persist();
        },'Маршрут');
    }
  }
  window.addEventListener('japan-photos-ready',()=>{if(!document.querySelector('[role=dialog]')&&!location.hash.endsWith('/places'))render();});
  window.addEventListener('hashchange', () => {
    render();
    root.scrollTo(0,0);
  });
  render();
})();
