export const defaultCities=['Шымкент','Алматы','Астана','Актобе','Караганда','Тараз','Павлодар','Усть-Каменогорск','Семей','Костанай','Кызылорда','Атырау','Актау','Уральск','Туркестан','Петропавловск','Кокшетау','Талдыкорган','Жезказган','Конаев'];
export function cityDirectory(s){
 if(s?.platformSettings?.cities)return s.platformSettings.cities;
 const names=new Set(defaultCities);
 // Preserve legacy references if an older workspace used another city.
 for(const row of [...Object.values(s?.profiles||{}),...(s?.products||[]),...(s?.boardAds||[])])if(typeof row.city==='string'&&row.city)names.add(row.city);
 return [...names].map((name,i)=>({id:name,name,active:true,position:i+1}));
}
export const activeCities=s=>cityDirectory(s).filter(c=>c.active).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)).map(c=>c.name);
export const cityInUse=(s,name)=>Object.values(s.profiles||{}).some(p=>p.city===name)||(s.products||[]).some(p=>p.city===name)||(s.boardAds||[]).some(p=>p.city===name);
