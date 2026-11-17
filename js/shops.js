function initShopsPage() {
  renderSiteNav({ page: 'shops' });
  const main = document.getElementById('shops-main');
  if (!main) return;
  main.innerHTML = renderShopsSection().replace('<div id="places-shops" class="places-view">', '<div id="places-shops" class="places-view places-view--active">');
  setTimeout(() => initShopsMap(), 80);
}

document.addEventListener('DOMContentLoaded', initShopsPage);
