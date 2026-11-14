# Repeat orders, service email and messages

Repeat previews read current published offers without reserving stock. Quantity, pack and minimum rules are checked before replacing the cart; checkout remains explicit.

Order events enqueue verified-email notices in the transactional workspace. Maintenance claims leased jobs, sends outside the transaction, retries up to eight times, and suppresses obsolete events. Existing orders are baselined without historical mailing. SMTP failures never roll back checkout. Monitoring exposes counts and generic failures without addresses. Delivery is at least once with stable Message-ID.

Inbox drafts are session-scoped by account and peer/context. Sending guards rapid duplicate clicks, clears only the sent draft, and remains successful if subsequent screen refresh fails. Read observers initialize for asynchronously loaded conversations.

Validation: 291 unit tests, 21 HTTP acceptance suites, production build. Isolated browser buyer/supplier exchange, unread counts, read receipts, contextual replies and draft restoration verified. Repeat preview price/pack changes, invalid quantity and explicit cart replacement verified. SMTP transport tested with mocks; no production order or client email created for testing.
