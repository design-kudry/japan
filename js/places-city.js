function showCitySubView(regionId, view) {
  const root = document.querySelector(`.places-city-view[data-city="${regionId}"]`);
  if (!root) return;
  root.classList.remove('tokyo-mode-all', 'tokyo-mode-sights', 'tokyo-mode-shops');
  root.classList.add('tokyo-mode-' + view);
  const attr = `data-${regionId}-view`;
  root.querySelectorAll(`.places-subtab[${attr}]`).forEach(b => {
    b.classList.toggle('active', b.getAttribute(attr) === view);
  });
  setTimeout(() => {
    if (view === 'all') {
      if (typeof initCityAllMap === 'function') initCityAllMap(regionId);
      else if (regionId === 'tokyo' && typeof initTokyoAllMap === 'function') initTokyoAllMap();
      const m = mapInst['city-' + regionId + '-all'];
      if (m) m.invalidateSize();
    } else if (view === 'sights') {
      const items = buildPlacesCatalog()[regionId];
      if (items?.length) initCityMap(regionId, items);
      const m = mapInst['city-' + regionId];
      if (m) m.invalidateSize();
    } else if (view === 'shops') {
      initShopsMap(regionId);
      const mapKey = regionId === 'tokyo' ? 'city-shops' : 'city-' + regionId + '-shops';
      if (mapInst[mapKey]) mapInst[mapKey].invalidateSize();
    }
  }, 80);
}

function renderCityPageContent(region, items) {
  const regionId = region.id;
  if (regionId === 'osaka' || regionId === 'tokyo') {
    const mapped = getAllShops(regionId).filter(s => s.lat);
    const totalOnMap = items.filter(p => p.lat).length + mapped.length;
    const shopsMap = regionId === 'tokyo'
      ? (mapped.length ? renderShopsMap(mapped.length) : '')
      : (mapped.length ? renderShopsMap(mapped.length, { id: 'city-osaka-shops', title: 'Магазины · Осака', filtersId: 'osaka-shop-cat-filters' }) : '');
    const cityName = region.name;
    const gmaps = CITY_GMAPS[regionId];
    return `<div class="places-city-view places-city-view--active tokyo-mode-all" data-city="${regionId}">
      <div class="places-subnav places-subnav--tokyo">
        <a href="#all" class="places-subtab active" data-${regionId}-view="all">Все</a>
        <a href="#sights" class="places-subtab" data-${regionId}-view="sights">Достопримечательности</a>
        <a href="#shops" class="places-subtab" data-${regionId}-view="shops">Магазины</a>
      </div>
      <div class="tokyo-panel tokyo-panel--all">
        ${renderCityMap('city-' + regionId + '-all', cityName, totalOnMap, null, { gmaps: false })}
        <h3 class="shop-category-title tokyo-section-head">Достопримечательности <span class="shop-category-jp jp">スポット</span></h3>
        <div class="places-grid">${items.map(pl => renderPlaceCard(pl, false)).join('')}</div>
        ${renderShopCategories(regionId)}
      </div>
      <div class="tokyo-panel tokyo-panel--sights">
        ${renderCityMap('city-' + regionId, cityName, items.length, regionId, { gmaps })}
        <h3 class="shop-category-title">Достопримечательности <span class="shop-category-jp jp">スポット</span></h3>
        <div class="places-grid">${items.map(pl => renderPlaceCard(pl, false)).join('')}</div>
      </div>
      <div class="tokyo-panel tokyo-panel--shops">
        ${shopsMap}
        ${renderShopCategories(regionId)}
      </div>
    </div>`;
  }
  return `<div class="city-section" id="city-${regionId}">
    ${renderCityMap('city-' + regionId, region.name, items.length, regionId)}
    <div class="places-grid">${items.map(pl => renderPlaceCard(pl, false)).join('')}</div>
  </div>`;
}

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
  ${renderCityPageContent(region, items)}`;

  if (regionId === 'osaka' || regionId === 'tokyo') {
    const attr = `data-${regionId}-view`;
    main.querySelectorAll(`.places-subtab[${attr}]`).forEach(tab => {
      tab.addEventListener('click', e => {
        e.preventDefault();
        const view = tab.getAttribute(attr);
        history.replaceState(null, '', '#' + view);
        showCitySubView(regionId, view);
      });
    });
    const hashView = (location.hash || '#all').slice(1);
    const view = ['all', 'sights', 'shops'].includes(hashView) ? hashView : 'all';
    showCitySubView(regionId, view);
  } else {
    setTimeout(() => initCityMap(regionId, items), 80);
  }
}

document.addEventListener('DOMContentLoaded', initPlacesCityPage);
