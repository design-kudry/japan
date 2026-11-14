const RU_PLACE_NAMES={
 'Namba Yasaka Shrine':'Храм Намба Ясака','Kura Sushi Namba':'Кура Суши Намба','Dotonbori':'Дотонбори','Amerikamura':'Америка-мура',
 'Shinsaibashi-suji':'Синсайбаси-суджи','Sumiyoshi Taisha':'Сумиёси-тайся','Osaka Castle':'Замок Осаки','Nakanoshima Park':'Парк Наканосима',
 'Umeda Sky Building':'Умеда Скай Билдинг','Den Den Town':'Ден-Ден Таун','Shinsekai':'Синсэкай','To-ji':'Тодзи','Tofuku-ji':'Тофукудзи',
 'Fushimi Inari Taisha':'Фусими Инари-тайся','Kiyomizu-dera':'Киёмидзу-дэра','Gion':'Гион','Higashiyama':'Хигасияма','Nishiki Market':'Рынок Нисики',
 'Nijo Castle':'Замок Нидзё','Arashiyama Bamboo':'Бамбуковая роща Арасияма','Todai-ji':'Тодай-дзи','Nara Park':'Парк Нара',
 'Universal Studios Japan':'Юниверсал Студиос Джапан','Chureito Pagoda':'Пагода Тюреито','Lake Kawaguchi':'Озеро Кавагутико',
 'Kachi Kachi Ropeway':'Канатная дорога Качи-Качи','Oishi Park':'Парк Оиси','Saiko Iyashi-no-Sato Nenba':'Деревня Сайко Ияси-но-Сато Нэнба',
 'Oshino Hakkai':'Осино Хаккай','Shinjuku Gyoen':'Сад Синдзюку-гёэн','Shinjuku':'Синдзюку','Omoide Yokocho':'Омоидэ-ёкотё','Kabukicho':'Кабукитё',
 'Golden Gai':'Голден-гай','Kameido Tenjin Shrine':'Храм Камэидо Тэндзин','Tokyo Skytree':'Токийская телебашня Скайтри','Sumida Park':'Парк Сумида',
 'Nakamise':'Накамисэ','Senso-ji':'Сэнсо-дзи','Tokyo National Museum':'Токийский национальный музей','Ueno Park':'Парк Уэно',
 'Akihabara Electric Town':'Акихабара','Hie Shrine':'Храм Хиэ','Imperial Palace':'Императорский дворец','Yasukuni Shrine':'Храм Ясукуни',
 'Kagurazaka':'Кагурадзака','Koishikawa Korakuen Garden':'Сад Коисикава Коракуэн','Nezu Shrine':'Храм Нэдзу','Yanaka Ginza':'Янака Гиндза',
 'teamLab Planets TOKYO':'тимЛаб Планетс Токио','Hamarikyu Gardens':'Сады Хамарикю','Azabudai Hills':'Азабудай Хиллз',
 'The National Art Center':'Национальный центр искусств','Mori Art Museum':'Музей искусств Мори','Shibuya Sky':'Сибуя Скай',
 'Hachiko Statue':'Памятник Хатико','Shibuya Crossing':'Перекрёсток Сибуя','Warner Bros. Studio Tour Tokyo':'Студия Уорнер Бразерс в Токио',
 'Meiji Shrine':'Храм Мэйдзи','Shimokitazawa':'Симокитадзава','Engaku-ji':'Энгаку-дзи','Kencho-ji':'Кентё-дзи','Tsurugaoka Hachimangu':'Цурутока Хатимангу',
 'Hokoku-ji':'Хококу-дзи','Kotoku-in · Great Buddha':'Котоку-ин · Большой Будда','Hase-dera':'Хасэ-дэра','Enoshima Shrine':'Храм Эносима','Katsuoji Temple':'Храм Кацуо-дзи'
};
// The persisted route key is name|lat|lng, so a renamed place keeps its old key as id.
function localizePlace(place){
 const curated=place.metadataOrigin&&(window.CuratedPlaces||[]).find(p=>p.id===place.id);
 if(curated)return {...place,...curated,id:place.id,img:curated.img||place.img};
 const name=RU_PLACE_NAMES[place.name];
 // Keep English catalog name for OSM matching after the UI name is localized.
 return name?{...place,id:place.id||place.name+'|'+place.lat+'|'+place.lng,nameEn:place.nameEn||place.name,name}:place;
}
