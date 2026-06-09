<?php
namespace FloraHub\Controllers;

use FloraHub\Auth;
use FloraHub\Database;
use FloraHub\Response;
use FloraHub\Serializer;

final class AdminController
{
    /** GET /api/admin/stats */
    public function stats(): void
    {
        Auth::requireRole('admin');
        Response::json([
            'orders' => (int) (Database::first('SELECT COUNT(*) n FROM orders')['n'] ?? 0),
            'revenue' => (int) (Database::first("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status='completed'")['s'] ?? 0),
            'activeSellers' => (int) (Database::first('SELECT COUNT(*) n FROM sellers WHERE is_active = 1')['n'] ?? 0),
            'activeCities' => (int) (Database::first('SELECT COUNT(*) n FROM cities WHERE is_active = 1')['n'] ?? 0),
        ]);
    }

    /* ---------- Products ---------- */

    /** POST /api/admin/products */
    public function createProduct(): void
    {
        Auth::requireRole('admin');
        $b = Response::body();
        $id = 'p-' . bin2hex(random_bytes(6));
        Database::run(
            'INSERT INTO products
             (id, slug, name_kk, name_ru, name_en, description_ru, price, old_price, image, category_id, seller_id, tags, in_stock)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [
                $id,
                $b['slug'] ?? $id,
                $b['name']['kk'] ?? '', $b['name']['ru'] ?? '', $b['name']['en'] ?? '',
                $b['description']['ru'] ?? '',
                (int) ($b['price'] ?? 0),
                isset($b['oldPrice']) ? (int) $b['oldPrice'] : null,
                $b['image'] ?? '',
                $b['categoryId'] ?? null,
                $b['sellerId'] ?? null,
                json_encode($b['tags'] ?? [], JSON_UNESCAPED_UNICODE),
                !empty($b['inStock']) ? 1 : 0,
            ]
        );
        foreach (($b['cityIds'] ?? []) as $cid) {
            Database::run('INSERT IGNORE INTO product_cities (product_id, city_id) VALUES (?, ?)', [$id, $cid]);
        }
        $row = Database::first('SELECT * FROM products WHERE id = ?', [$id]);
        Response::json(Serializer::product($row, $b['cityIds'] ?? []), 201);
    }

    /** PUT /api/admin/products/{id} */
    public function updateProduct(array $args): void
    {
        Auth::requireRole('admin');
        $b = Response::body();
        $exists = Database::first('SELECT id FROM products WHERE id = ?', [$args['id']]);
        if ($exists === null) {
            Response::error('NOT_FOUND', 404);
        }
        Database::run(
            'UPDATE products SET name_ru = COALESCE(?, name_ru), price = COALESCE(?, price),
             category_id = COALESCE(?, category_id), in_stock = COALESCE(?, in_stock), image = COALESCE(?, image)
             WHERE id = ?',
            [
                $b['name']['ru'] ?? null,
                isset($b['price']) ? (int) $b['price'] : null,
                $b['categoryId'] ?? null,
                isset($b['inStock']) ? (int) (bool) $b['inStock'] : null,
                $b['image'] ?? null,
                $args['id'],
            ]
        );
        $row = Database::first('SELECT * FROM products WHERE id = ?', [$args['id']]);
        Response::json(Serializer::product($row, array_column(
            Database::all('SELECT city_id FROM product_cities WHERE product_id = ?', [$args['id']]),
            'city_id'
        )));
    }

    /** DELETE /api/admin/products/{id} */
    public function deleteProduct(array $args): void
    {
        Auth::requireRole('admin');
        Database::run('DELETE FROM products WHERE id = ?', [$args['id']]);
        Response::json(['deleted' => true]);
    }

    /* ---------- Cities ---------- */

    /** POST /api/admin/cities */
    public function createCity(): void
    {
        Auth::requireRole('admin');
        $b = Response::body();
        $id = 'c-' . bin2hex(random_bytes(4));
        Database::run(
            'INSERT INTO cities (id, slug, name_kk, name_ru, name_en, is_active) VALUES (?,?,?,?,?,?)',
            [$id, $b['slug'] ?? $id, $b['name']['kk'] ?? '', $b['name']['ru'] ?? '', $b['name']['en'] ?? '', !empty($b['active']) ? 1 : 1]
        );
        Response::json(Serializer::city(Database::first('SELECT * FROM cities WHERE id = ?', [$id])), 201);
    }

    /** PUT /api/admin/cities/{id} — toggle active / set primary / rename. */
    public function updateCity(array $args): void
    {
        Auth::requireRole('admin');
        $b = Response::body();
        if (array_key_exists('active', $b)) {
            Database::run('UPDATE cities SET is_active = ? WHERE id = ?', [(int) (bool) $b['active'], $args['id']]);
        }
        if (!empty($b['primary'])) {
            Database::run('UPDATE cities SET is_primary = 0');
            Database::run('UPDATE cities SET is_primary = 1, is_active = 1 WHERE id = ?', [$args['id']]);
        }
        $row = Database::first('SELECT * FROM cities WHERE id = ?', [$args['id']]);
        if ($row === null) {
            Response::error('NOT_FOUND', 404);
        }
        Response::json(Serializer::city($row));
    }

    /** DELETE /api/admin/cities/{id} */
    public function deleteCity(array $args): void
    {
        Auth::requireRole('admin');
        Database::run('DELETE FROM cities WHERE id = ? AND is_primary = 0', [$args['id']]);
        Response::json(['deleted' => true]);
    }
}
