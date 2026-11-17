// Shared display rules: compact hours, approximate numeric prices; raw source data stays intact.
export const UNKNOWN_META = 'Уточнить часы';
const missing=value=>!value||/^(?:—|-|unknown|неизвестно)$/i.test(String(value).trim());
export function officialWebsite(place){try{const u=new URL(place?.website||'');return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export function placeHoursLabel(hours) {
 if(missing(hours))return '';
 const value=String(hours).trim();
 if(/^(?:24\/7|круглосуточно|00:00[–-]24:00)$/i.test(value))return 'Круглосуточно';
 // Keep differing weekday schedules, but remove daily labels and visiting prose.
 const compact=value.replace(/ежедневно|every day|daily|Mo-Su|Пн[–-]Вс/gi,'').replace(/\s*[—–-]\s*/g,'–');
 const ranges=[...compact.matchAll(/(?:[01]?\d|2[0-3]):[0-5]\d\s*–\s*(?:[012]?\d):[0-5]\d/g)].map(m=>m[0]);
 if(ranges.length===1&&!/;.*\d/.test(compact))return ranges[0];
 if(ranges.length===1)return compact.split(/[.!]/)[0].replace(/Закрыто.*$/i,'').trim().replace(/^[:,\s]+/,'');
 if(ranges.length>1)return compact.split(/[.;]/)[0].trim().replace(/^[:,\s]+/,'');
 return '';

}
export function placePriceLabel(price) {
 if(missing(price))return '';
 const value=String(price).trim();
 if(/^(?:free|бесплатно)\b/i.test(value)||/^бесплатно/i.test(value))return 'Бесплатно';
 if(/^(?:платно|paid|fee|yes|no|donation)\b/i.test(value)||/^бесплатно/i.test(value))return '';
 const amount='\\d[\\d ,]*(?:[.]\\d+)?(?:[–—-]\\s*\\d[\\d ,]*(?:[.]\\d+)?)?';
 const currency='(?:USD|GBP|EUR|JPY|RUB|CNY|CHF|CAD|AUD|₽|£|€|¥|\\$|руб\\.?)';
 const matches=[...value.matchAll(new RegExp('(?:'+currency+'\\s*'+amount+'|'+amount+'\\s*'+currency+')','gi'))];
 if(matches.length!==1)return '';
 const result=matches[0][0].trim();
 if(!/[1-9]/.test(result))return '';
 // Multiple tariffs require a user choice; never silently select the first.
 const rest=value.slice(0,matches[0].index)+value.slice(matches[0].index+result.length);
 if(/\d/.test(rest))return '';
 return '≈ ' + result;
}
export function placeMeta(place){
 if(place?.outdoorAlwaysOpen||['quarter','neighbourhood','neighborhood','suburb','monument','memorial'].includes(place?.category))return {price:'',hours:'Круглосуточно',website:officialWebsite(place),unknownHours:false};
 const hours=placeHoursLabel(place?.hours)||(place?.outdoorAccessConfirmed===true?'Круглосуточно':'');
 return {price:placePriceLabel(place?.price),hours:hours||UNKNOWN_META,website:officialWebsite(place),unknownHours:!hours};
}
export function placeRouteMeta(place) {
 const meta=placeMeta(place);
 const ranges=[...String(place?.hours||'').matchAll(/(?:[01]?\d|2[0-3]):[0-5]\d\s*[–—-]\s*(?:[012]?\d):[0-5]\d/g)];
 const hours=meta.hours==='Круглосуточно'?meta.hours:ranges[0]?.[0]?.replace(/\s*[–—-]\s*/g,'–')||meta.hours;
 return [meta.price,hours].filter(Boolean).join(' · ');
}

/** Map OSM fee / charge tags into our price labels. Unknown → ''. */
export function priceFromOsmTags(tags = {}) {
  const fee = String(tags.charge || tags.fee || '').trim().toLowerCase();
  if (!fee) return '';
  if (fee === 'no' || fee === 'free' || fee === 'none' || fee === '0') return 'Бесплатно';
  if (fee === 'yes' || fee === 'donation' || fee === 'customers' || fee === 'unknown') return 'Платно';
  // Numeric / currency-looking charge text
  if (/[\d¥€$£₽]/.test(fee) || /hour|adult|child|ticket/i.test(fee)) return tags.charge || tags.fee;
  return 'Платно';
}

/** Soft visit-duration hint from OSM/tourism category when nothing else is known. */
export function visitDurationLabel(place = {}) {
  if (place.duration || place.visitDuration) return place.duration || place.visitDuration;
  const c = String(place.category || place.tourism || '').toLowerCase();
  if (/theme_park|zoo|aquarium|museum|gallery|castle/.test(c)) return '1–2 часа';
  if (/park|garden|viewpoint|attraction|artwork|monument|memorial/.test(c)) return '45–90 минут';
  if (/shrine|temple|church|cathedral|mosque|place_of_worship/.test(c)) return '30–60 минут';
  if (/marketplace|mall|shop|street/.test(c)) return '45–90 минут';
  return '';
}
