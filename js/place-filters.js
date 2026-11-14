export const PLACE_TYPES=[
 {value:'museums',content:'Музеи и галереи'},
 {value:'religious',content:'Храмы и соборы'},
 {value:'nature',content:'Парки и природа'},
 {value:'architecture',content:'Памятники и архитектура'},
 {value:'viewpoints',content:'Смотровые'},
 {value:'entertainment',content:'Парки развлечений'},
 {value:'other',content:'Другие места'},
];
export const placeCity=p=>String(p.city||'').split(' · ')[0].trim();
export function placeType(p){
 const c=p.category||'';
 if(['museum','gallery'].includes(c))return 'museums';
 if(c==='place_of_worship')return 'religious';
 if(['park','garden','nature_reserve','peak','beach','waterfall'].includes(c))return 'nature';
 if(c==='viewpoint')return 'viewpoints';
 if(['theme_park','zoo','aquarium'].includes(c))return 'entertainment';
 if(['memorial','monument','castle','ruins','archaeological_site','city_gate','building','fort','tower'].includes(c))return 'architecture';
 const text=[p.name,p.kind,p.desc].filter(Boolean).join(' ').toLowerCase();
 if(/музе|галере|museum|gallery/.test(text))return 'museums';
 if(/храм|собор|церков|святилищ|монастыр|пагод|temple|shrine|cathedral|church|monastery|pagoda/.test(text))return 'religious';
 if(/смотров|панорам|viewpoint|observation|sky building|shibuya sky/.test(text))return 'viewpoints';
 if(/тематическ|развлечени|зоопарк|аквариум|theme park|universal studios|disney|zoo|aquarium/.test(text))return 'entertainment';
 if(/парк|сад|озер|водопад|пляж|лес|park|garden|lake|waterfall|beach|bamboo/.test(text))return 'nature';
 if(/памятник|мемориал|дворец|замок|башн|скульптур|монумент|statue|memorial|monument|palace|castle|tower|sculpture/.test(text))return 'architecture';
 return 'other';
}
export function filterPlaces(items,{city='',type='',query=''}={}){
 const q=query.trim().toLocaleLowerCase('ru');
 return items.filter(p=>(!city||placeCity(p)===city)&&(!type||placeType(p)===type)&&(!q||[p.name,p.city,p.address,p.desc].filter(Boolean).join(' ').toLocaleLowerCase('ru').includes(q)));
}
