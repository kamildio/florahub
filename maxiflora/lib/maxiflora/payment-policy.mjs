// Owner-supplied business payment link. Receiving a link does not enable billing.
// Enable only after invoices, reconciliation, operator access and launch terms are ready.
export const paymentPolicy=Object.freeze({
 provider:'kaspi-pay',
 url:'https://pay.kaspi.kz/pay/03wnshty',
 recipient:'ИП CRAFTSMAN',
 currency:'KZT',
 purpose:'platform-tariffs',
 reconciliation:'manual',
 enabled:false,
});
