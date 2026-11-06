'use client';
import {useState} from 'react';
import {nationalPhoneInput,phoneInputValue} from '../../lib/maxiflora/phone-input.mjs';
type Props={id:string;name?:string;value?:string;defaultValue?:string;onValueChange?:(value:string)=>void;required?:boolean;disabled?:boolean;readOnly?:boolean};
export default function KazakhstanPhone({id,name='phone',value,defaultValue='',onValueChange,required=false,disabled=false,readOnly=false}:Props){
 const [local,setLocal]=useState(()=>phoneInputValue(defaultValue)),full=value===undefined?local:value,national=full.startsWith('+7')?full.slice(2):nationalPhoneInput(full);
 function change(raw:string){const next=phoneInputValue(raw);if(value===undefined)setLocal(next);onValueChange?.(next)}
 return <div className={'kz-phone-control'+(disabled?' is-disabled':'')}><span aria-hidden="true">+7</span><input id={id} type="tel" inputMode="tel" autoComplete="tel-national" value={national} onChange={e=>change(e.target.value)} onPaste={e=>{const text=e.clipboardData.getData('text');if(/^\s*\+7/.test(text)||/^[78]\d{10}$/.test(text.replace(/\D/g,''))){e.preventDefault();change(text)}}} placeholder="7XX XXX XX XX" pattern="7[0-9]{9}" minLength={10} maxLength={24} required={required} disabled={disabled} readOnly={readOnly} aria-label={undefined}/><input type="hidden" name={name} value={national?'+7'+national:''} disabled={disabled}/></div>;
}
