/*
  # Fix RLS Policies and Add Multi-tenant Support

  1. Changes
    - Add organization_id to all tables
    - Add composite unique constraints for foreign keys
    - Update RLS policies to use organization_id
    - Add proper foreign key constraints

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Ensure data isolation between organizations
*/

-- Add organization_id to tables
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS organization_id uuid DEFAULT auth.uid();

ALTER TABLE inventory_counts 
ADD COLUMN IF NOT EXISTS organization_id uuid DEFAULT auth.uid();

ALTER TABLE cash_counts 
ADD COLUMN IF NOT EXISTS organization_id uuid DEFAULT auth.uid();

ALTER TABLE cash_count_logs 
ADD COLUMN IF NOT EXISTS organization_id uuid DEFAULT auth.uid();

-- Add composite unique constraints
ALTER TABLE products
ADD CONSTRAINT products_ean_code_org_key UNIQUE (ean_code, organization_id);

ALTER TABLE cash_counts
ADD CONSTRAINT cash_counts_id_org_key UNIQUE (id, organization_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON products;

DROP POLICY IF EXISTS "Allow authenticated users to read inventory_counts" ON inventory_counts;
DROP POLICY IF EXISTS "Allow authenticated users to insert inventory_counts" ON inventory_counts;

DROP POLICY IF EXISTS "Allow authenticated users to read cash_counts" ON cash_counts;
DROP POLICY IF EXISTS "Allow authenticated users to insert cash_counts" ON cash_counts;
DROP POLICY IF EXISTS "Allow authenticated users to update cash_counts" ON cash_counts;

DROP POLICY IF EXISTS "Allow authenticated users to read cash_count_logs" ON cash_count_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert cash_count_logs" ON cash_count_logs;

-- Create new policies for products
CREATE POLICY "Enable read access for authenticated users"
ON products FOR SELECT
TO authenticated
USING (organization_id = auth.uid());

CREATE POLICY "Enable insert access for authenticated users"
ON products FOR INSERT
TO authenticated
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Enable update access for authenticated users"
ON products FOR UPDATE
TO authenticated
USING (organization_id = auth.uid())
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Enable delete access for authenticated users"
ON products FOR DELETE
TO authenticated
USING (organization_id = auth.uid());

-- Create new policies for inventory_counts
CREATE POLICY "Enable read access for authenticated users"
ON inventory_counts FOR SELECT
TO authenticated
USING (organization_id = auth.uid());

CREATE POLICY "Enable insert access for authenticated users"
ON inventory_counts FOR INSERT
TO authenticated
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Enable update access for authenticated users"
ON inventory_counts FOR UPDATE
TO authenticated
USING (organization_id = auth.uid())
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Enable delete access for authenticated users"
ON inventory_counts FOR DELETE
TO authenticated
USING (organization_id = auth.uid());

-- Create new policies for cash_counts
CREATE POLICY "Enable read access for authenticated users"
ON cash_counts FOR SELECT
TO authenticated
USING (organization_id = auth.uid());

CREATE POLICY "Enable insert access for authenticated users"
ON cash_counts FOR INSERT
TO authenticated
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Enable update access for authenticated users"
ON cash_counts FOR UPDATE
TO authenticated
USING (organization_id = auth.uid())
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Enable delete access for authenticated users"
ON cash_counts FOR DELETE
TO authenticated
USING (organization_id = auth.uid());

-- Create new policies for cash_count_logs
CREATE POLICY "Enable read access for authenticated users"
ON cash_count_logs FOR SELECT
TO authenticated
USING (organization_id = auth.uid());

CREATE POLICY "Enable insert access for authenticated users"
ON cash_count_logs FOR INSERT
TO authenticated
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Enable update access for authenticated users"
ON cash_count_logs FOR UPDATE
TO authenticated
USING (organization_id = auth.uid())
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Enable delete access for authenticated users"
ON cash_count_logs FOR DELETE
TO authenticated
USING (organization_id = auth.uid());

-- Add foreign key constraints
ALTER TABLE inventory_counts
ADD CONSTRAINT fk_inventory_counts_products
FOREIGN KEY (ean_code, organization_id)
REFERENCES products(ean_code, organization_id)
ON DELETE CASCADE;

ALTER TABLE cash_count_logs
ADD CONSTRAINT fk_cash_count_logs_cash_counts
FOREIGN KEY (cash_count_id, organization_id)
REFERENCES cash_counts(id, organization_id)
ON DELETE CASCADE;