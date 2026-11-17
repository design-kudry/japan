const W='https://upload.wikimedia.org/wikipedia/commons/thumb/';

const TICKET_LINKS={
  osaka_mishima:'https://ru.trip.com/trains/asia/list?departurecityid=219&departurecountrycode=JP&arrivalcountrycode=JP&tripTab=train&biztype=JP&departdate=2026-09-22&departurecitycode=JP04472&arrivalcitycode=JP02335&departurecity=%D0%9E%D1%81%D0%B0%D0%BA%D0%B0+%28%D0%B2%D1%81%D0%B5%29&arrivalcity=%D0%9C%D0%B8%D1%81%D0%B8%D0%BC%D0%B0',
  mishima_kawaguchiko:'https://bus.fujikyu.co.jp/highwaybus/route/mishima-kawaguchiko/',
  kawaguchiko_shinjuku:'https://www.jreast.co.jp/multi/en/pass/fuji-excursion.html',
  tokyo_kamakura:'https://ru.trip.com/trains/asia/list?departurecountrycode=JP&arrivalcountrycode=JP&tripTab=train&biztype=JP&departdate=2026-09-29&departurecitycode=JP04604&arrivalcitycode=JP04631&departurecity=Tokyo&arrivalcity=Kamakura',
  enoshima_tokyo:'https://ru.trip.com/trains/asia/list?departurecountrycode=JP&arrivalcountrycode=JP&tripTab=train&biztype=JP&departdate=2026-09-29&departurecitycode=JP04628&arrivalcitycode=JP04604&departurecity=Enoshima&arrivalcity=Tokyo',
};

const DAYS=[
{tab:'17 сент',city:'Осака',jp:'大阪',mapColor:'#888',
 note:'Прилёт в 12:40 — лёгкий день, гуляем вечером',
 transit:[
  {icon:'plane',route:'Прилёт · Аэропорт Кансай',detail:'12:40 · регистрация, заселение',cost:''},
 ],
 places:[
  {n:1,name:'Namba Yasaka Shrine',jp:'難波八阪神社',desc:'Огромная голова льва-алтарь — самая фотогеничная святыня Осаки.',lat:34.6566,lng:135.5009},
  {n:2,name:'Kura Sushi Namba',jp:'くら寿司 なんば',desc:'Кайтэн-суши Kura на 4F BRAVE Namba у Sennichimae — лента и тач-заказ.',lat:34.6643,lng:135.5039,asShop:true},
  {n:3,name:'Dotonbori',jp:'道頓堀',desc:'Главная гастро-улица Осаки: такояки, рамен, огромная вывеска Glico над каналом.',lat:34.6687,lng:135.5012},
  {n:4,name:'Amerikamura',jp:'アメリカ村',desc:'Молодёжный квартал в стиле США: винтаж, стрит-арт, уличная еда.',lat:34.6720,lng:135.4981},
  {n:5,name:'Shinsaibashi-suji',jp:'心斎橋筋商店街',desc:'Самая известная крытая торговая галерея Осаки — 600 м брендов и кафе.',lat:34.6736,lng:135.4980},
 ],
 budget:{}},

{tab:'18 сент',city:'Осака',jp:'大阪',mapColor:'#888',
 transit:[],
 places:[
  {n:1,name:'Sumiyoshi Taisha',jp:'住吉大社',desc:'Крупнейшее и старейшее синтоистское святилище Осаки — прообраз тысяч других.',lat:34.6117,lng:135.4931},
  {n:2,name:'Osaka Castle',jp:'大阪城',desc:'Главный символ города. Музей внутри, панорама с верхней башни.',lat:34.6873,lng:135.5262},
  {n:3,name:'Nakanoshima Park',jp:'中之島公園',desc:'Исторический парк на острове между каналами, рядом с классической ратушей.',lat:34.6928,lng:135.5039},
  {n:4,name:'Umeda Sky Building',jp:'梅田スカイビル',desc:'Небоскрёб-арка со смотровой «Floating Garden» на высоте 170 м.',lat:34.7038,lng:135.4900},
  {n:5,name:'Den Den Town',jp:'電電タウン',desc:'Осакская Акихабара: электроника, аниме, манга, мэйд-кафе.',lat:34.6621,lng:135.5070},
  {n:6,name:'Shinsekai',jp:'新世界',desc:'Ретро-квартал 1950-х с башней Цутэнкаку, уличной едой и ностальгией.',lat:34.6519,lng:135.5063},
 ],
 budget:{transport:'¥500 · 228 ₽',entry:'¥2,100 · 957 ₽',total:'¥2,600 · 1 185 ₽'}},

{tab:'19 сент',city:'Киото',jp:'京都',mapColor:'#888',
 transit:[{icon:'train',route:'Осака → Киото',detail:'JR Токкю, 15 мин · отдельный билет (или IC, если обычный JR)',cost:'¥1,420–2,810 · билет'}],
 places:[
  {n:1,name:'To-ji',jp:'東寺',desc:'Пятиярусная пагода 54 м — самая высокая деревянная пагода в Японии.',lat:34.9800,lng:135.7476},
  {n:2,name:'Tofuku-ji',jp:'東福寺',desc:'Один из важнейших дзэн-храмов Киото с грандиозными воротами санмон.',lat:34.9716,lng:135.7757},
  {n:3,name:'Fushimi Inari Taisha',jp:'伏見稲荷大社',desc:'Тысячи оранжевых ворот тории уходят в гору. Полный маршрут — 2–3 часа.',lat:34.9671,lng:135.7727},
  {n:4,name:'Kiyomizu-dera',jp:'清水寺',desc:'«Храм чистой воды» — один из красивейших в Японии, с балконом над горой.',lat:34.9948,lng:135.7850},
  {n:5,name:'Gion',jp:'祇園',desc:'Квартал гейш: старинные мачия, чайные домики, шанс увидеть майко вечером.',lat:35.0036,lng:135.7759},
  {n:6,name:'Higashiyama',jp:'東山',desc:'Исторический район: мощёные Нинэн-дзака и Саннэн-дзака, лавки сувениров.',lat:34.9998,lng:135.7815},
  {n:7,name:'Nishiki Market',jp:'錦市場',desc:'«Кухня Киото» — крытый рынок с маринадами, вагаси и едой на ходу.',lat:35.0051,lng:135.7674},
  {n:8,name:'Nijo Castle',jp:'二条城',desc:'Резиденция сёгунов Токугава с садами и «соловьиными» полами.',lat:35.0142,lng:135.7480},
  {n:9,name:'Arashiyama Bamboo',jp:'嵐山竹林',desc:'Бамбуковый лес Сагано — высокие стебли, звенящие на ветру.',lat:35.0094,lng:135.6727},
 ],
 budget:{transport:'¥1,420–2,810',entry:'¥2,000 · 912 ₽',total:'¥3,420–4,810 · 912 ₽'}},

{tab:'20 сент',city:'Нара',jp:'奈良',mapColor:'#888',
 transit:[{icon:'train',route:'Осака → Нара',detail:'JR Ямато-дзи, 35 мин · IC-карта',cost:'¥490 · IC'}],
 places:[
  {n:1,name:'Todai-ji',jp:'東大寺',desc:'Храм Великого Будды — крупнейшее деревянное здание в мире. Статуя 15 м.',lat:34.6888,lng:135.8399},
  {n:2,name:'Nara Park',jp:'奈良公園',desc:'Более 1000 вольных оленей — священных животных. Гуляют прямо среди людей.',lat:34.6851,lng:135.8330},
 ],
 budget:{transport:'¥490',entry:'¥600 · 273 ₽',total:'¥1,090 · 273 ₽'}},

{tab:'21 сент',city:'Осака · USJ',jp:'大阪',mapColor:'#888',
 note:'Очереди на топ-аттракционы до 90–180 мин. Express Pass сэкономит время.',
 transit:[{icon:'train',route:'→ JR Sakurajima',detail:'5 мин до ворот USJ · IC-карта',cost:'¥180 · IC'}],
 places:[
  {n:1,name:'Universal Studios Japan',jp:'ユニバーサル・スタジオ・ジャパン',desc:'Super Nintendo World, Гарри Поттер, Миньоны — полный день приключений.',lat:34.6654,lng:135.4324},
 ],
 budget:{transport:'¥180',entry:'¥8,600 · 5 720 ₽',total:'¥8,780 · 5 900 ₽'}},

{tab:'22 сент',city:'Фудзи · Кавагутико',jp:'富士山',mapColor:'#888',
 transit:[
  {icon:'train',route:'7:36 Shin-Osaka → Mishima',detail:'Синкансэн, 2 ч 21 мин · отдельный билет',cost:'~¥13,000–15,000 · билет',link:TICKET_LINKS.osaka_mishima,linkLabel:'Trip.com'},
  {icon:'bus',route:'10:20 Mishima → Kawaguchiko',detail:'Fuji Kyuko, 1 ч 30 мин · IC-карта* · иногда только наличные',cost:'¥2,500 · IC',link:TICKET_LINKS.mishima_kawaguchiko,linkLabel:'Fuji Kyuko'},
 ],
 places:[
  {n:1,name:'Chureito Pagoda',jp:'忠霊塔',desc:'Пятиярусная пагода с классическим видом на Фудзи — открыточный кадр Японии.',lat:35.4920,lng:138.7940},
  {n:2,name:'Lake Kawaguchi',jp:'河口湖',desc:'Прогулки по набережной, велосипеды, отражение Фудзи в воде.',lat:35.5072,lng:138.7525},
  {n:3,name:'Kachi Kachi Ropeway',jp:'かちかち山ロープウェイ',desc:'Канатная дорога на гору Тэнтяку — лучший вид на Фудзи и озеро сверху.',lat:35.5110,lng:138.7697},
  {n:4,name:'Oishi Park',jp:'大石公園',desc:'Парк цветов на северном берегу озера Кавагути с панорамой на Фудзи.',lat:35.5121,lng:138.8018},
 ],
 budget:{transport:'~¥15,500–17,500',entry:'¥1,000 · 456 ₽',total:'~¥16,500–18,500 · 456 ₽'}},

{tab:'23 сент',city:'Фудзи · Сайко',jp:'富士山',mapColor:'#888',
 transit:[{icon:'bus',route:'Green Line от Kawaguchiko',detail:'До Saiko Iyashi-no-Sato, 40 мин · IC-карта',cost:'¥710 · IC'}],
 places:[
  {n:1,name:'Saiko Iyashi-no-Sato Nenba',jp:'西湖いやしの里根場',desc:'Восстановленная деревня эпохи Мэйдзи у подножия Фудзи — соломенные крыши.',lat:35.5042,lng:138.6453},
  {n:2,name:'Oshino Hakkai',jp:'忍野八海',desc:'Восемь кристальных родниковых прудов у подножия Фудзи. Вода прозрачная до дна.',lat:35.4638,lng:138.8408},
 ],
 budget:{transport:'¥710',entry:'¥800 · 365 ₽',total:'¥1,510 · 365 ₽'}},

{tab:'24 сент',city:'Фудзи → Токио · заезд',jp:'東京',mapColor:'#888',
 note:'Приезд в 16:06 на ст. Синдзюку. Заселение в Рёгоку. Gyoen — если успеем до 18:00, дальше вечерний Синдзюку.',
 transit:[{icon:'train',route:'14:08 – 16:06 · Kawaguchiko → Shinjuku',detail:'Fuji-Excursion 32 · отдельный билет, 2 чел.',cost:'¥4,200 · билет',link:TICKET_LINKS.kawaguchiko_shinjuku,linkLabel:'JR East'}],
 places:[
  {n:1,name:'Shinjuku Gyoen',jp:'新宿御苑',desc:'Государственный сад 65 га: 450 сортов сакуры, лужайки, японская и французская зоны.',lat:35.6850,lng:139.7100},
  {n:2,name:'Shinjuku',jp:'新宿',desc:'Прибытие поездом, короткая прогулка по вечернему Синдзюку — огни неона и небоскрёбы.',lat:35.6897,lng:139.7006},
  {n:3,name:'Omoide Yokocho',jp:'思い出横丁',desc:'«Переулок воспоминаний» — узкие рядки с якитори и сакэ у ст. Синдзюку.',lat:35.6920,lng:139.7007},
  {n:4,name:'Kabukicho',jp:'歌舞伎町',desc:'Главный развлекательный район Токио: неон, бары, клубы, Godzilla Hotel.',lat:35.6939,lng:139.7023},
  {n:5,name:'Golden Gai',jp:'ゴールデン街',desc:'Лабиринт крошечных баров в Синдзюку — ретро-атмосфера 70-х, 200+ заведений.',lat:35.6938,lng:139.7039},
 ],
 budget:{transport:'¥4,200',entry:'¥500 · 228 ₽',total:'¥4,700 · 228 ₽'}},

{tab:'25 сент',city:'Токио · Асакуса / Уэно',jp:'東京',mapColor:'#888',
 note:'Вечер как день шопинга',
 transit:[{icon:'metro',route:'Метро Хандзомон / Тобу / Гиндза',detail:'Рёгоку → Kameido / Асакуса / Уэно / Акихабара · IC-карта',cost:'¥1,000–1,500 · IC'}],
 places:[
  {n:1,name:'Kameido Tenjin Shrine',jp:'亀戸天神社',desc:'Живописный синтоистский храм с деревянными мостами над прудами с кувшинками.',lat:35.6955,lng:139.8241},
  {n:2,name:'Tokyo Skytree',jp:'東京スカイツリー',desc:'Самая высокая башня в мире (634 м). Смотровые на 350 и 450 м.',lat:35.7101,lng:139.8107},
  {n:3,name:'Sumida Park',jp:'隅田公園',desc:'Парк вдоль реки Сумида с видом на Скайтри — лучшее место для фото башни.',lat:35.7123,lng:139.7995},
  {n:4,name:'Nakamise',jp:'仲見世通り',desc:'Торговая улица к воротам Камонаримон: сувениры, снэки, традиционные сладости.',lat:35.7139,lng:139.7972},
  {n:5,name:'Senso-ji',jp:'浅草寺',desc:'Древнейший и самый известный буддийский храм Токио.',lat:35.7148,lng:139.7967},
  {n:6,name:'Tokyo National Museum',jp:'東京国立博物館',desc:'Художественное собрание Японии — самурайское оружие, живопись, керамика',lat:35.7189,lng:139.7762},
  {n:7,name:'Ueno Park',jp:'上野恩賜公園',desc:'Один из самых известных городских парков Токио',lat:35.7148,lng:139.7734},
  {n:8,name:'Akihabara Electric Town',jp:'秋葉原電気街',desc:'Электроника, аниме, ретро-игры, мэйд-кафе — центр японской поп-культуры.',lat:35.7023,lng:139.7745},
 ],
 budget:{transport:'¥1,000–1,500',entry:'¥4,000 · 1 823 ₽',total:'¥5,000–5,500 · 1 823 ₽'}},

{tab:'26 сент',city:'Токио · Центр',jp:'東京',mapColor:'#888',
 transit:[{icon:'metro',route:'Метро Тиёда / Гиндза / Сэндагай',detail:'Центр → Янака · IC-карта',cost:'¥1,000–1,500 · IC'}],
 places:[
  {n:1,name:'Hie Shrine',jp:'日枝神社',desc:'Красивейшая синтоистская святыня в центре Токио с туннелями из тории.',lat:35.6727,lng:139.7411},
  {n:2,name:'Imperial Palace',jp:'皇居',desc:'Главный дворец Японии с садами Хигаси-Гёэн и знаменитым мостом Нидзюубаси.',lat:35.6852,lng:139.7528},
  {n:3,name:'Yasukuni Shrine',jp:'靖国神社',desc:'Значимое синтоистское святилище с музеем Юсукан о военной истории Японии.',lat:35.6938,lng:139.7436},
  {n:4,name:'Kagurazaka',jp:'神楽坂',desc:'Исторический район в восточной части Синдзюку — узкие мощёные переулки',lat:35.7008,lng:139.7376},
  {n:5,name:'Koishikawa Korakuen Garden',jp:'小石川後楽園',desc:'Один из красивейших традиционных садов Токио эпохи Эдо (XVII в.).',lat:35.7070,lng:139.7486},
  {n:6,name:'Nezu Shrine',jp:'根津神社',desc:'Один из старейших синтоистских храмов Токио, район Бункё',lat:35.7202,lng:139.7628},
  {n:7,name:'Yanaka Ginza',jp:'谷中銀座',desc:'Традиционная торговая улочка 1950-х — настоящий старый Токио без реноваций.',lat:35.7272,lng:139.7700},
 ],
 budget:{transport:'¥1,000–1,500',entry:'¥300 · 137 ₽',total:'¥1,300–1,800 · 137 ₽'}},

{tab:'27 сент',city:'Токио · Тойосу / Роппонги / Сибуя',jp:'東京',mapColor:'#888',
 transit:[{icon:'metro',route:'Метро / JR',detail:'Тойосу → Хамарикю → Роппонги → Сибуя · IC-карта',cost:'¥1,500–2,000 · IC'}],
 places:[
  {n:1,name:'teamLab Planets TOKYO',jp:'チームラボプラネッツ',desc:'Иммерсивное цифровое искусство в Тойосу — очень популярно',lat:35.6491,lng:139.7917},
  {n:2,name:'Hamarikyu Gardens',jp:'浜離宮恩賜庭園',desc:'Традиционный сад с чайным домиком прямо у Токийского залива и небоскрёбов Одайбы.',lat:35.6600,lng:139.7631},
  {n:3,name:'Azabudai Hills',jp:'麻布台ヒルズ',desc:'Крупный многофункциональный городской комплекс',lat:35.6614,lng:139.7410},
  {n:4,name:'The National Art Center',jp:'国立新美術館',desc:'Футуристичное здание, крупнейшая выставочная площадка Японии',lat:35.6653,lng:139.7263},
  {n:5,name:'Mori Art Museum',jp:'森美術館',desc:'Один из ведущих музеев современного искусства — Roppongi Hills, 53 этаж',lat:35.6605,lng:139.7293},
  {n:6,name:'Shibuya Sky',jp:'渋谷スカイ',desc:'Смотровая на крыше Shibuya Scramble Square — 360° вид на весь Токио.',lat:35.6580,lng:139.7025},
  {n:7,name:'Hachiko Statue',jp:'ハチ公像',desc:'Бронзовая статуя верного пса — главная точка встречи у станции Сибуя.',lat:35.6591,lng:139.7006},
  {n:8,name:'Shibuya Crossing',jp:'渋谷スクランブル',desc:'Самый загруженный перекрёсток мира — тысячи людей переходят одновременно.',lat:35.6595,lng:139.7004},
 ],
 budget:{transport:'¥1,500–2,000',entry:'¥8,900 · 4 022 ₽',total:'¥10,400–10,900 · 4 022 ₽'}},

{tab:'28 сент',city:'Гарри Поттер · выставки',jp:'東京',mapColor:'#888',
 note:'Билеты WB бронировать заранее. Полу-свободный день.',
 transit:[{icon:'metro',route:'Метро → Тосимаэн / JR Яматэ',detail:'WB Studio + Мэйдзи / Симокитадзawa · IC-карта',cost:'¥1,500–2,000 · IC'}],
 places:[
  {n:1,name:'Warner Bros. Studio Tour Tokyo',jp:'ワーナー ブラザース スタジオツアー東京',desc:'Реальные декорации Гарри Поттера: Хогвартс, Косой переулок, Косяк № 9¾',lat:35.7396,lng:139.6623},
  {n:2,name:'Meiji Shrine',jp:'明治神宮',desc:'Главная святыня Токио в лесу из 120 000 деревьев.',lat:35.6764,lng:139.6993},
  {n:3,name:'Shimokitazawa',jp:'下北沢',desc:'Винтажные магазины, бары, более «местный» вайб, чем Сибуя.',lat:35.6617,lng:139.6662},
 ],
 budget:{transport:'¥1,500–2,000',entry:'¥6,500 · 3 276,87 ₽',total:'¥8,000–8,500 · 3 276,87 ₽'}},

{tab:'29 сент',city:'Камакура',jp:'鎌倉・江の島',mapColor:'#888',
 transit:[
  {icon:'train',route:'Tokyo → Kamakura',detail:'JR Ёкосука, 55 мин · IC-карта',cost:'¥1,000 · IC',link:TICKET_LINKS.tokyo_kamakura,linkLabel:'Trip.com'},
  {icon:'train',route:'Обратно Enoshima → Tokyo',detail:'Enoden + JR, ~1 ч · IC-карта',cost:'¥1,300 · IC',link:TICKET_LINKS.enoshima_tokyo,linkLabel:'Trip.com'},
 ],
 places:[
  {n:1,name:'Engaku-ji',jp:'円覚寺',desc:'Дзэн-монастырь XIII в. у подножия горы — один из важнейших в Японии.',lat:35.3383,lng:139.5483},
  {n:2,name:'Kencho-ji',jp:'建長寺',desc:'Старейший дзэн-храм Японии (1253 г.), школа Риндзай. Внушительные ворота Самон.',lat:35.3360,lng:139.5527},
  {n:3,name:'Tsurugaoka Hachimangu',jp:'鶴岡八幡宮',desc:'Главная святыня Камакуры. Лотосовые пруды, лестница в 61 ступень.',lat:35.3265,lng:139.5567},
  {n:4,name:'Hokoku-ji',jp:'報国寺',desc:'Дзэн-храм с бамбуковой рощей — самый атмосферный уголок Камакуры.',lat:35.3087,lng:139.5619},
  {n:5,name:'Kotoku-in · Great Buddha',jp:'高徳院大仏',desc:'Бронзовый Будда 13 м под открытым небом. Можно зайти внутрь статуи (+¥50).',lat:35.3167,lng:139.5353},
  {n:6,name:'Hase-dera',jp:'長谷寺',desc:'Один из красивейших храмов Камакуры — смотровая с видом на залив.',lat:35.3139,lng:139.5347},
  {n:7,name:'Enoshima Shrine',jp:'江島神社',desc:'Синтоистский комплекс на острове: пещеры Ивайя, закат над океаном, вид на Фудзи.',lat:35.2994,lng:139.4813},
 ],
 budget:{transport:'¥2,300',entry:'¥2,000 · 912 ₽',total:'¥4,300 · 912 ₽'}},

{tab:'30 сент',city:'Токио · Финал',jp:'東京',mapColor:'#888',
 note:'Финал, выезд. Маршрут свободный — шопинг, повтор любимых мест или отдых перед дорогой.',
 transit:[{icon:'metro',route:'Токио, местные',detail:'IC-карта',cost:'¥1,000–1,500 · IC'}],
 places:[],
 budget:{transport:'¥1,000–1,500',total:'¥1,000–1,500'}},
];

// ─── TRANSIT ICONS ────────────────────────
const ICONS={
  plane:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
  train:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 19l-2 2M16 19l2 2"/><circle cx="8.5" cy="15.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/></svg>`,
  bus:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18v11H3V6zM3 11h18M3 6V4h18v2M8 17v2M16 17v2"/><circle cx="8" cy="17.5" r="1.5"/><circle cx="16" cy="17.5" r="1.5"/></svg>`,
  metro:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15V8a1 1 0 011-1h4l3 5 3-5h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1z"/><path d="M7 19l-1 2M17 19l1 2"/></svg>`,
};

// ─── PLACES CATALOG ────────────────────
const REGIONS=[
  {id:'osaka',name:'Осака',jp:'大阪'},
  {id:'kyoto',name:'Киото',jp:'京都'},
  {id:'nara',name:'Нара',jp:'奈良'},
  {id:'fuji',name:'Фудзи',jp:'富士山'},
  {id:'tokyo',name:'Токио',jp:'東京'},
  {id:'kamakura',name:'Камакура',jp:'鎌倉・江の島'},
];
const DAY_REGION=['osaka','osaka','kyoto','nara','osaka','fuji','fuji','tokyo','tokyo','tokyo','tokyo','tokyo','kamakura','tokyo'];

const STAYS={
  osaka:[{
    name:'Наш дом',
    jp:'我が家',
    kind:'home',
    address:'Zaimokuchō 2-6, Chuo, 540-0010 Osaka, Japan',
    lat:34.6798,
    lng:135.5114,
  }],
  fuji:[{
    name:'Наш дом',
    jp:'我が家',
    kind:'home',
    address:'3647-8 Funatsu, Minamitsuru District, 401-0301 Fujikawaguchiko, Yamanashi, Japan',
    lat:35.498275,
    lng:138.770129,
  }],
  tokyo:[{
    name:'Наш дом',
    jp:'MAT Ryogoku',
    kind:'home',
    address:'1-5-7 Ryogoku, Sumida, Tokyo, Japan',
    lat:35.6948,
    lng:139.7928,
    priceRub:36935,
    dates:'24–30 сент · 6 ночей',
    link:'https://ru.trip.com/hotels/detail/?cityEnName=Tokyo&cityId=228&hotelId=132844917&checkIn=2026-09-24&checkOut=2026-09-30&adult=2&children=0&crn=1&ages=&curr=RUB&barcurr=RUB',
  }],
};

const SHOP_CAT_COLORS={
  vintage:'#6A1B9A',concept:'#1565C0',boutiques:'#2E7D32',
  beauty:'#C62828',sneakers:'#EF6C00',tech:'#00838F',food:'#B45309',
};
const CITY_GMAPS={
  osaka:'https://maps.app.goo.gl/YjYyPXe4Nh9GiQCG8',
  tokyo:'https://maps.app.goo.gl/D4BgcHg8GppvbyN76',
  kyoto:'https://maps.app.goo.gl/D4BgcHg8GppvbyN76',
  nara:'https://maps.app.goo.gl/D4BgcHg8GppvbyN76',
  kamakura:'https://maps.app.goo.gl/D4BgcHg8GppvbyN76',
  fuji:'https://maps.app.goo.gl/mMKZMCUfc52VZe1w7',
};

const SHOPS_BY_CITY={
tokyo:[
  {id:'vintage',title:'Винтаж и ресейл',jp:'ヴィンテージ',
  shops:[
    {id:'amore_vintage',name:'AMORE Vintage AOYAMA',jp:'アモーレヴィンテージ',desc:'Люксовый винтаж-бутик — Chanel, Hermès, архивные коллекции.',area:'Jingumae · Аояма',address:'Jingumae 5-1-6, 2F',lat:35.6645,lng:139.7064},
    {id:'vintage_qoo',name:'Vintage QOO',jp:'ヴィンテージQOO',desc:'Аутентичный винтаж до 2000-х — одежда, аксессуары, японские и западные бренды.',area:'Jingumae · Аояма',address:'Jingumae 5-2-6, B1F-2F',lat:35.6648,lng:139.7068},
    {id:'paradise',name:'Paradise Vintage',jp:'パラダイスヴィンテージ',desc:'Кураторский винтаж в Харадзюку — одежда и аксессуары.',area:'Jingumae · Аояма',address:'Jingumae 6-6-2, 2F',lat:35.6661,lng:139.7041},
    {id:'mixthinks',name:'MixTHINKS Harajuku',jp:'ミックスシンクス',desc:'Винтаж и streetwear в двух этажах у Omotesando.',area:'Harajuku · Аояма',address:'Jingumae 6-28-6, 1F-2F',lat:35.6652,lng:139.7018},
    {id:'ragtag',name:'RAGTAG Shibuya',jp:'ラグタグ',desc:'Ресейл и винтаж люксовых домов — архивная одежда, обувь, аксессуары.',area:'Сибуя',address:'Jinnan 1-17-7',lat:35.6635,lng:139.7002},
    {id:'oedo_market',name:'OEDO Antique Market',jp:'大江戸骨董市',desc:'Антикварный рынок под открытым небом — проходит 2 раза в неделю (сб/вс).',area:'Marunouchi',address:'Marunouchi 3-5-5',lat:35.6770,lng:139.7635},
    {id:'brand_off',name:'Brand Off Tokyo',jp:'ブランドオフ',desc:'Люкс-аксессуары, сумки, часы, одежда с сертификатами проверки.',area:'Гинза',address:'Ginza 5-5-9, 1F-4F',lat:35.6701,lng:139.7655},
    {id:'brand_collect',name:'Brand Collect',jp:'ブランドコレクト',desc:'Люкс и streetwear винтаж у Miyashita Park.',area:'Сибуя',address:'Jinnan 1-9-2, 1F',lat:35.6648,lng:139.7025},
    {id:'casanova',name:'CASANOVA vintage',jp:'カサノバ',desc:'Винтаж у T\'s Omotesando — кураторский отбор улицы Omotesando.',area:'Jingumae · Omotesando',address:'Jingumae 5-11-6, T\'s Omotesando 1F',lat:35.6659,lng:139.7090},
    {id:'brand_collect_vintage',name:'BRAND COLLECT VINTAGE',jp:'ブランドコレクト',desc:'Флагманский винтаж Omotesando — 3 мин от Omotesando Hills.',area:'Jingumae · Omotesando',address:'Jingumae 4-3-21, Nodera Bldg 1F',lat:35.6671,lng:139.7106},
    {id:'atlantis_hiroo',name:'Atlantis Vintage Hiroo',jp:'アトランティス',desc:'Винтаж в Hiroo — кураторский отбор одежды и аксессуаров.',area:'Hiroo · Сибуя',address:'Hiroo 5-2-24',lat:35.6499,lng:139.7204},
    {id:'hedy_daikanyama',name:'Hedy Daikanyama',jp:'ヘディー代官山',desc:'Люкс-винтаж Hedy в Daikanyama — отбор мировых брендов.',area:'Daikanyama · Сибуя',address:'Sarugakucho 26-8',lat:35.6501,lng:139.7011},
  ]},
  {id:'boutiques',title:'Бутики / бренды',jp:'ブティック',
  shops:[
    {id:'uniqlo_ginza',name:'Uniqlo Ginza',jp:'ユニクロ銀座',desc:'Флагман на 12 этажей — полная линейка, UT, кастомизация, tax-free.',area:'Гинза',address:'Ginza 6-9-5, 1F-12F',lat:35.6693,lng:139.7644},
    {id:'muji_ginza',name:'MUJI Ginza',jp:'無印良品銀座',desc:'10 этажей MUJI + MUJI HOTEL — одежда, дом, еда, кафе, флагманский опыт бренда.',url:'https://www.muji.com/jp',urlLabel:'muji.com',area:'Гинза',address:'Ginza 3-3-5',lat:35.6718,lng:139.7642},
    {id:'gentle_monster',name:'Gentle Monster Aoyama',jp:'ジェントルモンスター',desc:'Концептуальный бутик-инсталляция — очки Gentle Monster.',area:'Minamiaoyama',address:'Minamiaoyama 5-3-2, 1F-2F',lat:35.6623,lng:139.7135},
    {id:'cdg_aoyama',name:'Comme des Garcons Aoyama',jp:'コムデギャルソン',desc:'Двухэтажное флагманское пространство — основные линии CDG.',area:'Minamiaoyama',address:'Minamiaoyama 5-2-1',lat:35.6630,lng:139.7128},
    {id:'itoya',name:'Itoya Ginza',jp:'伊東屋',desc:'Флагманский 12-этажный магазин канцелярии с 1904 года — G. Itoya и K. Itoya.',area:'Гинза',address:'Ginza 2-7-15',lat:35.6730,lng:139.7674},
    {id:'yello_fitting',name:'YELLO FITTING SALON',jp:'イエロー',desc:'Фitting salon бренда YELLO в Харадзюку — примерка и покупка культовой японской обуви.',area:'Jingumae · Харадзюку',address:'Jingumae 6-8-5, AI Bldg 2F',lat:35.6659,lng:139.7046},
    {id:'donki',name:'Don Quijote',jp:'ドン・キホーテ',desc:'Дискаунтер на любой случай — сувениры, косметика, снеки, электроника, tax-free.',url:'https://www.donki.com/en/',urlLabel:'donki.com',area:'Сибуя',address:'Udagawacho 28-6',lat:35.6604,lng:139.6978},
  ]},
  {id:'beauty',title:'Красота / уход',jp:'ビューティ',
  shops:[
    {id:'refa',name:'REFA Ginza',jp:'リファ',desc:'Японские бьюти-гаджеты ReFa — массажёры для лица и тела, уходовая электроника.',area:'Гинза',address:'Ginza 7-9-15, GINZA gCUBE',lat:35.6687,lng:139.7628},
    {id:'matsukiyo',name:'Matsumoto Kiyoshi Ginza',jp:'マツモトキヨシ',desc:'Аптека Matsumoto Kiyoshi в Гинзе — японская косметика, tax-free.',area:'Гинза',address:'Ginza 5-5-1',lat:35.6720,lng:139.7647},
    {id:'tamburins',name:'TAMBURINS AOYAMA',jp:'タンバリンズ',desc:'Магазин парфюмерии Tamburins — The Jewels of Aoyama.',area:'Minamiaoyama',address:'Minamiaoyama 5-3-2, The Jewels of Aoyama 105',lat:35.6623,lng:139.7135},
    {id:'cosme_kitchen',name:'Cosme Kitchen BEAUTY',jp:'コスメキッチン',desc:'Натуральная и органическая косметика в Ginza Mitsukoshi.',area:'Гинза',address:'Ginza 4-6-16, Ginza Mitsukoshi 3F',lat:35.6712,lng:139.7659},
  ]},
  {id:'food',title:'Еда',jp:'フード',
  shops:[
    {id:'kaiten_sushi',name:'Conveyor Kaiten Sushi',jp:'回転寿司',desc:'Кайтэн-суши на Omotesando — лента в Il Palazzino 1F.',area:'Jingumae · Omotesando',address:'Jingumae 5-1-6, Il Palazzino 1F',lat:35.6647,lng:139.7066},
  ]},
  {id:'sneakers',title:'Обувь / кроссовки',jp:'スニーカー',
  shops:[
    {id:'onitsuka',name:'Onitsuka Tiger Shibuya',jp:'オニツカタイガー',desc:'Флагман в Сибуе — Mexico 66, японские релизы и коллаборации.',area:'Сибуя',address:'Jinnan 1-21-3, Shibuya Jinnan Bldg 1-2F',lat:35.6614,lng:139.7006},
    {id:'abc_mart',name:'ABC-MART Shibuya',jp:'エービーシーマート',desc:'Крупный флагман у центра Сибуи — сникеры, японские и мировые бренды.',area:'Сибуя',address:'Udagawacho 27-6, Shibuya T Bldg.',lat:35.6621,lng:139.6975},
    {id:'atmos',name:'atmos',jp:'アトモス',desc:'Сникер-хаб — японские релизы, коллаборации Nike/adidas и лимитированные дропы.',url:'https://www.atmos-tokyo.com/',urlLabel:'atmos-tokyo.com',area:'Сибуя · Харадзюку',address:'Jingumae 6-5-3',lat:35.6660,lng:139.7055},
  ]},
  {id:'tech',title:'Техника',jp:'テック',
  shops:[
    {id:'bic_camera',name:'Bic Camera Shibuya East',jp:'ビックカメラ',desc:'Крупный электронный дискаунтер у восточного выхода Сибуи — камеры, гаджеты, tax-free, часто скидки туристам.',area:'Сибуя',address:'Shibuya 1-24-12, Toei Plaza 1-5F',lat:35.6593,lng:139.7018},
  ]},
  {id:'concept',title:'Концепт-сторы',jp:'コンセプトストア',
  shops:[
    {id:'nubian',name:'Nubian Harajuku',jp:'ヌビアン',desc:'Концепт-стор уличной моды и дизайнерских брендов в Харадзюку.',area:'Jingumae · Харадзюку',address:'Jingumae 1-20-2',lat:35.6692,lng:139.7073},
    {id:'wism',name:'WISM Shibuya',jp:'ウィズム',desc:'Мультибрендовый концепт-стор — японский и международный streetwear.',area:'Jingumae',address:'Jingumae 6-19-12, Aoyama Bldg 1F',lat:35.6661,lng:139.7041},
    {id:'royal_flash',name:'Royal Flash Jingumae',jp:'ロイヤルフラッシュ',desc:'Кураторский магазин моды и лайфстайла в Jingumae.',area:'Jingumae',address:'Jingumae 6-18-8',lat:35.6663,lng:139.7040},
    {id:'gr8',name:'GR8',jp:'グレイト',desc:'Галерея-магазин моды и арт-объектов — экспериментальные бренды.',area:'Jingumae · Omotesando',address:'Jingumae 1-11-6, 2.5F',lat:35.6691,lng:139.7054},
    {id:'loveless',name:'Loveless Aoyama',jp:'ラブレス',desc:'Культовый концепт-стор японского авангарда и дизайнерской моды.',area:'Minamiaoyama',address:'Minamiaoyama 3-16-1',lat:35.6646,lng:139.7147},
    {id:'dsm',name:'Dover Street Market Ginza',jp:'ドーバーストリートマーケット',desc:'Флагман Comme des Garçons — мультибрендовое пространство-инсталляция.',area:'Ginza',address:'Ginza 6-9-5',lat:35.6693,lng:139.7644},
    {id:'beams',name:'BEAMS Harajuku',jp:'ビームス',desc:'Культовый флагман BEAMS в Харадзюку — streetwear и heritage.',area:'Jingumae · Harajuku',address:'Jingumae 3-24-7, 1F-2F',lat:35.6704,lng:139.7108},
    {id:'kith',name:'Kith Tokyo',jp:'キス',desc:'Флагман Kith в Miyashita Park — кроссовки, одежда, коллаборации.',area:'Jingumae · Miyashita Park',address:'Jingumae 6-20-10, Miyashita Park North 1-2F',lat:35.6636,lng:139.7022},
  ]},
],
osaka:[
  {id:'vintage',title:'Винтаж и ресейл',jp:'ヴィンテージ',
  shops:[
    {id:'hedy_osaka',name:'Hedy Vintage shop Osaka',jp:'ヘディー',desc:'Кураторский люкс-винтаж в Minamihorie — отбор мировых брендов, tax-free.',area:'Minamihorie · Nishi',address:'Minamihorie 1-14-2',lat:34.6699,lng:135.4973},
    {id:'authentic_experts',name:'Authentic Experts',jp:'オーセンティックエキスパーツ',desc:'Винтаж и ресейл в Minamisenba — кураторский отбор одежды и аксессуаров.',area:'Minamisenba · Chuo',address:'Minamisenba 3-8-15, 1F',lat:34.6762,lng:135.5028},
    {id:'soar_osaka',name:'Soar Shop Osaka',jp:'ソア',desc:'Винтаж у Shinsaibashi — одежда и streetwear на втором этаже.',area:'Shinsaibashi · Chuo',address:'Nishishinsaibashi 1-6-23, 2F',lat:34.6710,lng:135.5005},
    {id:'popeye_osaka',name:'POPEYE vintage used clothing',jp:'ポパイ',desc:'Used & vintage у Nakazaki — одежда у Umeda / Kita.',area:'Nakazaki · Kita',address:'Nakazakinishi 3-1-10',lat:34.7082,lng:135.5108},
  ]},
  {id:'food',title:'Еда',jp:'フード',
  shops:[
    {id:'kura_sushi_namba',name:'Kura Sushi Namba',jp:'くら寿司 なんば',desc:'Кайтэн-суши Kura на 4F BRAVE Namba у Sennichimae — лента и тач-заказ.',area:'Namba · Chuo',address:'Nanbasennichimae 15-15, BRAVE Namba 4F',lat:34.6643,lng:135.5039},
  ]},
],
};
const SHOP_CATEGORIES=SHOPS_BY_CITY.tokyo;
const EXTRA_PLACES={
  osaka:[
    {name:'Katsuoji Temple',jp:'勝尾寺',desc:'Храм «победы» в горах Миноо — тысячи красных дарума, сады и вид на осенние клёны',lat:34.8656,lng:135.4923},
  ],
  tokyo:[],
};
