import {DomainError} from './engine.mjs';
export const minimumOrder=p=>p.minOrderQty??p.pack;
export function validateMinimum(value,pack){
 const minimum=value===undefined?pack:value;
 if(!Number.isSafeInteger(minimum)||minimum<pack||minimum>1000000000||minimum%pack!==0)throw new DomainError('Минимальный заказ — целое число упаковок, не меньше одной упаковки.');
 return minimum;
}
