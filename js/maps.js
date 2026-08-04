const mapInst={};
const cityMapState={};
const shopMapState={markersByCat:null};
let fsMapId=null;
let fsRestore=null;

function ensureMapReady(mapId){
  if(mapInst[mapId])return;
  const s=String(mapId);
  if(/^\d+$/.test(s))initMap(+s);
  else if(s==='city-shops')initShopsMap();
  else if(s.startsWith('city-')){
    const regionId=s.slice(5);
    const items=buildPlacesCatalog()[regionId];
    if(items?.length)initCityMap(regionId,items);
  }
}

function resizeMap(mapId){
  const m=mapInst[mapId];
  if(!m)return;
  m.invalidateSize();
}

function buildGmapsUrl(pts){
  if(!pts||!pts.length)return'#';
  if(pts.length===1)return`https://www.google.com/maps/search/?api=1&query=${pts[0].lat},${pts[0].lng}`;
  const o=`${pts[0].lat},${pts[0].lng}`,de=`${pts[pts.length-1].lat},${pts[pts.length-1].lng}`;
  const wp=pts.slice(1,-1).map(p=>`${p.lat},${p.lng}`).join('|');
  let url=`https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${de}&travelmode=walking`;
  if(wp)url+=`&waypoints=${encodeURIComponent(wp)}`;
  return url;
}

function buildGmapsCenterUrl(pts){
  if(!pts||!pts.length)return'#';
  const lat=pts.reduce((s,p)=>s+p.lat,0)/pts.length;
  const lng=pts.reduce((s,p)=>s+p.lng,0)/pts.length;
  return`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function formatRub(n){
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ')+' ₽';
}

function getRegionStays(regionId){
  const s=STAYS[regionId];
  return s?Array.isArray(s)?s:[s]:[];
}

function stayPopupHtml(stay){
  const price=stay.priceRub?`<div class="popup-sub" style="font-style:normal;margin-top:6px">${formatRub(stay.priceRub)} · ${formatRub(stay.priceRub/2)}/чел</div>`:'';
  const dates=stay.dates?`<div class="popup-sub" style="font-style:normal">${stay.dates}</div>`:'';
  const link=stay.link?`<a class="popup-link" href="${stay.link}" target="_blank" rel="noopener">Trip.com</a>`:'';
  const photo=stay.img?`<img class="popup-img" src="${stay.img}" alt="" loading="lazy" onerror="this.style.display='none'">`:'';
  return`${photo}
    <div class="popup-name">${stay.name}</div>
    <div class="popup-sub">${stay.jp||''}</div>
    <div class="popup-sub" style="font-style:normal;margin-top:6px;line-height:1.35">${stay.address}</div>
    ${dates}${price}${link}`;
}

function fitMapToPoints(map,pts,regionId,padding=0.25){
  const coords=pts.filter(p=>p.lat).map(p=>[p.lat,p.lng]);
  getRegionStays(regionId).forEach(stay=>coords.push([stay.lat,stay.lng]));
  if(!coords.length)return;
  if(coords.length===1)map.setView(coords[0],14);
  else map.fitBounds(L.latLngBounds(coords).pad(padding));
}

function addStayMarkers(map,regionId){
  getRegionStays(regionId).forEach(stay=>{
    const kind=stay.kind==='apt'?'apt':'home';
    const fallback=kind==='apt'?'#6D28D9':'#C2410C';
    const html=stay.img
      ?`<div class="photo-marker photo-marker--${kind}" title="${stay.name}">
          <img src="${stay.img}" alt="" loading="lazy"
            onerror="this.style.display='none';this.parentNode.style.background='${fallback}'">
        </div>`
      :`<div class="stay-marker stay-marker--${kind}" title="${stay.name}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z"/><path d="M9 21V12h6v9"/></svg>
        </div>`;
    const icon=L.divIcon({className:'',html,iconSize:[38,38],iconAnchor:[19,19],popupAnchor:[0,-22]});
    L.marker([stay.lat,stay.lng],{icon}).addTo(map).bindPopup(stayPopupHtml(stay));
  });
}

function createMap(mapId,pts,{numbered=false,route=false,regionId=null}={}){
  const el=document.getElementById('map-'+mapId);
  if(!el||!pts.length)return null;
  const map=L.map(el,{zoomControl:false,scrollWheelZoom:false,attributionControl:false});
  L.control.zoom({position:'topright'}).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);
  if(route&&pts.length>1)L.polyline(pts.map(p=>[p.lat,p.lng]),{color:'#111110',weight:2,opacity:.5,dashArray:'5,5'}).addTo(map);
  pts.forEach((pl,idx)=>{
    const n=idx+1;
    const badge=numbered?`<div class="badge">${n}</div>`:'';
    const offCls=pl.offRoute?' photo-marker--off-route':'';
    const html=`<div class="photo-marker${offCls}" title="${pl.name}">
      <img src="${pl.img}" alt="" loading="lazy"
        onerror="this.style.display='none';this.parentNode.style.background='#888'">
      ${badge}
    </div>`;
    const icon=L.divIcon({className:'',html,iconSize:[38,38],iconAnchor:[19,19],popupAnchor:[0,-22]});
    const offNote=pl.offRoute?'<div class="popup-sub" style="color:#E53935;font-style:normal">не в маршруте</div>':'';
    L.marker([pl.lat,pl.lng],{icon}).addTo(map).bindPopup(`
      <img class="popup-img" src="${pl.img}" alt="" loading="lazy" onerror="this.style.display='none'">
      <div class="popup-name">${numbered?n+'. ':''}${pl.name}</div>
      <div class="popup-sub">${pl.jp||''} · ${pl.price}</div>
      ${offNote}
    `);
  });
  addStayMarkers(map,regionId);
  fitMapToPoints(map,pts,regionId,0.25);
  setTimeout(()=>map.invalidateSize(),0);
  const gmap=document.getElementById('gmap-'+mapId);
  if(gmap)gmap.href=route?buildGmapsUrl(pts):buildGmapsCenterUrl(pts);
  return map;
}

function initMap(i){
  if(mapInst[i])return;
  const pts=DAYS[i].places.filter(p=>p.lat);
  const map=createMap(i,pts,{numbered:true,route:true,regionId:DAY_REGION[i]});
  if(map)mapInst[i]=map;
}

function initCityMap(regionId,places){
  const mapId='city-'+regionId;
  if(mapInst[mapId])return;
  const el=document.getElementById('map-'+mapId);
  const pts=places.filter(p=>p.lat);
  if(!el||!pts.length)return;
  const map=L.map(el,{zoomControl:false,scrollWheelZoom:false,attributionControl:false});
  L.control.zoom({position:'topright'}).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);

  const dayLines={};
  (regionDayRoutes[regionId]||[]).forEach(dr=>{
    if(dr.places.length<2)return;
    const color=DAY_ROUTE_COLORS[dr.dayIdx%DAY_ROUTE_COLORS.length];
    dayLines[dr.dayIdx]=L.polyline(dr.places.map(p=>[p.lat,p.lng]),{
      color,weight:2.5,opacity:0.75,dashArray:'6,5',
    }).addTo(map);
  });

  pts.forEach(pl=>{
    const offCls=pl.offRoute?' photo-marker--off-route':'';
    const html=`<div class="photo-marker${offCls}" title="${pl.name}">
      <img src="${pl.img}" alt="" loading="lazy"
        onerror="this.style.display='none';this.parentNode.style.background='#888'">
    </div>`;
    const icon=L.divIcon({className:'',html,iconSize:[38,38],iconAnchor:[19,19],popupAnchor:[0,-22]});
    const offNote=pl.offRoute?'<div class="popup-sub" style="color:#E53935;font-style:normal">не в маршруте</div>':'';
    L.marker([pl.lat,pl.lng],{icon}).addTo(map).bindPopup(`
      <img class="popup-img" src="${pl.img}" alt="" loading="lazy" onerror="this.style.display='none'">
      <div class="popup-name">${pl.name}</div>
      <div class="popup-sub">${pl.jp||''} · ${pl.price}</div>
      ${offNote}
    `);
  });

  addStayMarkers(map,regionId);
  fitMapToPoints(map,pts,regionId,0.22);
  setTimeout(()=>map.invalidateSize(),0);
  const gmap=document.getElementById('gmap-'+mapId);
  if(gmap)gmap.href=buildGmapsCenterUrl(pts);
  mapInst[mapId]=map;
  cityMapState[regionId]={map,dayLines};
  wireDayFilters(regionId);
}

function wireDayFilters(regionId){
  const wrap=document.querySelector(`.map-day-filters[data-region="${regionId}"]`);
  const state=cityMapState[regionId];
  if(!wrap||!state)return;
  const allCb=wrap.querySelector('.map-day-cb-all');
  const dayCbs=[...wrap.querySelectorAll('.map-day-cb')];
  if(!allCb||!dayCbs.length)return;

  function updateRoutes(){
    const showAll=allCb.checked;
    dayCbs.forEach(cb=>{
      const line=state.dayLines[+cb.dataset.day];
      if(!line)return;
      const show=showAll||cb.checked;
      if(show){
        if(!state.map.hasLayer(line))line.addTo(state.map);
      }else{
        state.map.removeLayer(line);
      }
    });
  }

  allCb.addEventListener('change',()=>{
    if(allCb.checked)dayCbs.forEach(cb=>{cb.checked=true;});
    updateRoutes();
  });
  dayCbs.forEach(cb=>{
    cb.addEventListener('change',()=>{
      if(!cb.checked)allCb.checked=false;
      else if(dayCbs.every(c=>c.checked))allCb.checked=true;
      updateRoutes();
    });
  });
}

function initShopsMap(){
  const mapId='city-shops';
  if(mapInst[mapId])return;
  const el=document.getElementById('map-'+mapId);
  const allShops=getAllShops().filter(s=>s.lat);
  if(!el||!allShops.length)return;

  const filtersEl=document.getElementById('shop-cat-filters');
  const catsWithCoords=SHOP_CATEGORIES.filter(c=>c.shops.some(s=>s.lat));
  if(filtersEl){
    filtersEl.innerHTML=`
      <label class="map-day-filter map-day-filter--all">
        <input type="checkbox" id="shop-cb-all" checked> Все
      </label>
      ${catsWithCoords.map(c=>`
      <label class="map-day-filter">
        <input type="checkbox" class="shop-cb-cat" data-cat="${c.id}" checked>
        <span class="map-day-swatch" style="background:${SHOP_CAT_COLORS[c.id]}"></span>
        ${c.title}
      </label>`).join('')}`;
  }

  const map=L.map(el,{zoomControl:false,scrollWheelZoom:false,attributionControl:false});
  L.control.zoom({position:'topright'}).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);

  const markersByCat={};
  allShops.forEach(s=>{
    const color=SHOP_CAT_COLORS[s.catId]||'#111110';
    const imgHtml=s.img
      ?`<img src="${s.img}" alt="" loading="lazy" onerror="this.style.display='none';this.parentNode.style.background='#888'">`
      :'';
    const html=`<div class="photo-marker" style="border-color:${color}" title="${s.name}">${imgHtml}</div>`;
    const icon=L.divIcon({className:'',html,iconSize:[38,38],iconAnchor:[19,19],popupAnchor:[0,-22]});
    const addr=s.address?`<div class="popup-sub">${s.address}</div>`:'';
    const maps=shopMapsLink(s);
    const marker=L.marker([s.lat,s.lng],{icon}).addTo(map).bindPopup(`
      ${s.img?`<img class="popup-img" src="${s.img}" alt="" loading="lazy" onerror="this.style.display='none'">`:''}
      <div class="popup-name">${s.name}</div>
      <div class="popup-sub">${s.jp||''}${s.area?' · '+s.area:''}</div>
      ${addr}
      ${maps?`<a class="place-meta-link" style="display:block;margin-top:8px" href="${maps}" target="_blank" rel="noopener">Google Maps</a>`:''}
    `);
    if(!markersByCat[s.catId])markersByCat[s.catId]=[];
    markersByCat[s.catId].push(marker);
  });

  addStayMarkers(map,'tokyo');
  fitMapToPoints(map,allShops,'tokyo',0.15);
  setTimeout(()=>map.invalidateSize(),0);
  const gmap=document.getElementById('gmap-'+mapId);
  if(gmap)gmap.href=buildGmapsCenterUrl(allShops);
  mapInst[mapId]=map;
  shopMapState.map=map;
  shopMapState.markersByCat=markersByCat;

  if(!filtersEl)return;
  const allCb=filtersEl.querySelector('#shop-cb-all');
  const catCbs=[...filtersEl.querySelectorAll('.shop-cb-cat')];
  function updateMarkers(){
    const showAll=allCb.checked;
    catCbs.forEach(cb=>{
      const list=markersByCat[cb.dataset.cat]||[];
      const show=showAll||cb.checked;
      list.forEach(m=>{
        if(show){if(!map.hasLayer(m))m.addTo(map);}
        else map.removeLayer(m);
      });
    });
  }
  allCb.addEventListener('change',()=>{
    if(allCb.checked)catCbs.forEach(cb=>{cb.checked=true;});
    updateMarkers();
  });
  catCbs.forEach(cb=>{
    cb.addEventListener('change',()=>{
      if(!cb.checked)allCb.checked=false;
      else if(catCbs.every(c=>c.checked))allCb.checked=true;
      updateMarkers();
    });
  });
}

function initAllCityMaps(){
  REGIONS.forEach(r=>{
    const items=buildPlacesCatalog()[r.id];
    if(items.length)initCityMap(r.id,items);
  });
  setTimeout(()=>{
    REGIONS.forEach(r=>{
      const m=mapInst['city-'+r.id];
      if(m)m.invalidateSize();
    });
  },120);
}

function openMapFullscreen(mapId){
  const wrap=document.getElementById('mapwrap-'+mapId);
  if(!wrap||fsMapId!==null)return;
  ensureMapReady(mapId);
  fsMapId=mapId;
  const placeholder=document.createComment('map-fs-'+mapId);
  wrap.parentNode.insertBefore(placeholder,wrap.nextSibling);
  fsRestore={placeholder};
  document.body.appendChild(wrap);
  wrap.classList.add('map-wrap--fullscreen');
  document.body.classList.add('map-fs-open');
  const m=mapInst[mapId];
  if(m)m.scrollWheelZoom.enable();
  resizeMap(mapId);
  requestAnimationFrame(()=>{
    resizeMap(mapId);
    setTimeout(()=>resizeMap(mapId),80);
    setTimeout(()=>resizeMap(mapId),250);
  });
}

function closeMapFullscreen(){
  if(fsMapId===null)return;
  const id=fsMapId;
  const wrap=document.getElementById('mapwrap-'+id);
  if(wrap){
    wrap.classList.remove('map-wrap--fullscreen');
    const ph=fsRestore?.placeholder;
    if(ph?.parentNode){
      ph.parentNode.insertBefore(wrap,ph);
      ph.remove();
    }
  }
  document.body.classList.remove('map-fs-open');
  fsMapId=null;
  fsRestore=null;
  const m=mapInst[id];
  if(!m)return;
  m.scrollWheelZoom.disable();
  requestAnimationFrame(()=>{
    resizeMap(id);
    setTimeout(()=>resizeMap(id),50);
    setTimeout(()=>resizeMap(id),200);
    setTimeout(()=>resizeMap(id),400);
  });
}

document.addEventListener('click',e=>{
  const openBtn=e.target.closest('.map-btn--fs');
  if(openBtn){
    e.preventDefault();
    e.stopPropagation();
    openMapFullscreen(openBtn.id.replace('fsopen-',''));
    return;
  }
  if(e.target.closest('.map-fs-close')){
    e.preventDefault();
    e.stopPropagation();
    closeMapFullscreen();
  }
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&fsMapId!==null)closeMapFullscreen();
  if(e.key==='Escape'&&document.body.classList.contains('menu-open'))closeMobileMenu();
});
