<?php
namespace FloraHub;

/** Bearer-token authentication helpers. */
final class Auth
{
    /** Resolve the authenticated user from the Authorization header, or null. */
    public static function user(): ?array
    {
        $token = self::bearer();
        if ($token === null) {
            return null;
        }
        return Database::first(
            'SELECT u.* FROM auth_tokens t
             JOIN users u ON u.id = t.user_id
             WHERE t.token = ? AND t.expires_at > NOW()',
            [$token]
        );
    }

    /** Return the user or send 401 and stop. */
    public static function require(): array
    {
        $user = self::user();
        if ($user === null) {
            Response::error('UNAUTHORIZED', 401, 'Authentication required');
        }
        return $user;
    }

    /** Require the user to hold one of the given roles. */
    public static function requireRole(string ...$roles): array
    {
        $user = self::require();
        if (!in_array($user['role'], $roles, true)) {
            Response::error('FORBIDDEN', 403, 'Insufficient role');
        }
        return $user;
    }

    private static function bearer(): ?string
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m)) {
            return $m[1];
        }
        return null;
    }
}
