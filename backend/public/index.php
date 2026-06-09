<?php
declare(strict_types=1);

/**
 * FloraHub API — front controller.
 * Dev server: php -S localhost:8000 -t public
 */

use FloraHub\Controllers\AdminController;
use FloraHub\Controllers\AuthController;
use FloraHub\Controllers\CatalogController;
use FloraHub\Controllers\OrderController;
use FloraHub\Controllers\SellerController;
use FloraHub\Database;
use FloraHub\Response;
use FloraHub\Router;

// --- PSR-4-ish autoloader (no Composer required) ---
spl_autoload_register(function (string $class): void {
    $prefix = 'FloraHub\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    $file = __DIR__ . '/../src/' . $relative . '.php';
    if (is_file($file)) {
        require $file;
    }
});

// --- Config ---
$configFile = __DIR__ . '/../config/config.php';
$config = is_file($configFile) ? require $configFile : require __DIR__ . '/../config/config.example.php';

// --- CORS ---
$origin = $config['cors_origin'] ?? '*';
header("Access-Control-Allow-Origin: {$origin}");
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Vary: Origin');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- DB ---
try {
    Database::connect($config['db']);
} catch (\Throwable $e) {
    Response::error('DB_UNAVAILABLE', 503, $e->getMessage());
}

// --- Routes ---
$router = new Router();
$auth = new AuthController($config);
$catalog = new CatalogController();
$orders = new OrderController();
$seller = new SellerController();
$admin = new AdminController();

// Auth
$router->post('/api/auth/request-code', fn () => $auth->requestCode());
$router->post('/api/auth/verify', fn () => $auth->verify());
$router->get('/api/auth/me', fn () => $auth->me());

// Catalog (public)
$router->get('/api/cities', fn () => $catalog->cities());
$router->get('/api/categories', fn () => $catalog->categories());
$router->get('/api/products', fn () => $catalog->products());
$router->get('/api/products/{slug}', fn ($a) => $catalog->product($a));

// Orders (customer)
$router->post('/api/orders', fn () => $orders->create());
$router->get('/api/orders', fn () => $orders->mine());
$router->get('/api/orders/{id}', fn ($a) => $orders->show($a));

// Seller console
$router->get('/api/seller/orders', fn () => $seller->orders());
$router->post('/api/seller/orders/{id}/status', fn ($a) => $seller->updateStatus($a));
$router->get('/api/seller/sales', fn () => $seller->sales());

// Admin console
$router->get('/api/admin/stats', fn () => $admin->stats());
$router->post('/api/admin/products', fn () => $admin->createProduct());
$router->put('/api/admin/products/{id}', fn ($a) => $admin->updateProduct($a));
$router->delete('/api/admin/products/{id}', fn ($a) => $admin->deleteProduct($a));
$router->post('/api/admin/cities', fn () => $admin->createCity());
$router->put('/api/admin/cities/{id}', fn ($a) => $admin->updateCity($a));
$router->delete('/api/admin/cities/{id}', fn ($a) => $admin->deleteCity($a));

// Health check
$router->get('/api/health', fn () => Response::json(['ok' => true, 'service' => 'florahub-api']));

// --- Dispatch ---
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $path);
