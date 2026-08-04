function getShopCategories(city='tokyo'){
  return SHOPS_BY_CITY[city]||[];
}

function getAllShops(city='tokyo'){
  const out=[];
  getShopCategories(city).forEach(cat=>{
    cat.shops.forEach(s=>out.push({...s,catId:cat.id,catTitle:cat.title,city}));
  });
  return out;
}

function shopMapsLink(s){
  if(s.url)return s.url;
  if(s.lat&&s.lng)return `https://maps.google.com/?q=${s.lat},${s.lng}`;
  return null;
}
const TYPO_WORDS='через|около|перед|после|между|ещё|уже|все|там|тут|где|или|что|как|это|при|для|про|над|под|без|под|со|об|во|не|на|но|ни|от|до|за|из|по|да|ли|же|бы|а|и|к|с|у|о|в|я';
function typografRu(s){
  if(!s)return s;
  const nbsp='\u00A0';
  return s.replace(
    new RegExp(`(^|[\\s(—–\\-«])(${TYPO_WORDS})\\s(?=[а-яёА-ЯЁ«"№0-9])`,'gi'),
    (m,pre,w)=>pre+w+nbsp
  );
}
function formatDesc(desc){
  if(!desc)return desc;
  return typografRu(desc.replace(/\.\s*$/,''));
}
function formatMoney(s){
  if(!s)return s;
  if(s==='Бесплатно'||s==='¥0')return s;
  if(/\([^)]*₽\)/.test(s))return s;
  const parts=s.split(/\s*·\s*/);
  if(parts.length!==2)return s;
  const jpy=parts[0].trim();
  const rub=parts[1].trim().replace(/\s*₽\s*$/,'').trim();
  return `${jpy} (${rub}₽)`;
}
function formatMoneyPair(jpy,rub){
  if(!rub)return jpy;
  const r=rub.replace(/\s*₽\s*$/,'').trim();
  return `${jpy} (${r}₽)`;
}
const NAME_MOB={
  'Namba Yasaka Shrine':'Namba Yasaka',
  'Kura Sushi Namba':'Kura Sushi',
  'Shinsaibashi-suji':'Shinsaibashi',
  'Nakanoshima Park':'Nakanoshima',
  'Umeda Sky Building':'Umeda Sky',
  'Sumiyoshi Taisha':'Sumiyoshi',
  'Fushimi Inari Taisha':'Fushimi Inari',
  'Nishiki Market':'Nishiki',
  'Arashiyama Bamboo':'Arashiyama',
  'Universal Studios Japan':'Universal Studios',
  'Katsuoji Temple':'Katsuoji',
  'Chureito Pagoda':'Chureito',
  'Lake Kawaguchi':'Kawaguchi',
  'Kachi Kachi Ropeway':'Kachi Ropeway',
  'Saiko Iyashi-no-Sato Nenba':'Saiko Nenba',
  'Yasukuni Shrine':'Yasukuni',
  'Koishikawa Korakuen Garden':'Koishikawa',
  'Akihabara Electric Town':'Akihabara',
  'The National Art Center':'Nat. Art Center',
  'Shibuya Crossing':'Shibuya',
  'Hachiko Statue':'Hachiko',
  'Kameido Tenjin Shrine':'Kameido Tenjin',
  'Tokyo National Museum':'Tokyo Nat. Museum',
  'Warner Bros. Studio Tour Tokyo':'Warner Bros. Studio',
  'Tsurugaoka Hachimangu':'Tsurugaoka',
  'Kotoku-in · Great Buddha':'Great Buddha',
  'Enoshima Shrine':'Enoshima',
  'Hamarikyu Gardens':'Hamarikyu',
  'teamLab Planets TOKYO':'TeamLab Planets',
  'Mori Art Museum':'Mori Art',
  'Azabudai Hills':'Azabudai',
};

const DAY_ROUTE_COLORS=['#111110','#1D4ED8','#047857','#B45309','#6D28D9','#BE185D','#0E7490','#A16207','#B91C1C','#4338CA','#0F766E','#7E22CE','#C2410C','#475569'];

function buildRegionDayRoutes(){
  const byRegion={};
  REGIONS.forEach(r=>{byRegion[r.id]=[];});
  DAYS.forEach((d,i)=>{
    const rid=DAY_REGION[i];
    const pts=d.places.filter(p=>p.lat);
    if(!pts.length)return;
    byRegion[rid].push({dayIdx:i,tab:d.tab,city:d.city,places:pts});
  });
  return byRegion;
}
const regionDayRoutes=buildRegionDayRoutes();

function dayFilterLabel(tab){
  const m=tab.match(/^(\d{1,2})\s+сент/);
  return m?`${m[1].padStart(2,'0')}.09`:tab;
}

function renderDayFilters(regionId){
  const days=regionDayRoutes[regionId];
  if(!days.length)return'';
  return`<div class="map-day-filters" data-region="${regionId}">
    <label class="map-day-filter map-day-filter--all">
      <input type="checkbox" class="map-day-cb-all" data-region="${regionId}" checked>
      Все
    </label>
    ${days.map(d=>`
    <label class="map-day-filter">
      <input type="checkbox" class="map-day-cb" data-region="${regionId}" data-day="${d.dayIdx}" checked>
      <span class="map-day-swatch" style="background:${DAY_ROUTE_COLORS[d.dayIdx%DAY_ROUTE_COLORS.length]}"></span>
      ${dayFilterLabel(d.tab)}
    </label>`).join('')}
  </div>`;
}

function renderMapGmapsBtn(id,href){
  if(href===false)return'';
  return`<div class="map-actions">
        <a class="map-btn" id="gmap-${id}" href="${href||'#'}" target="_blank" rel="noopener">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Google Maps
        </a>
      </div>`;
}

function renderShopsMap(mappedCount,{id='city-shops',title='Магазины · Токио',filtersId='shop-cat-filters'}={}){
  const loc=mappedCount===1?'магазин':mappedCount<5?'магазина':'магазинов';
  return`<div class="section-label">${mappedCount} ${loc} на карте</div>
    <div class="map-wrap" id="mapwrap-${id}">
      <div class="map-day-filters" id="${filtersId}"></div>
      <div class="map-fs-top">
        <span class="map-fs-title">${title}</span>
        <button type="button" class="map-fs-close" id="fsclose-${id}" aria-label="Закрыть карту">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="day-map" id="map-${id}"></div>
      <button type="button" class="map-btn map-btn--icon map-btn--fs" id="fsopen-${id}" aria-label="На весь экран">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/></svg>
      </button>
    </div>`;
}

function renderShopCategories(city='tokyo'){
  return getShopCategories(city).map(cat=>`
  <div class="shop-category" id="shops-${city}-${cat.id}">
    <h3 class="shop-category-title">${cat.title}${cat.jp?` <span class="shop-category-jp jp">${cat.jp}</span>`:''}</h3>
    <div class="places-grid">${cat.shops.map(s=>{
      const maps=shopMapsLink(s);
      return renderPlaceCard({
        name:s.name,jp:s.jp,desc:s.desc,
        link:maps,urlLabel:s.urlLabel||(maps?'Google Maps':null),
        img:s.img,area:s.area
      },false);
    }).join('')}</div>
  </div>`).join('');
}

function renderShopsSection(){
  const mapped=getAllShops('tokyo').filter(s=>s.lat);
  return`<div id="places-shops" class="places-view">
    <div class="city-section" id="city-shops">
      <h2 class="city-title">Магазины <span class="city-title-jp jp">ショップ</span></h2>
      ${mapped.length?renderShopsMap(mapped.length):''}
      ${renderShopCategories('tokyo')}
    </div>
  </div>`;
}

function renderCityMap(id,title,count,regionId,{gmaps}={}){
  const loc=count===1?'место':count<5?'места':'мест';
  const gmapsHref=gmaps===false?false:(typeof gmaps==='string'?gmaps:(regionId&&CITY_GMAPS[regionId])||false);
  return`<div class="section-label">${count} ${loc}</div>
    <div class="map-wrap" id="mapwrap-${id}">
      ${renderDayFilters(regionId)}
      <div class="map-fs-top">
        <span class="map-fs-title">${title}</span>
        <button type="button" class="map-fs-close" id="fsclose-${id}" aria-label="Закрыть карту">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="day-map" id="map-${id}"></div>
      <button type="button" class="map-btn map-btn--icon map-btn--fs" id="fsopen-${id}" aria-label="На весь экран">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/></svg>
      </button>
      ${renderMapGmapsBtn(id,gmapsHref)}
    </div>`;
}

function renderPlaceCard(pl,showNum){
  const num=showNum&&pl.n?`<div class="place-num">${pl.n}</div>`:'';
  const nameShort=NAME_MOB[pl.name]||pl.name;
  const photoInner=pl.img
    ?`<img class="place-photo" src="${pl.img}" alt="${pl.name}" loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    :`<div class="place-photo-placeholder" aria-hidden="true"></div>`;
  const photoErr=`<div class="place-photo-err">Изображение недоступно</div>`;
  const photoWrap=pl.link
    ?`<a class="place-photo-wrap place-photo-wrap--link" href="${pl.link}" target="_blank" rel="noopener">${photoInner}${photoErr}${num}</a>`
    :`<div class="place-photo-wrap">${photoInner}${photoErr}${num}</div>`;
  const meta=pl.link
    ?`<a class="place-meta-item place-meta-link" href="${pl.link}" target="_blank" rel="noopener">${pl.urlLabel||pl.link}</a>`
    :pl.area
    ?`<span class="place-meta-item">${pl.area}</span>`
    :`<span class="place-meta-item">${formatMoney(pl.price)}</span>${pl.hours?`<span class="place-meta-sep" aria-hidden="true"></span><span class="place-meta-item">${pl.hours}</span>`:''}`;
  return`<div class="place">
    ${photoWrap}
    <div class="place-body">
      <div class="place-head">
        <div class="place-titles">
          ${pl.jp?`<div class="place-jp jp">${pl.jp}</div>`:''}
          <div class="place-name place-name-full">${pl.name}</div>
          <div class="place-name place-name-short">${nameShort}</div>
        </div>
        <div class="place-desc">${formatDesc(pl.desc)}</div>
      </div>
      <div class="place-meta">${meta}</div>
    </div>
  </div>`;
}

function buildPlacesCatalog(){
  const byRegion={};
  REGIONS.forEach(r=>{byRegion[r.id]=[];});
  const seen=new Set();
  DAYS.forEach((d,i)=>{
    const rid=DAY_REGION[i];
    d.places.forEach(pl=>{
      if(pl.asShop)return;
      if(seen.has(pl.name))return;
      seen.add(pl.name);
      byRegion[rid].push(pl);
    });
  });
  Object.entries(EXTRA_PLACES).forEach(([rid,extras])=>{
    extras.forEach(pl=>{
      if(seen.has(pl.name))return;
      seen.add(pl.name);
      byRegion[rid].push({...pl,offRoute:true});
    });
  });
  return byRegion;
}
