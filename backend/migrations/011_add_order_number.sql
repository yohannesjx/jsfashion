-- Add order_number column for short, human-readable IDs
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10001;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_number INT DEFAULT nextval('order_number_seq');

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
