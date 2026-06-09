-- FloraHub database schema (MySQL 8+)
-- Run: mysql -u root -p florahub < database/schema.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS cities (
  id         CHAR(36) PRIMARY KEY,
  slug       VARCHAR(64) NOT NULL UNIQUE,
  name_kk    VARCHAR(120) NOT NULL,
  name_ru    VARCHAR(120) NOT NULL,
  name_en    VARCHAR(120) NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id      CHAR(36) PRIMARY KEY,
  slug    VARCHAR(64) NOT NULL UNIQUE,
  name_kk VARCHAR(120) NOT NULL,
  name_ru VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  icon    VARCHAR(48) NOT NULL DEFAULT 'Flower2',
  sort    INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sellers (
  id         CHAR(36) PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  phone      VARCHAR(20),
  city_id    CHAR(36),
  rating     DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  reviews    INT NOT NULL DEFAULT 0,
  since_year INT,
  verified   TINYINT(1) NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_seller_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id            CHAR(36) PRIMARY KEY,
  slug          VARCHAR(160) NOT NULL UNIQUE,
  name_kk       VARCHAR(200) NOT NULL,
  name_ru       VARCHAR(200) NOT NULL,
  name_en       VARCHAR(200) NOT NULL,
  description_kk TEXT,
  description_ru TEXT,
  description_en TEXT,
  price         INT NOT NULL,            -- minor unit not used; tenge are integers
  old_price     INT,
  image         VARCHAR(500),
  category_id   CHAR(36),
  seller_id     CHAR(36),
  rating        DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  reviews       INT NOT NULL DEFAULT 0,
  tags          JSON,                    -- ["new","bestseller","sale","premium"]
  in_stock      TINYINT(1) NOT NULL DEFAULT 1,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_product_seller   FOREIGN KEY (seller_id)   REFERENCES sellers(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Which cities a product is available in (many-to-many).
CREATE TABLE IF NOT EXISTS product_cities (
  product_id CHAR(36) NOT NULL,
  city_id    CHAR(36) NOT NULL,
  PRIMARY KEY (product_id, city_id),
  CONSTRAINT fk_pc_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_city    FOREIGN KEY (city_id)    REFERENCES cities(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id         CHAR(36) PRIMARY KEY,
  phone      VARCHAR(20) NOT NULL UNIQUE,
  name       VARCHAR(160) NOT NULL DEFAULT '',
  role       ENUM('customer','seller','admin') NOT NULL DEFAULT 'customer',
  city_id    CHAR(36),
  seller_id  CHAR(36),                 -- set when role = seller
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_city   FOREIGN KEY (city_id)   REFERENCES cities(id)  ON DELETE SET NULL,
  CONSTRAINT fk_user_seller FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One-time SMS codes for phone-based auth.
CREATE TABLE IF NOT EXISTS sms_codes (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  phone      VARCHAR(20) NOT NULL,
  code       CHAR(4) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  consumed   TINYINT(1) NOT NULL DEFAULT 0,
  attempts   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sms_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bearer tokens issued on successful verification.
CREATE TABLE IF NOT EXISTS auth_tokens (
  token      CHAR(64) PRIMARY KEY,
  user_id    CHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id            CHAR(36) PRIMARY KEY,
  number        VARCHAR(20) NOT NULL UNIQUE,
  user_id       CHAR(36),
  seller_id     CHAR(36),
  city_id       CHAR(36),
  status        ENUM('pending','accepted','assembling','delivering','completed','cancelled') NOT NULL DEFAULT 'pending',
  total         INT NOT NULL,
  recipient_name    VARCHAR(160) NOT NULL,
  recipient_phone   VARCHAR(20) NOT NULL,
  recipient_address VARCHAR(400) NOT NULL,
  comment       VARCHAR(500),
  payment       ENUM('online','delivery') NOT NULL DEFAULT 'online',
  delivery_at   TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT fk_order_seller FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL,
  CONSTRAINT fk_order_city   FOREIGN KEY (city_id)   REFERENCES cities(id)  ON DELETE SET NULL,
  INDEX idx_order_user (user_id),
  INDEX idx_order_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id   CHAR(36) NOT NULL,
  product_id CHAR(36),
  name_ru    VARCHAR(200) NOT NULL,    -- snapshot of name & price at purchase time
  price      INT NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_item_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Status transition log powering the customer-facing tracking timeline.
CREATE TABLE IF NOT EXISTS order_events (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id  CHAR(36) NOT NULL,
  status    ENUM('pending','accepted','assembling','delivering','completed','cancelled') NOT NULL,
  note      VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_event_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
