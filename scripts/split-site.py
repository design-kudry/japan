#!/usr/bin/env python3
"""Split monolithic index.html into multi-page site."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
text = INDEX.read_text(encoding="utf-8")

# Extract inline script
m = re.search(r"<script>\n(.*)\n</script>\n</body>", text, re.DOTALL)
if not m:
    raise SystemExit("Could not find script block")
script = m.group(1)
lines = script.splitlines()

def slice_lines(start, end):
    return "\n".join(lines[start - 866:end - 866 + 1 if end >= 866 else 0])

# Line numbers in original file (1-based)
DATA_END = 1218  # through SHOP_CATEGORIES
EXTRA_START, EXTRA_END = 1234, 1239
EXPENSES_START, EXPENSES_END = 1575, 1608

data_part1 = "\n".join(lines[: DATA_END - 866 + 1])
data_part1 += "\n" + "\n".join(lines[EXTRA_START - 866 : EXTRA_END - 866 + 1])
expenses_block = "\n".join(lines[EXPENSES_START - 866 : EXPENSES_END - 866 + 1])

# Fix imgPath for subdirs
data_part1 = data_part1.replace(
    "const imgPath=(f)=>encodeURI('image/'+f);",
    "const imgPath=(f)=>encodeURI((window.SITE_BASE||'')+'image/'+f);",
)

# shared.js: getAllShops through buildPlacesCatalog (skip EXTRA_PLACES block in data)
shared_a = "\n".join(lines[1220 - 866 : 1232 - 866 + 1])
shared_b = "\n".join(lines[1241 - 866 : 1463 - 866 + 1])
shared = shared_a + "\n" + shared_b.replace("const cityMapState={};\n", "")

# maps.js: map init through fullscreen handlers
maps_start = 1650 - 866
maps_end = 2014 - 866
maps = "\n".join(lines[maps_start : maps_end + 1])
maps = maps.replace("const shopMapState={markersByCat:null};\n\n", "")
maps = """const mapInst={};
const cityMapState={};
const shopMapState={markersByCat:null};
let fsMapId=null;
let fsRestore=null;

""" + maps

# nav.js
nav_js = r"""
function siteUrl(path) {
  const base = window.SITE_BASE || '';
  return base + path;
}

function renderSiteNav(opts) {
  const page = opts.page || 'route';
  const city = opts.city || null;
  const base = window.SITE_BASE || '';
  const placesBase = base + (page === 'places' ? '' : 'places/');

  const cityLinks = REGIONS.map(r => {
    const href = page === 'places' ? (r.id === city ? '#' : r.id + '.html') : placesBase + r.id + '.html';
    const cls = page === 'places' && r.id === city ? ' site-nav-link active' : ' site-nav-link';
    return `<a href="${href}" class="site-nav-places-link${cls}">${r.name}</a>`;
  }).join('');

  const nav = document.getElementById('site-nav');
  if (!nav) return;
  nav.innerHTML = `
  <div class="site-nav-bar">
    <a class="site-nav-brand" href="${siteUrl('index.html')}">Япония · 17–30 сент</a>
    <button type="button" class="burger-btn" id="burger-btn" aria-label="Меню" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <div class="site-nav-inner" id="site-nav-inner">
      <a href="${siteUrl('index.html')}" class="site-nav-link${page === 'route' ? ' active' : ''}">Маршрут</a>
      <div class="site-nav-group">
        <span class="site-nav-label">Места</span>
        <div class="site-nav-places">${cityLinks}</div>
      </div>
      <a href="${siteUrl('shops.html')}" class="site-nav-link${page === 'shops' ? ' active' : ''}">Магазины</a>
      <a href="${siteUrl('expenses.html')}" class="site-nav-link${page === 'expenses' ? ' active' : ''}">Расходы</a>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu">
    <a href="${siteUrl('index.html')}" class="mobile-menu-item${page === 'route' ? ' active' : ''}">Маршрут</a>
    <div class="mobile-menu-section">Места</div>
    ${REGIONS.map(r => `<a href="${placesBase}${r.id}.html" class="mobile-menu-item mobile-menu-item--sub${page === 'places' && r.id === city ? ' active' : ''}">${r.name}</a>`).join('')}
    <a href="${siteUrl('shops.html')}" class="mobile-menu-item${page === 'shops' ? ' active' : ''}">Магазины</a>
    <a href="${siteUrl('expenses.html')}" class="mobile-menu-item${page === 'expenses' ? ' active' : ''}">Расходы</a>
  </div>`;

  document.getElementById('burger-btn')?.addEventListener('click', toggleMobileMenu);
  document.addEventListener('click', e => {
    if (!document.body.classList.contains('menu-open')) return;
    if (e.target.closest('.site-nav')) return;
    closeMobileMenu();
  });
}

function isMobileNav() { return window.matchMedia('(max-width:640px)').matches; }

function closeMobileMenu() {
  document.body.classList.remove('menu-open');
  document.getElementById('burger-btn')?.setAttribute('aria-expanded', 'false');
}

function openMobileMenu() {
  document.body.classList.add('menu-open');
  document.getElementById('burger-btn')?.setAttribute('aria-expanded', 'true');
}

function toggleMobileMenu() {
  if (document.body.classList.contains('menu-open')) closeMobileMenu();
  else openMobileMenu();
}
"""

# route.js
route_js = r"""
function stickyOffset() {
  const nav = document.querySelector('.site-nav')?.offsetHeight || 49;
  const tabs = document.getElementById('day-tabs-wrap')?.offsetHeight || 52;
  return nav + tabs;
}

let scrollLock = false;
let scrollLockTimer = null;
let currentActive = 0;

function setActiveTab(index) {
  const tabs = [...document.querySelectorAll('.tab')];
  tabs.forEach((t, i) => t.classList.toggle('active', i === index));
  if (index !== currentActive) {
    currentActive = index;
    const active = tabs[index];
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
}

function scrollToDay(id) {
  const el = document.getElementById(typeof id === 'number' ? 'panel-' + id : 'panel-exp');
  if (!el) return;
  scrollLock = true;
  clearTimeout(scrollLockTimer);
  const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset();
  window.scrollTo({ top, behavior: 'smooth' });
  const ti = typeof id === 'number' ? id : DAYS.length;
  currentActive = -1;
  setActiveTab(ti);
  if (typeof id === 'number') {
    if (fsMapId !== null && fsMapId !== id) closeMapFullscreen();
    setTimeout(() => { initMap(id); if (mapInst[id]) mapInst[id].invalidateSize(); }, 400);
  }
  scrollLockTimer = setTimeout(() => { scrollLock = false; }, 900);
}

function updateActiveFromScroll() {
  if (scrollLock || fsMapId !== null) return;
  const offset = stickyOffset() + 8;
  const panels = [...document.querySelectorAll('.panel')].filter(p => p.offsetParent !== null);
  let active = 0;
  for (let i = 0; i < panels.length; i++) {
    if (panels[i].getBoundingClientRect().top <= offset) active = i;
  }
  if (active === currentActive) return;
  setActiveTab(active);
  if (active < DAYS.length) {
    if (!mapInst[active]) initMap(active);
    else mapInst[active].invalidateSize();
  }
}

function initRoutePage() {
  renderSiteNav({ page: 'route' });
  const tabsEl = document.getElementById('tabs');
  const panelsEl = document.getElementById('panels');

  DAYS.forEach((d, i) => {
    const t = document.createElement('div');
    t.className = 'tab' + (i === 0 ? ' active' : '');
    t.textContent = dayFilterLabel(d.tab);
    t.onclick = () => scrollToDay(i);
    tabsEl.appendChild(t);
  });

  DAYS.forEach((d, i) => {
    const p = document.createElement('div');
    p.className = 'panel';
    p.id = 'panel-' + i;
    const transitHtml = (d.transit || []).map(t => `
    <div class="transit">
      <div class="transit-icon-wrap">${ICONS[t.icon] || ICONS.train}</div>
      <div class="transit-body">
        <div class="transit-route">${t.route}</div>
        ${t.detail ? `<div class="transit-detail">${t.detail}</div>` : ''}
        ${t.cost ? `<div class="transit-cost">${formatMoney(t.cost)}</div>` : ''}
        ${t.link ? `<a class="transit-link" href="${t.link}" target="_blank" rel="noopener">${t.linkLabel || 'Купить билет'}</a>` : ''}
      </div>
    </div>`).join('');

    const placesHtml = `<div class="places-grid">${d.places.map(pl => renderPlaceCard(pl, true)).join('')}</div>`;
    const b = d.budget || {};
    const budRows = ['transport', 'entry'].filter(k => b[k]).map(k => {
      const lbl = { transport: 'Транспорт', entry: 'Билеты' };
      return `<div class="budget-row"><span class="budget-label">${lbl[k]}</span><span class="budget-val">${formatMoney(b[k])}</span></div>`;
    }).join('');
    const budHtml = b.total ? `<div class="budget-block"><h3>бюджет дня</h3>${budRows}<div class="budget-row"><span class="budget-label">Итого</span><span class="budget-val">${formatMoney(b.total)}</span></div></div>` : '';
    const noteHtml = d.note ? `<div class="day-note">${d.note}</div>` : '';
    const transitBlock = transitHtml ? `<div class="section-label">перемещение</div>${transitHtml}` : '';
    const cnt = d.places.length;
    const loc = cnt === 1 ? 'место' : cnt < 5 ? 'места' : 'мест';

    p.innerHTML = `
    <div class="day-header">
      <div class="day-index">${d.tab}</div>
      <div class="day-title"><span class="day-city">${d.city} </span><span class="day-city-jp">${d.jp}</span></div>
    </div>
    ${noteHtml}${transitBlock}
    <div class="section-label" style="margin-top:${transitHtml ? '20px' : '0'}">маршрут · ${cnt} ${loc}</div>
    <div class="map-wrap" id="mapwrap-${i}">
      <div class="map-fs-top">
        <span class="map-fs-title">${d.city}</span>
        <button type="button" class="map-fs-close" id="fsclose-${i}" aria-label="Закрыть карту">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="day-map" id="map-${i}"></div>
      <button type="button" class="map-btn map-btn--icon map-btn--fs" id="fsopen-${i}" aria-label="На весь экран">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/></svg>
      </button>
      <div class="map-actions">
        <a class="map-btn" id="gmap-${i}" href="#" target="_blank" rel="noopener">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Google Maps
        </a>
      </div>
    </div>
    ${placesHtml}${budHtml}`;
    panelsEl.appendChild(p);
  });

  let scrollRaf = null;
  window.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null;
      updateActiveFromScroll();
    });
  }, { passive: true });

  const mapObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const m = e.target.id.match(/^panel-(\d+)$/);
      if (m) initMap(+m[1]);
    });
  }, { rootMargin: '240px 0px' });
  document.querySelectorAll('.panel[id^="panel-"]').forEach(p => mapObserver.observe(p));

  setTimeout(() => initMap(0), 120);
}

document.addEventListener('DOMContentLoaded', initRoutePage);
"""

places_js = r"""
function initPlacesCityPage() {
  const regionId = document.body.dataset.city;
  if (!regionId) return;
  const region = REGIONS.find(r => r.id === regionId);
  if (!region) return;

  renderSiteNav({ page: 'places', city: regionId });
  const catalog = buildPlacesCatalog();
  const items = catalog[regionId] || [];
  const main = document.getElementById('places-main');
  if (!main) return;

  main.innerHTML = `
  <div class="day-header">
    <div class="day-index">каталог</div>
    <div class="day-title"><span class="day-city">${region.name} </span><span class="day-city-jp">${region.jp}</span></div>
  </div>
  <div class="city-section" id="city-${regionId}">
    ${renderCityMap('city-' + regionId, region.name, items.length, regionId)}
    <div class="places-grid">${items.map(pl => renderPlaceCard(pl, false)).join('')}</div>
  </div>`;

  setTimeout(() => initCityMap(regionId, items), 80);
}

document.addEventListener('DOMContentLoaded', initPlacesCityPage);
"""

shops_js = r"""
function initShopsPage() {
  renderSiteNav({ page: 'shops' });
  const main = document.getElementById('shops-main');
  if (!main) return;
  main.innerHTML = renderShopsSection().replace('<div id="places-shops" class="places-view">', '<div id="places-shops" class="places-view places-view--active">');
  setTimeout(() => initShopsMap(), 80);
}

document.addEventListener('DOMContentLoaded', initShopsPage);
"""

expenses_js = expenses_block + r"""

function initExpensesPage() {
  renderSiteNav({ page: 'expenses' });
  const main = document.getElementById('expenses-main');
  if (!main) return;
  main.innerHTML = `
  <div class="day-header">
    <div class="day-index">17–30 сентября</div>
    <div class="day-title"><span class="day-city">Расходы </span><span class="day-city-jp">費用まとめ</span></div>
  </div>
  ${EXPENSES.map(s => `
    <div class="exp-section">
      <h3>${s.cat}</h3>
      ${s.note ? `<p class="exp-note">${s.note}</p>` : ''}
      ${s.items.map(it => `<div class="exp-row"><span class="exp-label">${it.name}</span><span class="exp-val">${formatMoneyPair(it.jpy, it.rub)}</span></div>`).join('')}
      <div class="exp-row"><span class="exp-label" style="font-style:normal;font-weight:600;color:var(--text-1)">Итого</span><span class="exp-val">${formatMoneyPair(s.total.jpy, s.total.rub)}</span></div>
    </div>`).join('')}
  <div class="exp-total">
    <div class="t-label">без авиабилетов и отелей</div>
    <div class="t-sum">Итого: ~¥65 000–72 000 · ~31 700–35 000 ₽</div>
  </div>`;
}

document.addEventListener('DOMContentLoaded', initExpensesPage);
"""

# Write JS files
(ROOT / "js").mkdir(exist_ok=True)
(ROOT / "js" / "data.js").write_text(data_part1 + "\n", encoding="utf-8")
(ROOT / "js" / "shared.js").write_text(shared + "\n", encoding="utf-8")
(ROOT / "js" / "maps.js").write_text(maps + "\n", encoding="utf-8")
(ROOT / "js" / "nav.js").write_text(nav_js.strip() + "\n", encoding="utf-8")
(ROOT / "js" / "route.js").write_text(route_js.strip() + "\n", encoding="utf-8")
(ROOT / "js" / "places-city.js").write_text(places_js.strip() + "\n", encoding="utf-8")
(ROOT / "js" / "shops.js").write_text(shops_js.strip() + "\n", encoding="utf-8")
(ROOT / "js" / "expenses.js").write_text(expenses_js.strip() + "\n", encoding="utf-8")

HEAD = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="{css}css/site.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>window.SITE_BASE="{site_base}"</script>
</head>
<body{body_attr}>
"""

SCRIPTS_COMMON = """
<script src="{js}js/data.js"></script>
<script src="{js}js/shared.js"></script>
<script src="{js}js/maps.js"></script>
<script src="{js}js/nav.js"></script>
"""

# Append nav CSS to site.css
nav_css = """
/* ─── SITE NAV ─── */
.site-nav{
  background:var(--bg);
  border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:200;
  padding:10px 16px;
  display:flex;flex-direction:column;align-items:center;
}
.site-nav-bar{
  display:flex;align-items:center;gap:12px;
  width:var(--content-w);max-width:calc(100vw - var(--viewport-pad));
}
.site-nav-brand{
  font-size:13px;font-weight:600;color:var(--text-1);
  text-decoration:none;letter-spacing:-0.3px;white-space:nowrap;flex-shrink:0;
}
.site-nav-inner{
  display:flex;align-items:center;gap:4px;flex:1;flex-wrap:wrap;justify-content:flex-end;
}
.site-nav-link,.site-nav-places-link{
  text-align:center;padding:8px 12px;
  font-size:12px;color:var(--text-3);
  cursor:pointer;border-radius:20px;border:1px solid transparent;
  transition:all .15s ease;user-select:none;letter-spacing:-0.3px;
  text-decoration:none;display:inline-block;
}
.site-nav-link.active,.site-nav-places-link.active{
  color:#fff;font-weight:600;background:var(--text-1);border-color:var(--text-1);
}
.site-nav-link:hover:not(.active),.site-nav-places-link:hover:not(.active){
  color:var(--text-1);background:var(--surface-dim);
}
.site-nav-group{display:flex;align-items:center;gap:4px;flex-wrap:wrap;}
.site-nav-label{
  font-size:11px;color:var(--text-3);padding:0 4px;letter-spacing:-0.2px;
}
.site-nav-places{display:flex;gap:2px;flex-wrap:wrap;}
.mobile-menu-section{
  padding:10px 16px 4px;font-size:11px;font-weight:600;
  color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em;
}
.mobile-menu-item--sub{padding-left:28px;font-size:13px;}
@media (max-width:900px){
  .site-nav-places{display:none}
}
@media (max-width:640px){
  .site-nav-inner{display:none}
  .burger-btn{display:flex;margin-left:auto}
  .site-nav-brand{flex:1}
}
@media (min-width:641px){
  .mobile-menu{display:none!important}
  .burger-btn{display:none}
}
@media (min-width:901px){
  .site-nav-group .site-nav-label{display:none}
}
"""

css_path = ROOT / "css" / "site.css"
css = css_path.read_text(encoding="utf-8")
if "SITE NAV" not in css:
    css_path.write_text(css + nav_css, encoding="utf-8")

# index.html
index_html = HEAD.format(
    title="Япония · 17–30 сентября · Маршрут",
    css="", site_base="", body_attr="",
) + """
<div class="site-nav" id="site-nav"></div>
<div class="tabs-wrap" id="day-tabs-wrap"><div class="tabs-scroll"><div class="tabs" id="tabs"></div></div></div>
<div id="panels"></div>
""" + SCRIPTS_COMMON.format(js="") + """
<script src="js/route.js"></script>
</body>
</html>
"""
(ROOT / "index.html").write_text(index_html, encoding="utf-8")

# shops.html
shops_html = HEAD.format(title="Япония · Магазины", css="", site_base="", body_attr="") + """
<div class="site-nav" id="site-nav"></div>
<main id="shops-main" class="page-main"></main>
""" + SCRIPTS_COMMON.format(js="") + """
<script src="js/shops.js"></script>
</body>
</html>
"""
(ROOT / "shops.html").write_text(shops_html, encoding="utf-8")

# expenses.html
exp_html = HEAD.format(title="Япония · Расходы", css="", site_base="", body_attr="") + """
<div class="site-nav" id="site-nav"></div>
<main id="expenses-main" class="page-main panel"></main>
""" + SCRIPTS_COMMON.format(js="") + """
<script src="js/expenses.js"></script>
</body>
</html>
"""
(ROOT / "expenses.html").write_text(exp_html, encoding="utf-8")

# places/*.html
(ROOT / "places").mkdir(exist_ok=True)
for r in [
    {"id": "osaka", "name": "Осака"},
    {"id": "kyoto", "name": "Киото"},
    {"id": "nara", "name": "Нара"},
    {"id": "fuji", "name": "Фудзи"},
    {"id": "tokyo", "name": "Токио"},
    {"id": "kamakura", "name": "Камакура"},
]:
    ph = HEAD.format(
        title=f"Япония · {r['name']} · Места",
        css="../",
        site_base="../",
        body_attr=f' data-city="{r["id"]}"',
    ) + """
<div class="site-nav" id="site-nav"></div>
<main id="places-main" class="page-main panel"></main>
""" + SCRIPTS_COMMON.format(js="../") + """
<script src="../js/places-city.js"></script>
</body>
</html>
"""
    (ROOT / "places" / f"{r['id']}.html").write_text(ph, encoding="utf-8")

# page-main padding in css
page_css = """
.page-main{
  max-width:var(--page-max);
  margin:0 auto;
  padding:0 calc(var(--viewport-pad)/2) 48px;
}
.page-main.panel{display:flex;flex-direction:column;gap:0;}
"""
if ".page-main" not in css_path.read_text(encoding="utf-8"):
    css_path.write_text(css_path.read_text(encoding="utf-8") + page_css, encoding="utf-8")

print("Done: split into index.html, shops.html, expenses.html, places/*.html + js/*")
