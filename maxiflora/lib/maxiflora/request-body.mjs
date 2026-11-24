import {DomainError} from './engine.mjs';
export async function boundedJSONText(request,limit=65536){
 const declared=request.headers.get('content-length');if(declared!==null&&Number(declared)>limit)throw new DomainError('Запрос слишком большой.',413);
 const reader=request.body?.getReader();if(!reader)return '';const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new DomainError('Запрос слишком большой.',413)}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{throw new DomainError('Неверная кодировка запроса.',400)}
}
