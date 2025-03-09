-- Create database
CREATE DATABASE inventory;

-- Connect to the database
\c inventory

-- Create tables
CREATE TABLE IF NOT EXISTS products (
  ean_code text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  initial_quantity integer NOT NULL DEFAULT 0,
  image_url text,
  package_quantity integer NOT NULL DEFAULT 0,
  package_type text,
  purchase_price decimal(10,2) NOT NULL DEFAULT 0,
  sale_price decimal(10,2) NOT NULL DEFAULT 0,
  supplier text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  last_price_change timestamptz,
  last_supplier_change timestamptz,
  last_purchase_price_change timestamptz,
  previous_sale_price decimal(10,2),
  previous_supplier text,
  previous_purchase_price decimal(10,2)
);

CREATE TABLE IF NOT EXISTS inventory_counts (
  id uuid PRIMARY KEY,
  ean_code text NOT NULL REFERENCES products(ean_code),
  quantity integer NOT NULL,
  counted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_counts (
  id uuid PRIMARY KEY,
  date timestamptz NOT NULL,
  notes jsonb NOT NULL,
  coins jsonb NOT NULL,
  total decimal(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  comments text
);

CREATE TABLE IF NOT EXISTS cash_count_logs (
  id uuid PRIMARY KEY,
  cash_count_id uuid NOT NULL REFERENCES cash_counts(id),
  date timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  previous_total decimal(10,2),
  new_total decimal(10,2),
  previous_date timestamptz,
  new_date timestamptz,
  notes jsonb,
  coins jsonb,
  comments text
);

-- Create indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_supplier ON products(supplier);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_inventory_counts_counted_at ON inventory_counts(counted_at);
CREATE INDEX idx_cash_counts_date ON cash_counts(date);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON cash_counts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();