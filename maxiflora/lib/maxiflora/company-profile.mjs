import {DomainError} from './engine.mjs';
export const companyTypes=['IP','TOO'];
export {defaultCities as profileCities} from './cities.mjs';
import {activeCities} from './cities.mjs';
export const normalizedEmail=value=>typeof value==='string'?value.trim().toLowerCase():'';
export const validEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function ibanValid(value){
 const iban=String(value||'').replace(/\s/g,'').toUpperCase();if(!/^KZ\d{2}[A-Z0-9]{16}$/.test(iban))return false;
 const digits=(iban.slice(4)+iban.slice(0,4)).replace(/[A-Z]/g,c=>String(c.charCodeAt(0)-55));let mod=0;for(const c of digits)mod=(mod*10+Number(c))%97;return mod===1;
}
export function supplierIssues(p,s){const issues=[];
 if(!companyTypes.includes(p.companyType))issues.push('Выберите ИП или ТОО.');
 if(typeof p.name!=='string'||p.name.trim().length<2)issues.push('Укажите название ИП или ТОО.');
 if(typeof p.contact!=='string'||p.contact.trim().length<2)issues.push('Укажите ФИО ответственного лица.');
 if(!activeCities(s).includes(p.city))issues.push('Выберите город профиля.');
 if(!validEmail(normalizedEmail(p.email)))issues.push('Укажите корректный email.');
 if(!/^\d{12}$/.test(p.bin||''))issues.push('ИИН или БИН должен содержать 12 цифр.');
 if(typeof p.legalAddress!=='string'||p.legalAddress.trim().length<5)issues.push('Укажите юридический адрес.');
 if(typeof p.address!=='string'||p.address.trim().length<5)issues.push('Укажите адрес склада в городе профиля.');
 if(!ibanValid(p.bank))issues.push('Укажите корректный ИИК Казахстана, начинающийся с KZ.');
 return issues;
}
export function submitSupplier(p,version,now=Date.now(),s){
 if(!p?.supplier)throw new DomainError('Сначала откройте кабинет поставщика.',403);
 if(!Number.isSafeInteger(version)||version!==(p.profileVersion||0))throw new DomainError('Профиль изменился. Обновите данные.',409);
 if(p.supplierStatus==='pending')throw new DomainError('Профиль уже находится на проверке.',409);
 const issues=supplierIssues(p,s);if(issues.length)throw new DomainError(issues.join(' '),422);
 if(p.approved)throw new DomainError('Профиль уже одобрен.',409);
 p.supplierStatus='pending';p.submittedAt=now;p.profileVersion=(p.profileVersion||0)+1;p.supplierReview=null;
 p.profileHistory??=[];p.profileHistory.push({event:'submitted',time:now,version:p.profileVersion});return {submitted:true,version:p.profileVersion};
}
