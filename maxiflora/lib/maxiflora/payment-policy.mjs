// Owner-supplied business payment link. Receiving a link does not enable billing.
// Runtime admission is controlled by MANUAL_PAYMENTS_ENABLED in manual-payments.mjs.
export const paymentPolicy=Object.freeze({
 provider:'kaspi-pay',
 url:'https://pay.kaspi.kz/pay/03wnshty',
 recipient:'ИП CRAFTSMAN',
 currency:'KZT',
 purpose:'platform-tariffs',
 reconciliation:'manual',
});
