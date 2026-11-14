// Public MediaWiki API, no key. Only exact Wikidata-linked listings are used.
const cache=new Map();
const plain=s=>String(s||'').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,'').replace(/<[^>]*>/g,'').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1').replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g,'$1').replace(/'{2,}/g,'').trim();
export function listingMeta(text,wikidata){
 const starts=/\{\{\s*(?:see|do|listing|vcard)\s*\|/gi;let match;
 while((match=starts.exec(text))){let depth=1,i=starts.lastIndex;for(;i<text.length-1&&depth;i++){const pair=text.slice(i,i+2);if(pair==='{{'){depth++;i++;}else if(pair==='}}'){depth--;if(depth)i++;}}
 const block=text.slice(starts.lastIndex,i-1);const fields={};for(const part of block.split(/\|(?=\s*[\w-]+\s*=)/)){const at=part.indexOf('=');if(at>=0)fields[part.slice(0,at).trim().toLowerCase()]=part.slice(at+1).trim();}
 if(fields.wikidata!==wikidata)continue;
 const result={};for(const key of ['hours','price']){const value=plain(fields[key]);if(value&&!value.includes('{{'))result[key]=key==='price'&&/^free\.?$/i.test(value)?'Бесплатно':value;}
 return result;
 }return {};
}
export const destinationArticle=page=>(page.categories||[]).some(c=>/\b(?:city|district|region|park|rural area) articles$/i.test(c.title||''));
export async function voyageMeta(place,signal){
 if(!/^Q\d+$/.test(place.wikidata||''))return {};
 const key=place.wikidata,hit=cache.get(key);if(hit)return hit;
 const api=params=>'https://en.wikivoyage.org/w/api.php?'+new URLSearchParams({format:'json',origin:'*',...params});
 async function get(params){const response=await fetch(api(params),{signal,credentials:'omit'});if(!response.ok)throw Error('Wikivoyage unavailable');return response.json();}
 const found=await get({action:'query',list:'search',srsearch:'insource:'+key,srlimit:'3'});
 const titles=(found.query?.search||[]).map(p=>p.title);if(!titles.length){cache.set(key,{});return {};}
 const data=await get({action:'query',titles:titles.join('|'),prop:'revisions|categories',cllimit:'max',rvprop:'content',rvslots:'main'});
 for(const page of Object.values(data.query?.pages||{})){if(!destinationArticle(page))continue;const meta=listingMeta(page.revisions?.[0]?.slots?.main?.['*']||'',key);if(meta.price||meta.hours){const result={...meta,metaSource:'https://en.wikivoyage.org/wiki/'+encodeURIComponent(page.title),metaLicense:'CC BY-SA'};cache.set(key,result);return result;}}
 cache.set(key,{});return {};
}
