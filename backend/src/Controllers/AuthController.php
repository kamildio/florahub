<?php
namespace FloraHub\Controllers;

use FloraHub\Auth;
use FloraHub\Database;
use FloraHub\Response;
use FloraHub\Sms;

final class AuthController
{
    public function __construct(private array $config) {}

    /** POST /api/auth/request-code { phone } */
    public function requestCode(): void
    {
        $phone = self::normalizePhone(Response::body()['phone'] ?? '');
        if ($phone === null) {
            Response::error('INVALID_PHONE', 422, 'Provide a valid phone number');
        }

        $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        $ttl = (int) ($this->config['sms']['code_ttl'] ?? 300);

        Database::run(
            'INSERT INTO sms_codes (phone, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))',
            [$phone, $code, $ttl]
        );

        Sms::send($this->config['sms'], $phone, "FloraHub: код подтверждения {$code}");

        Response::json(['sent' => true]);
    }

    /** POST /api/auth/verify { phone, code } */
    public function verify(): void
    {
        $body = Response::body();
        $phone = self::normalizePhone($body['phone'] ?? '');
        $code = trim((string) ($body['code'] ?? ''));
        if ($phone === null || !preg_match('/^\d{4}$/', $code)) {
            Response::error('INVALID_INPUT', 422);
        }

        $row = Database::first(
            'SELECT * FROM sms_codes WHERE phone = ? AND consumed = 0 ORDER BY id DESC LIMIT 1',
            [$phone]
        );

        if ($row === null || strtotime($row['expires_at']) < time() || $row['code'] !== $code) {
            Response::error('INVALID_CODE', 401, 'Wrong or expired code');
        }

        Database::run('UPDATE sms_codes SET consumed = 1 WHERE id = ?', [$row['id']]);

        // Find or create the user.
        $user = Database::first('SELECT * FROM users WHERE phone = ?', [$phone]);
        if ($user === null) {
            $id = 'u-' . bin2hex(random_bytes(6));
            Database::run(
                'INSERT INTO users (id, phone, role, city_id) VALUES (?, ?, ?, (SELECT id FROM cities WHERE is_primary = 1 LIMIT 1))',
                [$id, $phone, 'customer']
            );
            $user = Database::first('SELECT * FROM users WHERE id = ?', [$id]);
        }

        $token = bin2hex(random_bytes(32));
        $ttl = (int) ($this->config['token_ttl'] ?? 2592000);
        Database::run(
            'INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))',
            [$token, $user['id'], $ttl]
        );

        Response::json([
            'token' => $token,
            'user' => self::publicUser($user),
        ]);
    }

    /** GET /api/auth/me */
    public function me(): void
    {
        $user = Auth::require();
        Response::json(self::publicUser($user));
    }

    private static function publicUser(array $u): array
    {
        return [
            'id' => $u['id'],
            'phone' => $u['phone'],
            'name' => $u['name'],
            'role' => $u['role'],
            'city' => $u['city_id'],
            'createdAt' => $u['created_at'],
        ];
    }

    /** Normalize KZ numbers to +7XXXXXXXXXX, or null when invalid. */
    private static function normalizePhone(string $raw): ?string
    {
        $digits = preg_replace('/\D/', '', $raw);
        if (strlen($digits) === 11 && ($digits[0] === '8' || $digits[0] === '7')) {
            $digits = '7' . substr($digits, 1);
        }
        if (strlen($digits) === 10) {
            $digits = '7' . $digits;
        }
        return preg_match('/^7\d{10}$/', $digits) ? '+' . $digits : null;
    }
}
