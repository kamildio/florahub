// Stable keys preserve existing offers/imports when a category's display name changes.
const initial=[['Розы','Раушандар'],['Тюльпаны','Қызғалдақтар'],['Хризантемы','Хризантемалар'],['Гортензии','Гортензиялар'],['Зелень','Жасыл өсімдіктер'],['Растения','Өсімдіктер']];
function defaults(s){
 const labels=new Map(initial);for(const p of [...(s.baseProducts||[]),...(s.products||[])])if(typeof p.category==='string'&&p.category&&!labels.has(p.category))labels.set(p.category,p.category);
 return {revision:1,categories:[...labels].map(([key,kk],position)=>({id:key,key,ru:key,kk,active:true,position:position+1})),audit:[]};
}
export const directory=s=>s.catalogDirectory||defaults(s);
export const ensureDirectory=s=>s.catalogDirectory??=defaults(s);
export function publicCategories(s){return directory(s).categories.filter(x=>x.active).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)).map(({id,key,ru,kk})=>({id,key,ru,kk}));}
export function catalogEntryEnabled(s,p){
 const c=directory(s).categories.find(x=>x.key===p.category);
 const base=(s.baseProducts||[]).find(x=>x.id===p.baseId);
 return c?.active!==false&&base?.archived!==true;
}
export function availableBaseProducts(s){return (s.baseProducts||[]).filter(x=>!x.archived&&directory(s).categories.some(c=>c.key===x.category&&c.active));}

export function categoryLabels(s,key){const c=directory(s).categories.find(x=>x.key===key);return {ru:c?.ru||key,kk:c?.kk||c?.ru||key};}
