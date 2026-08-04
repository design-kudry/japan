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
