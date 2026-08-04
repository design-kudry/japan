#!/usr/bin/env python3
"""Patch index.html: restore single-page + city nav under Места."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
index = (ROOT / "index.html").read_text(encoding="utf-8")
data = (ROOT / "js" / "data.js").read_text(encoding="utf-8")
shared = (ROOT / "js" / "shared.js").read_text(encoding="utf-8")
maps = (ROOT / "js" / "maps.js").read_text(encoding="utf-8")

# ── 1. Replace SHOPS with SHOP_CATEGORIES from data.js
shop_block = re.search(
    r"const SHOP_CAT_COLORS=\{.*?^\];",
    data,
    re.MULTILINE | re.DOTALL,
).group(0)
shop_block = shop_block.replace(
    "const imgPath=(f)=>encodeURI((window.SITE_BASE||'')+'image/'+f);",
    "const imgPath=(f)=>encodeURI('image/'+f);",
)
# only fix if imgPath appears in shop_block - it doesn't, uses imgPath() calls

shop_helpers = """
function getAllShops(){
  const out=[];
  SHOP_CATEGORIES.forEach(cat=>{
    cat.shops.forEach(s=>out.push({...s,catId:cat.id,catTitle:cat.title}));
  });
  return out;
}

function shopMapsLink(s){
  if(s.url)return s.url;
  if(s.lat&&s.lng)return `https://maps.google.com/?q=${s.lat},${s.lng}`;
  return null;
}
"""

index = re.sub(
    r"const SHOPS=\[[\s\S]*?\];\n\n",
    shop_block + "\n" + shop_helpers + "\n",
    index,
    count=1,
)

# ── 2. Replace renderShopsSection with full shop renderers
render_shops = re.search(
    r"function renderShopsMap\(mappedCount\)\{[\s\S]*?^function renderCityMap",
    shared,
    re.MULTILINE,
).group(0)
render_shops = render_shops.replace("function renderCityMap", "").rstrip()

render_tokyo = """
function renderTokyoShopsContent(){
  const mapped=getAllShops().filter(s=>s.lat);
  return`${mapped.length?renderShopsMap(mapped.length):''}
  ${SHOP_CATEGORIES.map(cat=>`
  <div class="shop-category" id="shops-${cat.id}">
    <h3 class="shop-category-title">${cat.title}${cat.jp?` <span class="shop-category-jp jp">${cat.jp}</span>`:''}</h3>
    <div class="places-grid">${cat.shops.map(s=>{
      const maps=shopMapsLink(s);
      return renderPlaceCard({
        name:s.name,jp:s.jp,desc:s.desc,
        link:maps,urlLabel:s.urlLabel||(maps?'Google Maps':null),
        img:s.img,area:s.area
      },false);
    }).join('')}</div>
  </div>`).join('')}`;
}

function renderCityPlacesSection(r,items){
  if(r.id==='tokyo'){
    return`<div class="places-city-view" data-city="tokyo">
      <div class="places-subnav places-subnav--tokyo">
        <button type="button" class="places-subtab active" data-tokyo-view="sights">Достопримечательности</button>
        <button type="button" class="places-subtab" data-tokyo-view="shops">Магазины</button>
      </div>
      <div class="tokyo-view tokyo-view--active" data-tokyo-view="sights">
        <h2 class="city-title">${r.name} <span class="city-title-jp jp">${r.jp}</span></h2>
        ${renderCityMap('city-tokyo',r.name,items.length,'tokyo')}
        <div class="places-grid">${items.map(pl=>renderPlaceCard(pl,false)).join('')}</div>
      </div>
      <div class="tokyo-view" data-tokyo-view="shops">
        ${renderTokyoShopsContent()}
      </div>
    </div>`;
  }
  if(!items.length)return'';
  return`<div class="places-city-view" data-city="${r.id}">
    <h2 class="city-title">${r.name} <span class="city-title-jp jp">${r.jp}</span></h2>
    ${renderCityMap('city-'+r.id,r.name,items.length,r.id)}
    <div class="places-grid">${items.map(pl=>renderPlaceCard(pl,false)).join('')}</div>
  </div>`;
}
"""

index = re.sub(
    r"function renderShopsSection\(\)\{[\s\S]*?\}\n\nfunction renderCityMap",
    render_shops + render_tokyo + "\nfunction renderCityMap",
    index,
    count=1,
)

# ── 3. Replace places panel HTML
old_panel = r"""placesPanel\.innerHTML=`[\s\S]*?\$\{renderShopsSection\(\)\}`;"""

new_panel = """placesPanel.innerHTML=`
  <div class="day-header">
    <div class="day-index">каталог</div>
    <div class="day-title"><span class="day-city">Места </span><span class="day-city-jp">スポット</span></div>
  </div>
  <div class="places-subnav places-subnav--cities">
    ${REGIONS.filter(r=>r.id==='tokyo'||placesCatalog[r.id]?.length).map((r,i)=>`
    <button type="button" class="places-subtab${i===0?' active':''}" data-places-city="${r.id}">${r.name}</button>`).join('')}
  </div>
  <div id="places-cities">
    ${REGIONS.map(r=>renderCityPlacesSection(r,placesCatalog[r.id]||[])).join('')}
  </div>`;"""

index = re.sub(old_panel, new_panel, index, count=1)

# ── 4. Replace initPlacesSubnav
init_nav = """
let activePlacesCity='osaka';
let activeTokyoView='sights';

function showPlacesCity(cityId){
  activePlacesCity=cityId;
  document.querySelectorAll('.places-subtab[data-places-city]').forEach(b=>{
    b.classList.toggle('active',b.dataset.placesCity===cityId);
  });
  document.querySelectorAll('.places-city-view').forEach(v=>{
    v.classList.toggle('places-city-view--active',v.dataset.city===cityId);
  });
  if(cityId==='tokyo')showTokyoView(activeTokyoView);
  else{
    const items=placesCatalog[cityId];
    if(items?.length)setTimeout(()=>initCityMap(cityId,items),80);
  }
}

function showTokyoView(view){
  activeTokyoView=view;
  document.querySelectorAll('.places-subtab[data-tokyo-view]').forEach(b=>{
    b.classList.toggle('active',b.dataset.tokyoView===view);
  });
  document.querySelectorAll('.tokyo-view').forEach(v=>{
    v.classList.toggle('tokyo-view--active',v.dataset.tokyoView===view);
  });
  if(view==='sights'){
    const items=placesCatalog.tokyo;
    if(items?.length)setTimeout(()=>initCityMap('tokyo',items),80);
  }else setTimeout(()=>initShopsMap(),80);
}

function initPlacesCityNav(){
  document.querySelectorAll('.places-subtab[data-places-city]').forEach(btn=>{
    btn.onclick=()=>{
      if(btn.classList.contains('active'))return;
      showPlacesCity(btn.dataset.placesCity);
    };
  });
  document.querySelectorAll('.places-subtab[data-tokyo-view]').forEach(btn=>{
    btn.onclick=()=>{
      if(btn.classList.contains('active'))return;
      showTokyoView(btn.dataset.tokyoView);
    };
  });
  showPlacesCity('osaka');
}
initPlacesCityNav();
"""

index = re.sub(
    r"function initPlacesSubnav\(\)\{[\s\S]*?\}\ninitPlacesSubnav\(\);",
    init_nav.strip(),
    index,
    count=1,
)

# ── 5. Insert initShopsMap + shopMapState
init_shops = re.search(
    r"function initShopsMap\(\)\{[\s\S]*?\}\n\nfunction initAllCityMaps",
    maps,
).group(0)
init_shops = "const shopMapState={markersByCat:null};\n\n" + init_shops.replace("\n\nfunction initAllCityMaps", "")

index = index.replace(
    "function initAllCityMaps(){",
    init_shops + "\nfunction initAllCityMaps(){",
)

# ── 6. Update ensureMapReady
index = index.replace(
    """function ensureMapReady(mapId){
  if(mapInst[mapId])return;
  const s=String(mapId);
  if(/^\\d+$/.test(s))initMap(+s);
  else if(s.startsWith('city-')){
    const regionId=s.slice(5);
    const items=placesCatalog[regionId];
    if(items?.length)initCityMap(regionId,items);
  }
}""",
    """function ensureMapReady(mapId){
  if(mapInst[mapId])return;
  const s=String(mapId);
  if(/^\\d+$/.test(s))initMap(+s);
  else if(s==='city-shops')initShopsMap();
  else if(s.startsWith('city-')){
    const regionId=s.slice(5);
    const items=placesCatalog[regionId];
    if(items?.length)initCityMap(regionId,items);
  }
}""",
)

# ── 7. Update setView
index = index.replace(
    "if(mode==='places')setTimeout(()=>initAllCityMaps(),80);",
    "if(mode==='places')setTimeout(()=>showPlacesCity(activePlacesCity||'osaka'),80);",
)

# ── 8. CSS
index = index.replace(
    """.places-view{display:none;width:100%;max-width:none}
.places-view--active{display:block}
#places-cities.places-view--active{display:contents}
#places-shops.places-view--active{display:contents}""",
    """.places-subnav--cities{margin-bottom:24px;flex-wrap:wrap}
.places-subnav--tokyo{margin:0 0 24px;flex-wrap:wrap}
.places-city-view{display:none;width:100%;max-width:none}
.places-city-view--active{display:block}
.places-city-view--active > .city-title,
.places-city-view--active > .section-label,
.places-city-view--active > .map-wrap,
.places-city-view--active > .places-grid{
  width:var(--content-w);
  max-width:calc(100vw - var(--viewport-pad));
}
.tokyo-view{display:none;width:100%}
.tokyo-view--active{display:block}
.tokyo-view--active > .city-title,
.tokyo-view--active > .section-label,
.tokyo-view--active > .map-wrap,
.tokyo-view--active > .places-grid,
.tokyo-view--active > .shop-category{
  width:var(--content-w);
  max-width:calc(100vw - var(--viewport-pad));
}""",
)

(ROOT / "index.html").write_text(index, encoding="utf-8")
print("Patched index.html")
