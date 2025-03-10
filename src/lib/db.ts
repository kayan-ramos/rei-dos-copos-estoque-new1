import { Pool } from 'pg';

// PostgreSQL connection pool configuration
const pool = new Pool({
  host: process.env.VITE_PG_HOST || 'app-f14da2d1-1e66-4d01-8cbd-f776f61f6cbf-do-user-3985658-0.e.db.ondigitalocean.com',
  port: parseInt(process.env.VITE_PG_PORT || '25060'),
  database: process.env.VITE_PG_DATABASE || 'db-rei-dos-copos-sistema-estoque',
  user: process.env.VITE_PG_USER || 'db-rei-dos-copos-sistema-estoque',
  password: process.env.VITE_PG_PASSWORD || 'AVNS_4x1aD__uTLcPKKjT_CN',
  ssl: {
    rejectUnauthorized: false // Required for DigitalOcean managed databases
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait before timing out when connecting a new client
});

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('Connected to PostgreSQL at:', res.rows[0].now);
  }
});

// Database interfaces
export interface Product {
  ean_code: string;
  name: string;
  category: string;
  initial_quantity: number;
  image_url: string | null;
  package_quantity: number;
  package_type: string | null;
  purchase_price: number;
  sale_price: number;
  supplier: string | null;
  active: boolean;
  created_at: string;
  deleted_at: string | null;
  last_price_change: string | null;
  last_supplier_change: string | null;
  last_purchase_price_change: string | null;
  previous_sale_price: number | null;
  previous_supplier: string | null;
  previous_purchase_price: number | null;
  organization_id: string;
}

export interface InventoryCount {
  id: string;
  ean_code: string;
  quantity: number;
  counted_at: string;
  organization_id: string;
}

export interface CashCount {
  id: string;
  date: string;
  notes: Record<string, number>;
  coins: Record<string, number>;
  total: number;
  created_at: string;
  updated_at: string;
  comments: string | null;
  organization_id: string;
}

export interface CashCountLog {
  id: string;
  cash_count_id: string;
  date: string;
  type: string;
  previous_total: number | null;
  new_total: number | null;
  previous_date: string | null;
  new_date: string | null;
  notes: Record<string, number> | null;
  coins: Record<string, number> | null;
  comments: string | null;
  organization_id: string;
}

// Database operations
export const db = {
  async getProducts(): Promise<Product[]> {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY category, name');
    return rows;
  },

  async addProduct(product: Omit<Product, 'created_at'>): Promise<Product> {
    const { rows } = await pool.query(
      `INSERT INTO products (
        ean_code, name, category, initial_quantity, image_url,
        package_quantity, package_type, purchase_price, sale_price,
        supplier, active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        product.ean_code,
        product.name,
        product.category,
        product.initial_quantity,
        product.image_url,
        product.package_quantity,
        product.package_type,
        product.purchase_price,
        product.sale_price,
        product.supplier,
        product.active
      ]
    );
    return rows[0];
  },

  async updateProduct(eanCode: string, updates: Partial<Product>): Promise<Product> {
    const setValues = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'ean_code') {
        setValues.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    values.push(eanCode);

    const { rows } = await pool.query(
      `UPDATE products 
       SET ${setValues.join(', ')} 
       WHERE ean_code = $${paramIndex} 
       RETURNING *`,
      values
    );

    return rows[0];
  },

  async deleteProduct(eanCode: string): Promise<void> {
    await pool.query(
      `UPDATE products 
       SET active = false, deleted_at = NOW() 
       WHERE ean_code = $1`,
      [eanCode]
    );
  },

  async addInventoryCount(eanCode: string, quantity: number): Promise<InventoryCount> {
    const { rows } = await pool.query(
      `INSERT INTO inventory_counts (
        id, ean_code, quantity, counted_at
      ) VALUES (gen_random_uuid(), $1, $2, NOW())
      RETURNING *`,
      [eanCode, quantity]
    );
    return rows[0];
  },

  async getInventoryCounts(): Promise<InventoryCount[]> {
    const { rows } = await pool.query(
      'SELECT * FROM inventory_counts ORDER BY counted_at DESC'
    );
    return rows;
  },

  async getLatestCount(eanCode: string): Promise<number | null> {
    const { rows } = await pool.query(
      `SELECT quantity 
       FROM inventory_counts 
       WHERE ean_code = $1 
       ORDER BY counted_at DESC 
       LIMIT 1`,
      [eanCode]
    );
    return rows[0]?.quantity || null;
  },

  async addCashCount(count: Omit<CashCount, 'id' | 'created_at' | 'updated_at'>): Promise<CashCount> {
    const { rows } = await pool.query(
      `INSERT INTO cash_counts (
        id, date, notes, coins, total, created_at, updated_at, comments
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW(), $5)
      RETURNING *`,
      [count.date, count.notes, count.coins, count.total, count.comments]
    );
    return rows[0];
  },

  async getCashCounts(): Promise<CashCount[]> {
    const { rows } = await pool.query(
      'SELECT * FROM cash_counts ORDER BY date DESC'
    );
    return rows;
  },

  async updateCashCount(id: string, updates: Partial<CashCount>): Promise<CashCount> {
    const setValues = [];
    const values = [];
    let paramIndex = 1;

    updates.updated_at = new Date().toISOString();

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        setValues.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    values.push(id);

    const { rows } = await pool.query(
      `UPDATE cash_counts 
       SET ${setValues.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      values
    );

    return rows[0];
  },

  async addCashCountLog(log: Omit<CashCountLog, 'id'>): Promise<CashCountLog> {
    const { rows } = await pool.query(
      `INSERT INTO cash_count_logs (
        id, cash_count_id, date, type, previous_total, new_total,
        previous_date, new_date, notes, coins, comments
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        log.cash_count_id,
        log.date,
        log.type,
        log.previous_total,
        log.new_total,
        log.previous_date,
        log.new_date,
        log.notes,
        log.coins,
        log.comments
      ]
    );
    return rows[0];
  },

  async getCashCountLogs(cashCountId: string): Promise<CashCountLog[]> {
    const { rows } = await pool.query(
      `SELECT * FROM cash_count_logs 
       WHERE cash_count_id = $1 
       ORDER BY date DESC`,
      [cashCountId]
    );
    return rows;
  }
};