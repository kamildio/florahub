import {recordRequest,requestMetrics} from './request-metrics.mjs';
import {telegramCurl} from './telegram-transport.mjs';
import {nodeDatabase} from './mysql-store.mjs';
import {smtpConfigured,sendVerificationEmail} from './smtp-mail.mjs';

// No demo or in-memory fallback on the production hosting.
export const env={
 DB:nodeDatabase(),RECORD_REQUEST:recordRequest,REQUEST_METRICS:requestMetrics,
 PAYMENTS_TELEGRAM_FETCH:telegramCurl,
 ...Object.fromEntries(['AUTH_CODE_SECRET','WHATSAPP_ENABLED','WHATSAPP_CONSENT_APPROVED_VERSION','WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_API_VERSION','WHATSAPP_AUTH_TEMPLATE','WHATSAPP_TEMPLATE_LANGUAGE'].map(key=>[key,process.env[key]])),
 ...Object.fromEntries(['MANUAL_PAYMENTS_ENABLED','PAYMENTS_BOT_TOKEN','PAYMENTS_CHAT_ID'].map(key=>[key,process.env[key]])),
 EMAIL_CONFIGURED:smtpConfigured(process.env),
 EMAIL_CODE_SECRET:process.env.EMAIL_CODE_SECRET||process.env.TELEGRAM_GATEWAY_TOKEN,
 SEND_VERIFICATION_EMAIL:message=>sendVerificationEmail(process.env,message),
 TELEGRAM_GATEWAY_TOKEN:process.env.TELEGRAM_GATEWAY_TOKEN,
 REGISTRATION_ENABLED:process.env.REGISTRATION_ENABLED,
 LEGAL_APPROVED_VERSION:process.env.LEGAL_APPROVED_VERSION,
 TELEGRAM_CLIENT_ID:process.env.TELEGRAM_CLIENT_ID,
 TELEGRAM_CLIENT_SECRET:process.env.TELEGRAM_CLIENT_SECRET,
 TEST_MODE:process.env.TEST_MODE==='true'?'true':'false',
 MAINTENANCE_SECRET:process.env.MAINTENANCE_SECRET,
 STAFF_OWNER_ACCOUNT_ID:process.env.STAFF_OWNER_ACCOUNT_ID,
 STAFF_MFA_ENCRYPTION_KEY:process.env.STAFF_MFA_ENCRYPTION_KEY,
};
// Uploads remain disabled until the production scanning pipeline is connected.
