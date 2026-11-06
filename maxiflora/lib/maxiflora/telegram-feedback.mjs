export function telegramReturnNotice(status,lang='ru'){
 const kk=lang==='kk';
 const messages={
  unlinked:kk?'Бұл Telegram кабинетке байланыстырылмаған. Құпиясөзбен немесе Telegram кодымен кіріңіз, содан кейін кабинетте Telegram-ды байланыстырыңыз.':'Этот Telegram ещё не привязан к кабинету. Войдите по паролю или коду, затем привяжите Telegram в кабинете.',
  cancelled:kk?'Telegram арқылы кіру тоқтатылды. Қайта көріңіз немесе басқа тәсілді таңдаңыз.':'Вход через Telegram отменён. Повторите попытку или выберите другой способ.',
  retry:kk?'Telegram арқылы кіру аяқталмады. Telegram-дағы кіру сұрауын растаңыз да, сайтқа оралыңыз. Қажет болса, құпиясөзбен кіріңіз.':'Вход через Telegram не завершён. Подтвердите запрос на вход в самом Telegram и вернитесь на сайт. Можно также войти по паролю.'
 };return messages[status]||null;
}
export function gatewayFailureReason(value,status){
 if(['BALANCE_NOT_ENOUGH','BALANCE_TOO_LOW','INSUFFICIENT_BALANCE'].includes(value))return 'balance';
 if(value==='ACCESS_TOKEN_INVALID'||status===401)return 'configuration';
 if(value==='PHONE_NUMBER_INVALID')return 'phone';
 if(status===429||value==='RATE_LIMIT_EXCEEDED'||/^FLOOD_WAIT_\d+$/.test(String(value)))return 'throttled';
 return 'unavailable';
}
export function gatewayFailureMessage(reason){return ({
 balance:'Отправка кодов временно недоступна. Войдите по паролю или обратитесь в поддержку MaXiFlora.',
 configuration:'Сервис кодов временно недоступен. Используйте вход по паролю.',
 phone:'Telegram не принимает этот номер для доставки. Проверьте номер, связанный с Telegram, или войдите по паролю.',
 throttled:'Слишком много запросов к Telegram. Подождите и повторите либо войдите по паролю.',
 unavailable:'Не удалось отправить код в Telegram. Попробуйте позже или войдите по паролю.'
 })[reason]||gatewayFailureMessage('unavailable');}
export function recordGatewayDelivery(s,id,{ok,reason='unavailable'},now=Date.now()){
 const safe=['balance','configuration','phone','throttled','unavailable'].includes(reason)?reason:'unavailable';
 s.gatewayDeliveryHealth={ok:!!ok,reason:ok?null:safe,time:now};
 for(const receipt of Object.values(s.authSendReceipts||{}))if(receipt.result?.id===id){receipt.deliveryState=ok?'sent':'failed';receipt.failureReason=ok?null:safe;}
}
