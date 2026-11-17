// Official-site reference values checked 2026-11-12. Never match by name alone.
const official=[
 {lat:51.5007,lng:-.1246,names:/биг.?бен|big ben|elizabeth tower/i,price:'£55 — экскурсия, взрослый',hours:'По сеансам, по предварительной записи',metaSource:'https://www.parliament.uk/visiting/visiting-and-tours/big-ben-tour/',metaProvider:'UK Parliament'},
 {lat:51.5089,lng:-.1283,names:/национальн.*галере|national gallery/i,price:'Бесплатно — постоянная коллекция',hours:'Ежедневно 10:00–18:00; пт до 21:00. Закрыто 24–26 декабря и 1 января',metaSource:'https://www.nationalgallery.org.uk/visiting/plan-your-visit',metaProvider:'National Gallery'},
];
export function officialMeta(p){const found=official.find(x=>x.names.test(p.name||p.nameEn||'')&&Math.hypot(p.lat-x.lat,p.lng-x.lng)<.003);if(!found)return {};const {names,lat,lng,...meta}=found;return {...meta,metaChecked:'2026-11-12'};}
export function claimsMeta(entity){
 const claims=entity?.claims||{},result={};
 const fees=(claims.P2555||[]).filter(c=>c.rank!=='deprecated'&&!c.qualifiers?.P582).map(c=>c.mainsnak?.datavalue?.value).filter(Boolean);
 if(fees.length===1&&fees[0].amount!==undefined){const f=fees[0],amount=Number(f.amount),unit=String(f.unit||'').split('/').pop();const currencies={Q4917:'USD',Q25224:'GBP',Q4916:'EUR',Q8146:'JPY',Q41044:'RUB'};if(amount===0)result.price='Бесплатно';else if(currencies[unit])result.price=amount+' '+currencies[unit];}
 return result;
}
export async function wikidataMeta(p,signal){if(!/^Q\d+$/.test(p.wikidata||''))return {};const response=await fetch('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',origin:'*',ids:p.wikidata,props:'claims'}),{signal,credentials:'omit'});if(!response.ok)return {};const data=await response.json();const meta=claimsMeta(data.entities?.[p.wikidata]);return Object.keys(meta).length?{...meta,metaSource:'https://www.wikidata.org/wiki/'+p.wikidata,metaProvider:'Wikidata'}:{};}
