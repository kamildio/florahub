<?php
namespace FloraHub;

/** Maps DB rows to the JSON shapes the front-end expects. */
final class Serializer
{
    public static function city(array $r): array
    {
        return [
            'id' => $r['id'],
            'slug' => $r['slug'],
            'name' => ['kk' => $r['name_kk'], 'ru' => $r['name_ru'], 'en' => $r['name_en']],
            'active' => (bool) $r['is_active'],
            'primary' => (bool) $r['is_primary'],
        ];
    }

    public static function category(array $r): array
    {
        return [
            'id' => $r['id'],
            'slug' => $r['slug'],
            'name' => ['kk' => $r['name_kk'], 'ru' => $r['name_ru'], 'en' => $r['name_en']],
            'icon' => $r['icon'],
        ];
    }

    public static function product(array $r, array $cityIds = []): array
    {
        return [
            'id' => $r['id'],
            'slug' => $r['slug'],
            'name' => ['kk' => $r['name_kk'], 'ru' => $r['name_ru'], 'en' => $r['name_en']],
            'description' => [
                'kk' => $r['description_kk'] ?? '',
                'ru' => $r['description_ru'] ?? '',
                'en' => $r['description_en'] ?? '',
            ],
            'price' => (int) $r['price'],
            'oldPrice' => $r['old_price'] !== null ? (int) $r['old_price'] : null,
            'image' => $r['image'],
            'categoryId' => $r['category_id'],
            'sellerId' => $r['seller_id'],
            'cityIds' => $cityIds,
            'rating' => (float) $r['rating'],
            'reviews' => (int) $r['reviews'],
            'tags' => json_decode($r['tags'] ?? '[]', true) ?: [],
            'inStock' => (bool) $r['in_stock'],
        ];
    }

    public static function order(array $o, array $items, array $events): array
    {
        return [
            'id' => $o['id'],
            'number' => $o['number'],
            'createdAt' => $o['created_at'],
            'status' => $o['status'],
            'total' => (int) $o['total'],
            'cityId' => $o['city_id'],
            'sellerId' => $o['seller_id'],
            'deliveryAt' => $o['delivery_at'],
            'recipient' => [
                'name' => $o['recipient_name'],
                'phone' => $o['recipient_phone'],
                'address' => $o['recipient_address'],
            ],
            'items' => array_map(fn ($i) => [
                'product' => ['id' => $i['product_id'], 'name' => ['ru' => $i['name_ru']], 'price' => (int) $i['price']],
                'quantity' => (int) $i['quantity'],
            ], $items),
            'timeline' => array_map(fn ($e) => [
                'status' => $e['status'],
                'at' => $e['created_at'],
                'note' => $e['note'],
            ], $events),
        ];
    }
}
