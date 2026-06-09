<?php
namespace FloraHub\Controllers;

use FloraHub\Database;
use FloraHub\Response;
use FloraHub\Serializer;

final class CatalogController
{
    /** GET /api/cities */
    public function cities(): void
    {
        $rows = Database::all('SELECT * FROM cities ORDER BY is_primary DESC, name_ru');
        Response::json(array_map([Serializer::class, 'city'], $rows));
    }

    /** GET /api/categories */
    public function categories(): void
    {
        $rows = Database::all('SELECT * FROM categories ORDER BY sort');
        Response::json(array_map([Serializer::class, 'category'], $rows));
    }

    /** GET /api/products?city=&category=&q=&sort= */
    public function products(): void
    {
        $where = ['p.is_active = 1'];
        $params = [];

        if (!empty($_GET['city'])) {
            $where[] = 'EXISTS (SELECT 1 FROM product_cities pc WHERE pc.product_id = p.id AND pc.city_id = ?)';
            $params[] = $_GET['city'];
        }
        if (!empty($_GET['category'])) {
            $where[] = 'c.slug = ?';
            $params[] = $_GET['category'];
        }
        if (!empty($_GET['q'])) {
            $where[] = '(p.name_ru LIKE ? OR p.name_kk LIKE ? OR p.name_en LIKE ?)';
            $like = '%' . $_GET['q'] . '%';
            array_push($params, $like, $like, $like);
        }

        $order = match ($_GET['sort'] ?? 'popular') {
            'priceAsc'  => 'p.price ASC',
            'priceDesc' => 'p.price DESC',
            'new'       => 'p.created_at DESC',
            default     => 'p.reviews DESC',
        };

        $sql = 'SELECT p.* FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE ' . implode(' AND ', $where) . ' ORDER BY ' . $order;

        $rows = Database::all($sql, $params);
        Response::json(array_map(fn ($r) => Serializer::product($r, self::cityIds($r['id'])), $rows));
    }

    /** GET /api/products/{slug} */
    public function product(array $args): void
    {
        $row = Database::first('SELECT * FROM products WHERE slug = ? AND is_active = 1', [$args['slug']]);
        if ($row === null) {
            Response::error('NOT_FOUND', 404);
        }
        Response::json(Serializer::product($row, self::cityIds($row['id'])));
    }

    private static function cityIds(string $productId): array
    {
        $rows = Database::all('SELECT city_id FROM product_cities WHERE product_id = ?', [$productId]);
        return array_column($rows, 'city_id');
    }
}
