const cyrillic=/[а-яё]/i;
export const hasCyrillic=value=>cyrillic.test(String(value||''));
export const russianOnly=value=>hasCyrillic(value)?String(value).trim():'';

const regionNames=typeof Intl!=='undefined'&&Intl.DisplayNames?new Intl.DisplayNames(['ru'],{type:'region'}):null;
export function russianCountry(code,fallback=''){
 try{const name=code&&regionNames?.of(String(code).toUpperCase());if(name&&name!==String(code).toUpperCase())return name;}catch{}
 return russianOnly(fallback);
}

const categories={
 attraction:'Достопримечательность',museum:'Музей',gallery:'Галерея',viewpoint:'Смотровая площадка',artwork:'Арт-объект',
 memorial:'Мемориал',monument:'Памятник',castle:'Замок',ruins:'Руины',archaeological_site:'Археологический памятник',
 wayside_cross:'Придорожный крест',wayside_shrine:'Придорожное святилище',city_gate:'Городские ворота',building:'Здание',fort:'Крепость',
 park:'Парк',garden:'Сад',nature_reserve:'Заповедник',place_of_worship:'Храм',tower:'Башня',peak:'Вершина',beach:'Пляж',
 waterfall:'Водопад',theme_park:'Парк развлечений',zoo:'Зоопарк',aquarium:'Аквариум',cafe:'Кафе',restaurant:'Ресторан',
 hotel:'Отель',hostel:'Хостел',bridge:'Мост',theatre:'Театр',church:'Церковь',cathedral:'Собор',temple:'Храм',shrine:'Святилище'
};
export const categoryName=place=>categories[place?.category]||'';

// Short “why go” hints when the source text is a useless Wikidata stub.
const visitHints={
 museum:'Стоит зайти за экспозицией и атмосферой места',
 gallery:'Выставочное пространство — имеет смысл при интересе к искусству',
 viewpoint:'Смотровая точка: ехать ради вида',
 castle:'Замок/крепость — сильный исторический акцент маршрута',
 fort:'Крепость — сильный исторический акцент маршрута',
 ruins:'Руины: атмосфера и история, мало «инфраструктуры»',
 park:'Парк для прогулки и паузы между точками',
 garden:'Сад — спокойная прогулка и фото',
 nature_reserve:'Природный объект: больше про гулять, чем «сходить внутрь»',
 place_of_worship:'Храм/святилище — атмосфера и архитектура',
 church:'Храм — архитектура и атмосфера',
 cathedral:'Собор — архитектура и атмосфера',
 temple:'Храм — архитектура и атмосфера',
 shrine:'Святилище — атмосфера и ритуал',
 tower:'Башня/смотровая — ехать ради высоты и вида',
 peak:'Вершина: вид и маршрут подъёма',
 beach:'Пляж — отдых у воды',
 waterfall:'Водопад — короткая природная точка',
 theme_park:'Парк развлечений: планируйте полдня–день',
 zoo:'Зоопарк — семейная точка на несколько часов',
 aquarium:'Аквариум — семейная/indoor точка',
 monument:'Памятник: быстрая точка у маршрута',
 memorial:'Мемориал — короткая, но значимая остановка',
 bridge:'Мост — чаще видовая/транзитная точка',
 theatre:'Театр: имеет смысл с билетом на постановку',
 attraction:'',
};

const uselessDesc=/^(у этого термина|может означать|может относиться|disambiguation|may refer to|статья[^.]*заготовк|незавершённ|stub\b)/i;
const bareGeo=/^(это |является )?(город|деревня|село|посёлок|станция|район|округ|муниципалитет|остров|река|озеро)\b/i;
const visitSignal=/музей|храм|собор|святил|замок|крепост|парк|сад|смотр|панорам|извест|постро|архитект|экспозиц|стату|башн|ворот|дворец|галере|памятник|культур|истори|природ|водопад|пляж|сад[уа]|фестивал|коллекц|уник|крупн|стар|древн|главн|символ|знаменит/i;

/** Strip wiki noise; keep text that helps decide whether to visit. */
export function polishDescription(raw=''){
 let text=String(raw||'')
  .replace(/<[^>]*>/g,'')
  .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/\[[\d\s,;-]+\]/g,'')
  .replace(/\s+/g,' ')
  .trim();
 if(!text)return '';
 if(uselessDesc.test(text)||bareGeo.test(text))return '';
 // Drop leading "Name — " echo when the rest is a thin label.
 text=text.replace(/^[^.]{1,80}\s[—–-]\s+/,'');
 const sentences=text.split(/(?<=[.!?…])\s+/).map(s=>s.trim()).filter(s=>s&&!bareGeo.test(s)&&!uselessDesc.test(s)&&s.length>=24);
 if(!sentences.length)return '';
 const score=s=>(visitSignal.test(s)?5:0)+(/\b(смотр|музей|храм|замок|парк|сад|башн)\w*/i.test(s)?3:0)+(s.length>55?2:0)+(s.length>110?1:0)-(s.length<32?2:0);
 // Keep source order, but start from the strongest sentence and append the next useful one.
 const start=sentences.reduce((best,s,i)=>score(s)>score(sentences[best])?i:best,0);
 let out=sentences[start];
 if(sentences[start+1]&&score(sentences[start+1])>=3&&(out+' '+sentences[start+1]).length<=240)out+=' '+sentences[start+1];
 if(out.length<28)return '';
 return out.length>240?out.slice(0,237).replace(/\s+\S*$/,'')+'…':out;
}

function fallbackTeaser(place){
 const cat=categoryName(place);
 const where=russianOnly(place?.city)||russianOnly(place?.address);
 return [cat,where].filter(Boolean).join(' · ');
}

/** Visible card/detail copy: polished source text, else a category “why go” teaser. */
function rawPlaceDescription(place,compact=false){
 if(compact&&place?.shortDesc)return place.shortDesc;
 if(!compact&&(place?.authorSupplied||/^japan_(places_guide|more_destinations|popular_destinations)\.md/.test(place?.metadataOrigin||''))&&place?.desc)return place.desc;
 const polished=polishDescription(russianOnly(place?.desc)||place?.desc);
 if(polished&&hasCyrillic(polished))return polished;
 // Allow polished EN only when nothing Russian exists (rare); prefer RU teaser.
 const en=polishDescription(place?.desc);
 if(en&&!russianOnly(place?.desc)){
  const teaser=fallbackTeaser(place);
  // Prefer Russian teaser over raw English encyclopedia line on RU UI.
  if(teaser)return teaser;
  return en;
 }
 return fallbackTeaser(place);
}

export function capitalizeDescription(value=''){
 return String(value).replace(/(^|\n\s*\n)([^\p{L}]*)(\p{L})/gu,(_,start,prefix,letter)=>start+prefix+letter.toLocaleUpperCase('ru'));
}
export function placeDescription(place,compact=false){return capitalizeDescription(rawPlaceDescription(place,compact));}

/** Keep only descriptions worth storing on a place object. */
export function usefulPlaceDesc(raw){
 return polishDescription(russianOnly(raw)||raw);
}
