<?php
namespace FloraHub\Controllers;

use FloraHub\Auth;
use FloraHub\Database;
use FloraHub\Response;
use FloraHub\Serializer;

final class OrderController
{
    private const DELIVERY_FEE = 1500;
    private const FREE_THRESHOLD = 15000;

    /** POST /api/orders  (auth) */
    public function create(): void
    {
        $user = Auth::require();
        $body = Response::body();
        $items = $body['items'] ?? [];
        if (!is_array($items) || count($items) === 0) {
            Response::error('EMPTY_CART', 422);
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $subtotal = 0;
            $resolved = [];
            $sellerId = null;
            foreach ($items as $item) {
                $product = Database::first('SELECT * FROM products WHERE id = ?', [$item['productId'] ?? $item['product']['id'] ?? '']);
                if ($product === null) {
                    continue;
                }
                $qty = max(1, (int) ($item['quantity'] ?? 1));
                $subtotal += $product['price'] * $qty;
                $sellerId ??= $product['seller_id'];
                $resolved[] = ['product' => $product, 'qty' => $qty];
            }
            if (count($resolved) === 0) {
                throw new \RuntimeException('No valid items');
            }

            $delivery = ($subtotal >= self::FREE_THRESHOLD) ? 0 : self::DELIVERY_FEE;
            $total = $subtotal + $delivery;

            $id = 'o-' . bin2hex(random_bytes(8));
            $number = 'FH-' . str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
            $recipient = $body['recipient'] ?? [];

            Database::run(
                'INSERT INTO orders
                 (id, number, user_id, seller_id, city_id, status, total,
                  recipient_name, recipient_phone, recipient_address, comment, payment, delivery_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [
                    $id, $number, $user['id'], $sellerId, $body['cityId'] ?? $user['city_id'], 'pending', $total,
                    $recipient['name'] ?? '', $recipient['phone'] ?? '', $recipient['address'] ?? '',
                    $body['comment'] ?? null, $body['payment'] ?? 'online',
                    !empty($body['deliveryAt']) ? date('Y-m-d H:i:s', strtotime($body['deliveryAt'])) : null,
                ]
            );

            foreach ($resolved as $r) {
                Database::run(
                    'INSERT INTO order_items (order_id, product_id, name_ru, price, quantity) VALUES (?,?,?,?,?)',
                    [$id, $r['product']['id'], $r['product']['name_ru'], $r['product']['price'], $r['qty']]
                );
            }
            Database::run('INSERT INTO order_events (order_id, status) VALUES (?, ?)', [$id, 'pending']);

            $pdo->commit();
            Response::json($this->load($id), 201);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            Response::error('ORDER_FAILED', 500, $e->getMessage());
        }
    }

    /** GET /api/orders  (auth) — the current user's orders, newest first. */
    public function mine(): void
    {
        $user = Auth::require();
        $rows = Database::all('SELECT id FROM orders WHERE user_id = ? ORDER BY created_at DESC', [$user['id']]);
        Response::json(array_map(fn ($r) => $this->load($r['id']), $rows));
    }

    /** GET /api/orders/{id}  (auth) */
    public function show(array $args): void
    {
        $user = Auth::require();
        $order = Database::first('SELECT * FROM orders WHERE id = ?', [$args['id']]);
        if ($order === null) {
            Response::error('NOT_FOUND', 404);
        }
        // Customers may only see their own orders; staff can see all.
        if ($order['user_id'] !== $user['id'] && !in_array($user['role'], ['admin', 'seller'], true)) {
            Response::error('FORBIDDEN', 403);
        }
        Response::json($this->load($args['id']));
    }

    private function load(string $id): array
    {
        $order = Database::first('SELECT * FROM orders WHERE id = ?', [$id]);
        $items = Database::all('SELECT * FROM order_items WHERE order_id = ?', [$id]);
        $events = Database::all('SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at', [$id]);
        return Serializer::order($order, $items, $events);
    }
}
