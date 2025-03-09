/*
  # Schema inicial do banco de dados

  1. Tabelas
    - products: Armazena informações dos produtos
    - inventory_counts: Registra contagens de estoque
    - cash_counts: Registra contagens de caixa
    - cash_count_logs: Registra histórico de alterações nas contagens de caixa

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas de acesso para usuários autenticados
*/

-- Create tables if they don't exist
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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean_code text NOT NULL REFERENCES products(ean_code),
  quantity integer NOT NULL,
  counted_at timestamptz NOT NULL DEFAULT now()
);

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
DO $$ 
BEGIN
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cash_counts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cash_count_logs ENABLE ROW LEVEL SECURITY;
EXCEPTION 
  WHEN OTHERS THEN NULL;
END $$;

-- Create policies if they don't exist
DO $$ 
BEGIN
  -- Products policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow authenticated users to read products'
  ) THEN
    CREATE POLICY "Allow authenticated users to read products"
      ON products FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow authenticated users to insert products'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert products"
      ON products FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow authenticated users to update products'
  ) THEN
    CREATE POLICY "Allow authenticated users to update products"
      ON products FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Inventory counts policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_counts' AND policyname = 'Allow authenticated users to read inventory_counts'
  ) THEN
    CREATE POLICY "Allow authenticated users to read inventory_counts"
      ON inventory_counts FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_counts' AND policyname = 'Allow authenticated users to insert inventory_counts'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert inventory_counts"
      ON inventory_counts FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  -- Cash counts policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_counts' AND policyname = 'Allow authenticated users to read cash_counts'
  ) THEN
    CREATE POLICY "Allow authenticated users to read cash_counts"
      ON cash_counts FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_counts' AND policyname = 'Allow authenticated users to insert cash_counts'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert cash_counts"
      ON cash_counts FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_counts' AND policyname = 'Allow authenticated users to update cash_counts'
  ) THEN
    CREATE POLICY "Allow authenticated users to update cash_counts"
      ON cash_counts FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Cash count logs policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_count_logs' AND policyname = 'Allow authenticated users to read cash_count_logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to read cash_count_logs"
      ON cash_count_logs FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_count_logs' AND policyname = 'Allow authenticated users to insert cash_count_logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert cash_count_logs"
      ON cash_count_logs FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

END $$;