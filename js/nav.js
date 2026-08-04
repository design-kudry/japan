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
