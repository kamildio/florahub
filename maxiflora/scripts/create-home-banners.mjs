// Original MaXiFlora artwork. Raster exports match the v64 desktop/mobile sizes.
// Run with Node and a local sharp installation; this script is not part of builds.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const sharp=require(process.env.MAXIFLORA_SHARP_MODULE||'sharp');
const output=fileURLToPath(new URL('../public/banners/',import.meta.url));
await mkdir(output,{recursive:true});
const artwork=fileURLToPath(new URL('../assets/banner-source/',import.meta.url));
await mkdir(artwork,{recursive:true});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,content,size=38,color='#342d27',weight=400)=>`<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escape(content)}</text>`;
const rose=(x,y,scale,angle,color)=>`<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><path d="M0 0 Q-32 120 18 390" fill="none" stroke="#7d9271" stroke-width="5"/><path d="M0 156 Q-91 102 -63 65 Q-5 68 0 156M2 210 Q84 150 80 115 Q8 111 2 210M8 292 Q-55 251 -41 213 Q1 207 8 292" fill="#99aa8c"/>${Array.from({length:9},(_,i)=>`<ellipse cx="0" cy="-29" rx="42" ry="66" transform="rotate(${i*40})" fill="${color}" stroke="#ffffff45" stroke-width="1.4"/>`).join('')}<circle r="35" fill="${color}"/><path d="M-26 4 Q-19 -31 9 -20 Q41 0 8 27 Q-18 35 -26 4 M-12 3 Q-8 -11 4 -8 Q23 0 5 15" fill="none" stroke="#ffffff60" stroke-width="2"/></g>`;
const bouquet=()=>rose(80,95,1.2,-13,'#d5847d')+rose(235,42,1.15,9,'#ce6760')+rose(340,137,1.2,17,'#e5aa9c')+rose(205,190,1.1,-4,'#db8c7d')+rose(75,245,.9,-14,'#b95f58');
const calendar=()=>`<g transform="rotate(-9 180 150)"><rect x="0" y="0" width="370" height="345" rx="28" fill="#d8c9b5" opacity=".25" transform="translate(9 14)"/><rect width="370" height="345" rx="28" fill="#fffdfa"/><path d="M0 30Q0 0 30 0H340Q370 0 370 30V72H0Z" fill="#e64b3c"/><g fill="#f1ebe2">${Array.from({length:12},(_,i)=>`<rect x="${36+i%4*79}" y="${113+Math.floor(i/4)*69}" width="52" height="47" rx="10"/>`).join('')}</g><rect x="194" y="182" width="52" height="47" rx="10" fill="#dd7564"/><path d="M207 204l8 8 17-20" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M70 -15V21M300 -15V21" stroke="#ac4f40" stroke-width="12" stroke-linecap="round"/></g>`;
const content={
 ru:{suppliers:{label:'ДЛЯ ПОСТАВЩИКОВ',desktop:['Пусть о вас узнает','весь город'],mobile:['Пусть о вас','узнает весь','город'],sub:['Ваши цветы — в каталоге.','Ваш бизнес — на виду.']},max:{label:'БОЛЬШЕ ВОЗМОЖНОСТЕЙ С MAX',desktop:['Смотрите на','сезон вперёд'],mobile:['Смотрите на','сезон вперёд'],sub:['Предзаказы, календарь поставок','и больше возможностей для бизнеса.']}},
 kk:{suppliers:{label:'ЖЕТКІЗУШІЛЕР ҮШІН',desktop:['Сіз туралы','бүкіл қала білсін'],mobile:['Сіз туралы','бүкіл қала','білсін'],sub:['Гүлдеріңіз каталогта.','Бизнесіңіз көпшілікке көрінеді.']},max:{label:'MAX-ПЕН КӨБІРЕК МҮМКІНДІК',desktop:['Маусымды алдын ала','жоспарлаңыз'],mobile:['Маусымды','алдын ала','жоспарлаңыз'],sub:['Алдын ала тапсырыс, жеткізу күнтізбесі','және бизнесіңізге көбірек мүмкіндік.']}}
};
for(const [locale,types] of Object.entries(content))for(const [kind,c] of Object.entries(types))for(const mode of ['desktop','mobile']){
 const mobile=mode==='mobile',w=mobile?1080:1920,h=mobile?720:640;
 const x=mobile?64:100,headline=c[mode],titleSize=mobile?(locale==='kk'?68:74):83;
 const titleY=mobile?205:258,line=mobile?81:96;
 const subY=mobile?(headline.length===3?490:418):475;
 const subSize=mobile?(locale==='kk'&&kind==='max'?29:32):33;
 const art=kind==='suppliers'?`<g transform="translate(${mobile?850:1430} ${mobile?390:115}) scale(${mobile?.83:1.05})">${bouquet()}</g>`:`<g transform="translate(${mobile?785:1400} ${mobile?430:150}) scale(${mobile?.6:1.05})">${calendar()}${rose(390,255,.6,8,'#dc927f')}</g>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="${kind==='max'?'#f7f8f0':'#fff8f3'}"/><stop offset="1" stop-color="${kind==='max'?'#f1f3e5':'#f8e8dd'}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#paper)"/><ellipse cx="${mobile?1110:1790}" cy="${mobile?500:370}" rx="${mobile?360:470}" ry="${mobile?400:480}" fill="${kind==='max'?'#e5ead3':'#efd6c7'}" opacity=".65"/>${art}${text(x,mobile?72:91,'MaXiFlora'+(kind==='max'?' MAX':''),mobile?35:36,'#d93b2d',700)}${text(x,mobile?128:153,c.label,mobile?20:22,'#a68170',700)}${headline.map((v,i)=>text(x,titleY+i*line,v,titleSize,i===headline.length-1?'#df3a2b':'#302b25',700)).join('')}${c.sub.map((v,i)=>text(x,subY+i*(mobile?44:47),v,subSize,'#74675b')).join('')}<path d="M${x} ${mobile?633:565}h45" stroke="#d68d77" stroke-width="3"/>${text(x+61,mobile?640:572,mobile?'КАЗАҚСТАН · B2B':locale==='kk'?'ҚАЗАҚСТАН · ГҮЛДЕР БИЗНЕСТІ БІРІКТІРЕДІ':'КАЗАХСТАН · ЦВЕТЫ ОБЪЕДИНЯЮТ БИЗНЕС',mobile?19:20,'#b18a73',500)}</svg>`;
 await writeFile(path.join(artwork,`${kind}-${locale}-${mode}.svg`),svg);
 await sharp(Buffer.from(svg)).png({compressionLevel:9}).toFile(path.join(output,`${kind}-${locale}-${mode}.png`));
 console.log(`${kind}-${locale}-${mode}.png: ${w} × ${h}`);
}
