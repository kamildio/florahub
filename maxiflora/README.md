# MaXiFlora

Текущая платформа maxiflora.kz: Next.js + Node.js + MariaDB, развёртывание на Plesk.

Существующие frontend/ и backend/ в корне репозитория — отдельная более ранняя версия FloraHub. Этот каталог содержит текущую реализацию MaXiFlora.

Установка: npm ci. Проверка: npm test; npm run test:acceptance. Сборка Plesk: npm run build:node.

Пароли, токены, рабочая база и резервные копии в репозиторий не включены. Ручная сверка Kaspi подготовлена; приём оплаты включается только после настройки приватных параметров бота на сервере.


### Production update, 11 November 2026
Email registration, login and password recovery are active with EMAIL_AUTH_ENABLED=true in Plesk. SMTP delivery and owner login were verified on the live site. Existing users retain phone/password access to confirm their email. Telegram login and phone-code endpoints are disabled in email mode. The payments notification bot is independent.

Codes expire in ten minutes and are single-use, browser-bound and purpose-bound. Login/recovery codes are bound to the verified account. Stored codes are HMAC digests with five verification attempts, a sixty-second resend delay and five sends per address per hour. EMAIL_AUTH_ENABLED=pilot allows delivery checks before cutover. Secrets and server settings are excluded from Git.

The top service notice is now displayed only in testMode. Validation passed 260 unit tests, 20 API suites and the separate email-auth-api test. The database backup from 9 November was restored into isolated MariaDB and integrity checked. UptimeRobot monitors the public website every five minutes; test email delivery was confirmed by the owner.


### Company review and profile workflow, 11 November 2026
Registration accepts IP and TOO company types only. Buyers submit company identity for manual operator approval before creating orders. Approved suppliers use their reviewed company identity for purchases. Legal identity changes invalidate company approval. Company reviewers use the existing protected supplier-admin endpoint with owner MFA, version checks, required decision reasons and an audit trail. The admin UI includes buyers, suppliers and review-status filters.

Profiles have separate Save Draft and Save and Submit buttons. Submission validates legal identity (plus warehouse and valid Kazakhstan IBAN for suppliers), and saves/submits atomically. Draft saving does not grant publication or purchasing permission.

Account deletion starts a private support request with confirmation, an on-site ticket and a fixed-recipient administrator email. It never automatically deletes account/order records. Email delivery is leased, retried through maintenance and bounded to five attempts. Verification used synthetic accounts and mocked mail delivery, including repeat-safe requests and company approval before checkout. Passed 263 unit tests, 18 HTTP suites and email-auth-api. Video UI fixes were checked at actual 320/390/1280 viewport widths.
