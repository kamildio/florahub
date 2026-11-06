import nodemailer from 'nodemailer';
export function smtpConfigured(settings){return settings.SMTP_HOST==='pkz20.hoster.kz'&&['465','587'].includes(String(settings.SMTP_PORT||''))&&settings.SMTP_USER==='noreply@maxiflora.kz'&&settings.SMTP_FROM==='noreply@maxiflora.kz'&&typeof settings.SMTP_PASSWORD==='string'&&settings.SMTP_PASSWORD.length>0;}
export function smtpOptions(settings){
 if(!smtpConfigured(settings))throw new Error('SMTP_NOT_CONFIGURED');
 const secure=String(settings.SMTP_PORT)==='465';
 return {host:settings.SMTP_HOST,port:Number(settings.SMTP_PORT),secure,requireTLS:!secure,auth:{user:settings.SMTP_USER,pass:settings.SMTP_PASSWORD},tls:{rejectUnauthorized:true,servername:settings.SMTP_HOST,minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true};
}
export async function sendVerificationEmail(settings,{to,code},createTransport=nodemailer.createTransport){
 if(typeof to!=='string'||to.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)||typeof code!=='string'||!/^\d{6}$/.test(code))throw new Error('EMAIL_MESSAGE_INVALID');
 const transport=createTransport(smtpOptions(settings));
 try{
  const result=await transport.sendMail({from:{name:'MaXiFlora',address:settings.SMTP_FROM},to,subject:'Код подтверждения email MaXiFlora',text:`Код подтверждения email MaXiFlora: ${code}\n\nКод действует 10 минут. Введите его только на https://www.maxiflora.kz/ . Не сообщайте код другим людям.\nЕсли вы не запрашивали подтверждение, проигнорируйте письмо.`,disableFileAccess:true,disableUrlAccess:true});
  if(!result.accepted?.some(x=>String(x).toLowerCase()===to.toLowerCase())||result.rejected?.length)throw new Error('EMAIL_NOT_ACCEPTED');
  return {accepted:true};
 }finally{transport.close()}
}
