-- FloraHub seed data (mirrors the front-end demo catalog).
-- Run after schema.sql: mysql -u root -p florahub < database/seed.sql

SET NAMES utf8mb4;

INSERT INTO cities (id, slug, name_kk, name_ru, name_en, is_active, is_primary) VALUES
  ('c1','shymkent','Шымкент','Шымкент','Shymkent',1,1),
  ('c2','almaty','Алматы','Алматы','Almaty',1,0),
  ('c3','astana','Астана','Астана','Astana',1,0),
  ('c4','taraz','Тараз','Тараз','Taraz',0,0)
ON DUPLICATE KEY UPDATE name_ru = VALUES(name_ru);

INSERT INTO categories (id, slug, name_kk, name_ru, name_en, icon, sort) VALUES
  ('cat1','bouquets','Гүл шоқтары','Букеты','Bouquets','Flower2',1),
  ('cat2','roses','Раушан гүлдері','Розы','Roses','Flower',2),
  ('cat3','boxes','Қораптағы гүлдер','Цветы в коробке','Flowers in a box','Package',3),
  ('cat4','wedding','Той','Свадебные','Wedding','Heart',4),
  ('cat5','birthday','Туған күн','День рождения','Birthday','Gift',5),
  ('cat6','plants','Бөлме өсімдіктері','Растения','Plants','Sprout',6)
ON DUPLICATE KEY UPDATE name_ru = VALUES(name_ru);

INSERT INTO sellers (id, name, phone, city_id, rating, reviews, since_year, verified) VALUES
  ('s1','Studio Bloom','+77011112233','c1',4.9,482,2021,1),
  ('s2','Pion & Co','+77012223344','c1',4.8,311,2022,1),
  ('s3','Roza House','+77013334455','c2',4.7,198,2020,1),
  ('s4','Green Garden','+77014445566','c1',4.6,142,2023,0)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO products (id, slug, name_kk, name_ru, name_en, description_ru, price, old_price, image, category_id, seller_id, rating, reviews, tags, in_stock) VALUES
  ('p1','spring-tenderness','Көктем нәзіктігі','Весенняя нежность','Spring Tenderness','Нежный букет из пионовидных роз и сезонных весенних цветов.',18900,22000,'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80','cat1','s1',4.9,124,'["bestseller","sale"]',1),
  ('p2','red-passion-51','Қызыл құмарлық','Красная страсть, 51 роза','Red Passion','Классический букет из 51 эквадорской красной розы.',32500,NULL,'https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=900&q=80','cat2','s2',4.8,89,'["premium"]',1),
  ('p3','peony-cloud','Пион бұлты','Пионовое облако','Peony Cloud','Сезонные бело-розовые пионы для праздника.',24900,NULL,'https://images.unsplash.com/photo-1457089328109-e5d9bd499191?auto=format&fit=crop&w=900&q=80','cat1','s1',5.0,67,'["new","bestseller"]',1),
  ('p4','sunny-box','Күн қорабы','Солнечная коробка','Sunny Box','Шляпная коробка с подсолнухами и кустовыми розами.',16500,NULL,'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=900&q=80','cat3','s3',4.7,53,'["new"]',1),
  ('p5','white-wedding','Ақ той','Белая свадьба','White Wedding','Свадебный букет невесты из белых роз и фрезии.',28900,NULL,'https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?auto=format&fit=crop&w=900&q=80','cat4','s2',4.9,41,'["premium"]',1),
  ('p6','birthday-confetti','Туған күн конфетти','Праздничное конфетти','Birthday Confetti','Яркий микс из гербер, роз и альстромерий.',14900,NULL,'https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=900&q=80','cat5','s4',4.6,38,'["bestseller"]',1)
ON DUPLICATE KEY UPDATE name_ru = VALUES(name_ru), price = VALUES(price);

INSERT INTO product_cities (product_id, city_id) VALUES
  ('p1','c1'),('p1','c2'),('p2','c1'),('p3','c1'),('p3','c3'),
  ('p4','c1'),('p4','c2'),('p5','c1'),('p6','c1'),('p6','c2'),('p6','c3')
ON DUPLICATE KEY UPDATE city_id = VALUES(city_id);

-- Demo admin & seller accounts (login by phone via SMS code).
INSERT INTO users (id, phone, name, role, city_id, seller_id) VALUES
  ('u-admin','+77000000001','Администратор','admin','c1',NULL),
  ('u-seller','+77000000002','Studio Bloom','seller','c1','s1')
ON DUPLICATE KEY UPDATE role = VALUES(role);
