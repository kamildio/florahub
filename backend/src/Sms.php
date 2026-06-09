<?php
namespace FloraHub;

/** SMS dispatch. In 'log' mode codes are written to storage/sms.log. */
final class Sms
{
    public static function send(array $cfg, string $phone, string $text): void
    {
        if (($cfg['mode'] ?? 'log') === 'log') {
            $dir = __DIR__ . '/../storage';
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
            $line = sprintf("[%s] %s — %s\n", date('c'), $phone, $text);
            file_put_contents($dir . '/sms.log', $line, FILE_APPEND);
            return;
        }

        // Example: Mobizon (popular in KZ). Implement per your provider.
        // $url = 'https://api.mobizon.kz/service/message/sendSmsMessage?...';
        // file_get_contents($url); // POST with api_key, recipient, text
    }
}
