import nodemailer from 'nodemailer';
export function smtpConfigured(settings){return settings.SMTP_HOST==='pkz20.hoster.kz'&&['465','587'].includes(String(settings.SMTP_PORT||''))&&settings.SMTP_USER==='noreply@maxiflora.kz'&&settings.SMTP_FROM==='noreply@maxiflora.kz'&&typeof settings.SMTP_PASSWORD==='string'&&settings.SMTP_PASSWORD.length>0;}
export function smtpOptions(settings){
 if(!smtpConfigured(settings))throw new Error('SMTP_NOT_CONFIGURED');
 const secure=String(settings.SMTP_PORT)==='465';
 return {host:settings.SMTP_HOST,port:Number(settings.SMTP_PORT),secure,requireTLS:!secure,auth:{user:settings.SMTP_USER,pass:settings.SMTP_PASSWORD},tls:{rejectUnauthorized:true,servername:settings.SMTP_HOST,minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true};
}
export async function sendVerificationEmail(settings,{to,code,purpose},createTransport=nodemailer.createTransport){
 if(typeof to!=='string'||to.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)||typeof code!=='string'||!/^\d{6}$/.test(code))throw new Error('EMAIL_MESSAGE_INVALID');
 const title=purpose==='login'?'Код входа в MaXiFlora':purpose==='reset-password'?'Код восстановления доступа к MaXiFlora':'Код подтверждения email MaXiFlora';
 const transport=createTransport(smtpOptions(settings));
 try{
  const result=await transport.sendMail({from:{name:'MaXiFlora',address:settings.SMTP_FROM},to:{address:to,name:''},subject:title,text:`${title}: ${code}\n\nКод действует 10 минут. Введите его только на https://www.maxiflora.kz/ . Не сообщайте код другим людям.\nЕсли вы не запрашивали подтверждение, проигнорируйте письмо.`,disableFileAccess:true,disableUrlAccess:true});
  if(!result.accepted?.some(x=>String(x).toLowerCase()===to.toLowerCase())||result.rejected?.length)throw new Error('EMAIL_NOT_ACCEPTED');
  return {accepted:true};
 }finally{transport.close()}
}

export async function sendDeletionNotice(settings,{number},createTransport=nodemailer.createTransport){
 if(!Number.isSafeInteger(number)||number<1)throw new Error('INVALID_NOTICE');
 const transport=createTransport(smtpOptions(settings)),to='maxiflora2@gmail.com';
 try{
  const result=await transport.sendMail({from:{name:'MaXiFlora',address:settings.SMTP_FROM},to,subject:'MaXiFlora · Запрос на удаление аккаунта № '+number,text:'Зарегистрирован запрос на удаление аккаунта № '+number+'. Откройте обращение в кабинете администратора: https://www.maxiflora.kz/#admin',disableFileAccess:true,disableUrlAccess:true});
  if(!result.accepted?.some(x=>String(x).toLowerCase()===to)||result.rejected?.length)throw new Error('EMAIL_NOT_ACCEPTED');
  return {accepted:true};
 }finally{transport.close()}
}

export async function sendOrderNotice(settings,{id,to,orderId,title},createTransport=nodemailer.createTransport){
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)||typeof to!=='string'||to.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)||!Number.isSafeInteger(orderId)||orderId<1||!['Поступил новый заказ','Предзаказ принят поставщиком','Заказ готов к выдаче','Заказ отменён','Заказ не подтверждён в срок','Истёк срок получения заказа','Покупатель запросил отмену заказа','Нужно ответить на изменение заказа'].includes(title))throw new Error('ORDER_NOTICE_INVALID');
 const transport=createTransport({...smtpOptions(settings),connectionTimeout:3000,greetingTimeout:3000,socketTimeout:5000});let timer;
 try{const result=await Promise.race([transport.sendMail({from:{name:'MaXiFlora',address:settings.SMTP_FROM},to:{address:to,name:''},messageId:'<order-'+id+'@maxiflora.kz>',subject:'MaXiFlora · '+title+' № '+orderId,text:title+' № '+orderId+'.\n\nАктуальные условия и действия доступны в кабинете: https://www.maxiflora.kz/#orders\nОткройте заказ № '+orderId+'. Время в кабинете указано по Астане.\n\nЭто служебное сообщение по вашему заказу. Пароли, коды входа и банковские реквизиты в ответ не отправляйте.',disableFileAccess:true,disableUrlAccess:true}),new Promise((_,reject)=>{timer=setTimeout(()=>{transport.close();reject(new Error('ORDER_NOTICE_TIMEOUT'))},8000)})]);if(!result.accepted?.some(x=>String(x).toLowerCase()===to.toLowerCase())||result.rejected?.length)throw new Error('EMAIL_NOT_ACCEPTED');return {accepted:true}}finally{clearTimeout(timer);transport.close()}
}
