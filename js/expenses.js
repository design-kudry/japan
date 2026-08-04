const EXPENSES=[
  {cat:'IC-карта',items:[
    {name:'Кансай → Осака',jpy:'¥1,200–1,900',rub:'547–866 ₽'},
    {name:'Осака, местные (17–18 сент)',jpy:'¥1,500–2,500',rub:'684–1 140 ₽'},
    {name:'Осака → Нара',jpy:'¥490',rub:'223 ₽'},
    {name:'Осака → USJ',jpy:'¥180',rub:'82 ₽'},
    {name:'Mishima → Kawaguchiko · автобус*',jpy:'¥2,500',rub:'1 140 ₽'},
    {name:'Kawaguchiko → Сайко',jpy:'¥710',rub:'324 ₽'},
    {name:'Токио, метро/JR (5 дней)',jpy:'¥5,000–7,500',rub:'2 280–3 420 ₽'},
    {name:'Tokyo → Kamakura',jpy:'¥1,000',rub:'456 ₽'},
    {name:'Enoshima → Tokyo',jpy:'¥1,300',rub:'593 ₽'},
  ],total:{jpy:'~¥13,880–18,080',rub:'~6 329–8 244 ₽'},note:'*горные автобусы иногда только наличные'},
  {cat:'Отдельные билеты',items:[
    {name:'Осака → Киото',jpy:'¥1,420–2,810',rub:'647–1 281 ₽'},
    {name:'Shin-Osaka → Mishima · синкансэн',jpy:'~¥13,000–15,000',rub:'~5 928–6 840 ₽'},
    {name:'Kawaguchiko → Shinjuku · Fuji Excursion',jpy:'¥4,200',rub:'1 915 ₽'},
  ],total:{jpy:'~¥18,620–21,810',rub:'~8 491–9 945 ₽'}},
  {cat:'Входные билеты',items:[
    {name:'Osaka Castle',jpy:'¥600',rub:'273 ₽'},
    {name:'Umeda Sky Building',jpy:'¥1,500',rub:'684 ₽'},
    {name:'Kiyomizu-dera + To-ji',jpy:'¥1,000',rub:'456 ₽'},
    {name:'Tōfuku-ji + Nijo Castle',jpy:'¥2,500',rub:'1 140 ₽'},
    {name:'Tōdai-ji (Нара)',jpy:'¥600',rub:'273 ₽'},
    {name:'USJ (без Express Pass)',jpy:'¥8,600',rub:'5 720 ₽'},
    {name:'Kachi Kachi Ropeway',jpy:'¥1,000',rub:'456 ₽'},
    {name:'Saiko + Oshino Hakkai',jpy:'¥800',rub:'365 ₽'},
    {name:'Hie Shrine · Коисикава',jpy:'¥300',rub:'137 ₽'},
    {name:'Tokyo Skytree',jpy:'¥3,000',rub:'1 367 ₽'},
    {name:'Shibuya Sky',jpy:'¥3,000',rub:'1 331,78 ₽'},
    {name:'Нац. музей Токио',jpy:'¥1,000',rub:'456 ₽'},
    {name:'Warner Bros. Studio Tour',jpy:'¥6,500',rub:'3 276,87 ₽'},
    {name:'Камакура (все храмы)',jpy:'¥2,000',rub:'912 ₽'},
  ],total:{jpy:'~¥32,400',rub:'~16 848 ₽'}},
];

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
