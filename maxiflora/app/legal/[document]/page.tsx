import {PAYMENT_TERMS_VERSION,paymentTerms} from '../../../lib/maxiflora/payment-terms.mjs';
import {WHATSAPP_CONSENT_VERSION} from '../../../lib/maxiflora/whatsapp-cloud.mjs';
import {privacyTitle,privacySections,whatsappSections} from '../../../lib/maxiflora/privacy-policy.mjs';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {env} from '#platform-runtime';
import {tariffPlansFor,tariffRevision} from '../../../lib/maxiflora/launch-policy.mjs';
export const dynamic='force-dynamic';
const documents:Record<string,{title:string;sections:{title:string;text:string}[]}>= {
 payments:{title:'Оплата и возвраты MaXiFlora',sections:paymentTerms.ru},
 terms:{title:'Условия использования MaXiFlora',sections:[
 {title:'Оператор и назначение сервиса',text:'MaXiFlora — платформа для делового взаимодействия покупателей и поставщиков цветов. Оператор: ИП Craftsman. Адрес: Казахстан, Шымкент, ул. Чехова, 85. Телефон: +7 706 730 77 56.'},
 {title:'Аккаунт',text:'Покупателями и поставщиками могут быть только ИП и ТОО. Для регистрации необходимы форма компании, имя, контактный email, номер телефона, пароль и подтверждение контактных данных одноразовым кодом. При подтверждении по email код отправляется на указанный адрес. Оформление заказов доступно после подтверждения контакта, заполнения реквизитов и одобрения компании оператором. Один аккаунт используется для покупок и продаж. Пользователь указывает достоверные данные и сохраняет конфиденциальность пароля и кодов. Доступ к продажам предоставляется после заполнения и проверки профиля поставщика.'},
 {title:'Предложения и заказы',text:'Поставщик отвечает за актуальность описания, цены, остатка и условий выдачи. Предложения цветов в наличии публикуются на 3, 5 или 7 дней, по умолчанию на 7 дней, затем требуют подтверждения актуальности. Условия созданных заказов сохраняются отдельно от последующих изменений предложения.'},
 {title:'Оплата',text:'Стоимость цветов оплачивается поставщику напрямую. Платный доступ к платформе оформляется отдельно. Предварительный выбор тарифа не является оплатой. Оплата подписки через Kaspi проверяется администратором. Порядок проверки, сроки и обращения по возвратам опубликованы в разделе «Оплата и возвраты» (/legal/payments). Автосписаний и автопродления нет.'},
 {title:'Лимиты тарифов',text:'Start — 5 одновременно активных карточек; Business — 12; MAX — без ограничения количества карточек и три бесплатных размещения баннеров за месяц. Карточки можно снимать и публиковать другие в течение месяца в пределах своего лимита. Правила и срок размещения баннеров определяются условиями соответствующей услуги.'},
 {title:'Первый месяц',text:'Акционный доступ MAX предоставляется один раз новому аккаунту, зарегистрированному в период акции, указанный на странице тарифов. Бесплатный месяц начинается после одобрения профиля компании оператором. Для ранее выданного доступа сохраняется установленный срок. Смена роли или повторный вход не продлевают его.'},
 {title:'Обращения',text:'По вопросам аккаунта, ошибок и действий на платформе обращайтесь по телефону оператора. Email поддержки: maxiflora2@gmail.com.'},
 ]},
 privacy:{title:privacyTitle,sections:privacySections},
 whatsapp:{title:'Отдельное согласие на WhatsApp',sections:whatsappSections}
};
export default async function Legal({params}:{params:Promise<{document:string}>}){
 const {document}=await params;const item=documents[document];if(!item)notFound();
 let tariffState;
 if(document==='terms'&&env.DB){const row=await env.DB.prepare('SELECT state FROM workspaces WHERE id=?').bind('live').first<{state:string}>();if(row)tariffState=JSON.parse(row.state);}
 const plans=tariffPlansFor(tariffState),limitsText=plans.map((p:{id:string;limit:number|null})=>p.id+' — '+(p.limit===null?'без ограничения количества':p.limit+' одновременно активных')+' карточек').join('; ')+'. MAX включает три бесплатных размещения баннеров за месяц. Карточки можно снимать и публиковать другие в течение месяца в пределах своего лимита. Условия уже выданного доступа сохраняются до окончания его срока. Правила и срок размещения баннеров определяются условиями соответствующей услуги. Тарифная редакция: '+tariffRevision(tariffState)+'.';
 const draft=document==='whatsapp'?(env as typeof env&{WHATSAPP_CONSENT_APPROVED_VERSION?:string}).WHATSAPP_CONSENT_APPROVED_VERSION!==WHATSAPP_CONSENT_VERSION:(env as typeof env&{LEGAL_APPROVED_VERSION?:string}).LEGAL_APPROVED_VERSION!=='launch-v3';
 return <main style={{maxWidth:820,margin:'40px auto',padding:'0 24px 60px',background:'white'}}><Link href="/#home">← MaXiFlora</Link><h1>{item.title}</h1>{draft&&<p role="note" style={{padding:18,background:'#fff2e6',borderRadius:12}}>Проект для проверки оператором ИП Craftsman. До утверждения этой версии соответствующий способ подтверждения номера недоступен.</p>}<p>Версия: {document==='payments'?PAYMENT_TERMS_VERSION:document==='whatsapp'?WHATSAPP_CONSENT_VERSION:'launch-v3'} · {document==='payments'?'9':document==='whatsapp'?'4':'3'} ноября 2026</p>{item.sections.map(section=><section key={section.title} style={{marginTop:28}}><h2 style={{fontSize:22}}>{section.title}</h2><p>{section.title==='Лимиты тарифов'?limitsText:section.text}</p></section>)}<p style={{marginTop:36}}><Link href="/legal/terms">Условия использования</Link> · <Link href="/legal/privacy">Политика обработки данных</Link> · <Link href="/legal/payments">Оплата и возвраты</Link></p></main>;
}
