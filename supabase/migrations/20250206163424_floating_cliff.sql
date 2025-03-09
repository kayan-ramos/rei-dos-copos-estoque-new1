/*
  # Criação das tabelas iniciais

  1. New Tables
    - `products`
      - `ean_code` (text, primary key) - Código EAN do produto
      - `name` (text) - Nome do produto
      - `category` (text) - Categoria do produto
      - `initial_quantity` (integer) - Quantidade inicial
      - `image_url` (text) - URL da imagem
      - `package_quantity` (integer) - Quantidade por embalagem
      - `package_type` (text) - Tipo de embalagem
      - `purchase_price` (decimal) - Preço de compra
      - `sale_price` (decimal) - Preço de venda
      - `supplier` (text) - Fornecedor
      - `active` (boolean) - Status do produto
      - `created_at` (timestamptz) - Data de criação
      - `deleted_at` (timestamptz) - Data de exclusão
      - `last_price_change` (timestamptz) - Última alteração de preço
      - `last_supplier_change` (timestamptz) - Última alteração de fornecedor
      - `last_purchase_price_change` (timestamptz) - Última alteração do preço de compra
      - `previous_sale_price` (decimal) - Preço de venda anterior
      - `previous_supplier` (text) - Fornecedor anterior
      - `previous_purchase_price` (decimal) - Preço de compra anterior

    - `inventory_counts`
      - `id` (uuid, primary key) - ID único da contagem
      - `ean_code` (text) - Código EAN do produto
      - `quantity` (integer) - Quantidade contada
      - `counted_at` (timestamptz) - Data da contagem

    - `cash_counts`
      - `id` (uuid, primary key) - ID único da contagem
      - `date` (timestamptz) - Data da contagem
      - `notes` (jsonb) - Notas em dinheiro
      - `coins` (jsonb) - Moedas
      - `total` (decimal) - Total
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização
      - `comments` (text) - Comentários

    - `cash_count_logs`
      - `id` (uuid, primary key) - ID único do log
      - `cash_count_id` (uuid) - ID da contagem
      - `date` (timestamptz) - Data do log
      - `type` (text) - Tipo do log
      - `previous_total` (decimal) - Total anterior
      - `new_total` (decimal) - Novo total
      - `previous_date` (timestamptz) - Data anterior
      - `new_date` (timestamptz) - Nova data
      - `notes` (jsonb) - Notas em dinheiro
      - `coins` (jsonb) - Moedas
      - `comments` (text) - Comentários

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create products table
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

-- Create inventory_counts table
CREATE TABLE IF NOT EXISTS inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean_code text NOT NULL REFERENCES products(ean_code),
  quantity integer NOT NULL,
  counted_at timestamptz NOT NULL DEFAULT now()
);

-- Create cash_counts table
CREATE TABLE IF NOT EXISTS cash_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL,
  notes jsonb NOT NULL,
  coins jsonb NOT NULL,
  total decimal(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  comments text
);

-- Create cash_count_logs table
CREATE TABLE IF NOT EXISTS cash_count_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_count_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read inventory_counts"
  ON inventory_counts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert inventory_counts"
  ON inventory_counts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read cash_counts"
  ON cash_counts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert cash_counts"
  ON cash_counts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update cash_counts"
  ON cash_counts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read cash_count_logs"
  ON cash_count_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert cash_count_logs"
  ON cash_count_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);