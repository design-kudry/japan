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
