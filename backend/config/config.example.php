<?php
// Copy this file to config/config.php and adjust for your environment.
return [
    'db' => [
        'driver'   => 'mysql',          // mysql | sqlite
        'host'     => '127.0.0.1',
        'port'     => 3306,
        'database' => 'florahub',
        'username' => 'root',
        'password' => '',
        'charset'  => 'utf8mb4',
        // For sqlite, set 'driver' => 'sqlite' and 'path' below:
        'path'     => __DIR__ . '/../database/florahub.sqlite',
    ],

    // Allowed origin for the SPA (set to your front-end URL in production).
    'cors_origin' => '*',

    // SMS provider. In 'log' mode codes are written to storage/sms.log instead
    // of being sent, which is convenient for development. Swap for a real
    // gateway (Mobizon, SMSC, Twilio…) in production.
    'sms' => [
        'mode'       => 'log',          // log | mobizon
        'api_key'    => '',
        'sender'     => 'FloraHub',
        'code_ttl'   => 300,            // seconds a code stays valid
    ],

    'token_ttl' => 60 * 60 * 24 * 30,   // auth token lifetime in seconds
];
