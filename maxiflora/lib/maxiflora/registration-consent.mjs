// Presentation version only: underlying purposes and existing legal consent versions are preserved.
export const REGISTRATION_CHECKBOX_VERSION='registration-checkbox-v1';
export function registrationConsentChoice(details,channel,accepted){
 return {...details,agreement:accepted,privacy:accepted,telegramConsent:accepted&&channel==='telegram',whatsappConsent:accepted&&channel==='whatsapp',marketing:false,consentPresentation:REGISTRATION_CHECKBOX_VERSION};
}
export const registrationConsentChecked=(details,channel)=>details.agreement===true&&details.privacy===true&&details[channel+'Consent']===true;
