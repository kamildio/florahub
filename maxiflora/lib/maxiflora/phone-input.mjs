// National mobile digits; the UI renders the country prefix separately.
export function nationalPhoneInput(value){
 const text=String(value||''),digits=text.replace(/\D/g,'');
 if(/^\s*\+7/.test(text))return digits.slice(1);
 if(digits.length===11&&/^[78]/.test(digits))return digits.slice(1);
 if(digits.startsWith('8'))return digits.slice(1);
 return digits;
}
export function phoneInputValue(value){const national=nationalPhoneInput(value);return national?'+7'+national:'';}
export const completeMobilePhone=value=>/^\+77\d{9}$/.test(String(value||''));
