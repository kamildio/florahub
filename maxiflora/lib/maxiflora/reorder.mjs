import {DomainError,snapshot} from './engine.mjs';
import {minimumOrder} from './order-minimum.mjs';
export function reorderPreview(s,u,id,now=Date.now()){
 if(!u)throw new DomainError('Войдите в аккаунт.',401);
 const order=(s.orders||[]).find(o=>o.id===id&&o.buyerId===u.id);if(!order)throw new DomainError('Заказ недоступен для повторения.',404);
 const available=new Map(snapshot(s,u,'buyer',now).products.map(p=>[p.id,p]));
 return {orderId:order.id,rows:order.items.map((old,index)=>{const p=available.get(old.pid);if(!p||p.supplierId===u.id)return {key:index,old:{name:old.name,qty:old.qty,price:old.price,pack:old.pack},current:null,changes:['Товар больше не доступен для заказа.']};
 const changes=[];if(p.price!==old.price)changes.push('Цена за упаковку изменилась.');if(p.pack!==old.pack)changes.push('Фасовка изменилась.');if(minimumOrder(p)!==(old.minOrderQty??old.pack))changes.push('Минимальный заказ изменился.');if(p.available<old.qty)changes.push('Доступного количества меньше, чем в прошлом заказе.');
 return {key:index,old:{name:old.name,qty:old.qty,price:old.price,pack:old.pack},current:{pid:p.id,name:p.name,supplier:p.supplier,city:p.city,address:p.address,qty:old.qty,price:p.price,pack:p.pack,minOrderQty:minimumOrder(p),available:p.available,transit:p.transit,arrival:p.arrival||null},changes};})};
}
// Pure validation also used by the UI: no reservation, no silent quantity adjustment.
export function reorderQuantityIssue(p,qty){if(!Number.isSafeInteger(qty)||qty<=0)return 'Укажите положительное целое количество.';if(qty%p.pack)return 'Количество должно быть кратно фасовке '+p.pack+'.';if(qty<p.minOrderQty)return 'Минимальный заказ — '+p.minOrderQty+' шт.';if(qty>p.available)return 'Доступно только '+p.available+' шт.';return null;}
