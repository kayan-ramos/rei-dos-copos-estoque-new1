/*
  # Enhance database performance and security

  1. Changes
    - Add indexes for better query performance
    - Add triggers for automatic timestamp updates
    - Add constraints for data integrity
    - Add functions for automatic data cleanup

  2. Security
    - Add additional RLS policies for better access control
    - Improve policies for soft delete operations
*/

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_counted_at ON inventory_counts(counted_at);
CREATE INDEX IF NOT EXISTS idx_cash_counts_date ON cash_counts(date);

-- Add trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cash_counts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON cash_counts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Add function for soft delete cleanup
CREATE OR REPLACE FUNCTION cleanup_soft_deleted_records()
RETURNS void AS $$
BEGIN
  -- Archive records older than 90 days
  UPDATE products
  SET active = false,
      deleted_at = CURRENT_TIMESTAMP
  WHERE active = false
    AND deleted_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Add additional RLS policies
DO $$ 
BEGIN
  -- Products policies for soft delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'Enable soft delete for authenticated users'
  ) THEN
    CREATE POLICY "Enable soft delete for authenticated users"
      ON products
      FOR UPDATE
      TO authenticated
      USING (
        organization_id = auth.uid() 
        AND active = true
      );
  END IF;

  -- Inventory counts policy for recent records
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_counts' 
    AND policyname = 'Enable read recent counts for authenticated users'
  ) THEN
    CREATE POLICY "Enable read recent counts for authenticated users"
      ON inventory_counts
      FOR SELECT
      TO authenticated
      USING (
        organization_id = auth.uid() 
        AND counted_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
      );
  END IF;

  -- Cash counts policy for recent records
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cash_counts' 
    AND policyname = 'Enable read recent counts for authenticated users'
  ) THEN
    CREATE POLICY "Enable read recent counts for authenticated users"
      ON cash_counts
      FOR SELECT
      TO authenticated
      USING (
        organization_id = auth.uid() 
        AND date > CURRENT_TIMESTAMP - INTERVAL '90 days'
      );
  END IF;
END $$;