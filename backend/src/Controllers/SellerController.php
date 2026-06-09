<?php
namespace FloraHub\Controllers;

use FloraHub\Auth;
use FloraHub\Database;
use FloraHub\Response;
use FloraHub\Serializer;

final class SellerController
{
    private const FLOW = ['pending', 'accepted', 'assembling', 'delivering', 'completed'];

    /** GET /api/seller/orders?status= (seller/admin) */
    public function orders(): void
    {
        $user = Auth::requireRole('seller', 'admin');
        $params = [];
        $where = '1=1';
        if ($user['role'] === 'seller' && $user['seller_id']) {
            $where = 'seller_id = ?';
            $params[] = $user['seller_id'];
        }
        if (!empty($_GET['status'])) {
            $where .= ' AND status = ?';
            $params[] = $_GET['status'];
        }
        $rows = Database::all("SELECT id FROM orders WHERE $where ORDER BY created_at DESC", $params);
        Response::json(array_map(fn ($r) => $this->load($r['id']), $rows));
    }

    /** POST /api/seller/orders/{id}/status { status, note } (seller/admin) */
    public function updateStatus(array $args): void
    {
        $user = Auth::requireRole('seller', 'admin');
        $status = Response::body()['status'] ?? '';
        if (!in_array($status, self::FLOW, true) && $status !== 'cancelled') {
            Response::error('INVALID_STATUS', 422);
        }

        $order = Database::first('SELECT * FROM orders WHERE id = ?', [$args['id']]);
        if ($order === null) {
            Response::error('NOT_FOUND', 404);
        }
        if ($user['role'] === 'seller' && $order['seller_id'] !== $user['seller_id']) {
            Response::error('FORBIDDEN', 403);
        }

        Database::run('UPDATE orders SET status = ? WHERE id = ?', [$status, $args['id']]);
        Database::run(
            'INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)',
            [$args['id'], $status, Response::body()['note'] ?? null]
        );

        Response::json($this->load($args['id']));
    }

    /** GET /api/seller/sales (seller/admin) — completed orders. */
    public function sales(): void
    {
        $user = Auth::requireRole('seller', 'admin');
        $params = [];
        $where = "status = 'completed'";
        if ($user['role'] === 'seller' && $user['seller_id']) {
            $where .= ' AND seller_id = ?';
            $params[] = $user['seller_id'];
        }
        $rows = Database::all("SELECT id FROM orders WHERE $where ORDER BY created_at DESC", $params);
        Response::json(array_map(fn ($r) => $this->load($r['id']), $rows));
    }

    private function load(string $id): array
    {
        $order = Database::first('SELECT * FROM orders WHERE id = ?', [$id]);
        $items = Database::all('SELECT * FROM order_items WHERE order_id = ?', [$id]);
        $events = Database::all('SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at', [$id]);
        return Serializer::order($order, $items, $events);
    }
}
