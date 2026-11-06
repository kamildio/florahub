// A catalog tile represents a base flower. Price comparisons always use one piece.
export function catalogGroups(products,allOffers=products){
 const visible=new Set(products.map(p=>String(p.baseId||p.id)));
 const groups=new Map([...visible].map(id=>[id,[]]));
 for(const p of allOffers){const id=String(p.baseId||p.id);if(groups.has(id))groups.get(id).push(p);}
 return [...groups].map(([id,offers])=>{
  offers.sort((a,b)=>a.price/a.pack-b.price/b.pack||String(a.supplier).localeCompare(String(b.supplier))||a.id-b.id);
  const buyable=offers.filter(p=>p.available>=p.pack&&!p.holdSales);
  return {id,product:offers[0],offers,minPrice:buyable.length?Math.min(...buyable.map(p=>p.price/p.pack)):null,suppliers:new Set(offers.map(p=>p.supplierId)).size};
 }).filter(row=>row.product);
}
