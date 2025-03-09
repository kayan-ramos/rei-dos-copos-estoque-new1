import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';
import pg from 'pg';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Load environment variables from .env file if it exists
let env = {};
try {
  const envFile = fs.readFileSync(join(__dirname, '.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });
  console.log('Loaded environment variables from .env file');
} catch (error) {
  console.log('No .env file found or error reading it:', error.message);
}

// PostgreSQL connection
const pool = new pg.Pool({
  host: process.env.VITE_PG_HOST || env.VITE_PG_HOST || 'localhost',
  port: parseInt(process.env.VITE_PG_PORT || env.VITE_PG_PORT || '5432'),
  database: process.env.VITE_PG_DATABASE || env.VITE_PG_DATABASE || 'inventory',
  user: process.env.VITE_PG_USER || env.VITE_PG_USER || 'postgres',
  password: process.env.VITE_PG_PASSWORD || env.VITE_PG_PASSWORD || 'postgres',
  ssl: (process.env.VITE_PG_SSL === 'true' || env.VITE_PG_SSL === 'true') ? { rejectUnauthorized: false } : false
});

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('Connected to PostgreSQL at:', res.rows[0].now);
  }
});

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// API endpoint to check database connection
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY category, name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  const product = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO products (
        ean_code, name, category, initial_quantity, image_url, 
        package_quantity, package_type, purchase_price, sale_price, 
        supplier, active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        product.ean_code,
        product.name,
        product.category,
        product.initial_quantity || 0,
        product.image_url,
        product.package_quantity || 0,
        product.package_type,
        product.purchase_price || 0,
        product.sale_price || 0,
        product.supplier,
        product.active !== undefined ? product.active : true,
        new Date().toISOString()
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

app.patch('/api/products/:eanCode', async (req, res) => {
  const { eanCode } = req.params;
  const updates = req.body;
  
  try {
    // Build the SET part of the query dynamically based on the updates
    const setValues = [];
    const queryParams = [eanCode];
    let paramIndex = 2;
    
    for (const [key, value] of Object.entries(updates)) {
      // Convert camelCase to snake_case for database column names
      const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setValues.push(`${columnName} = $${paramIndex}`);
      queryParams.push(value);
      paramIndex++;
    }
    
    if (setValues.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    const query = `
      UPDATE products 
      SET ${setValues.join(', ')} 
      WHERE ean_code = $1 
      RETURNING *
    `;
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Inventory counts endpoints
app.get('/api/inventory-counts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_counts ORDER BY counted_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inventory counts:', err);
    res.status(500).json({ error: 'Failed to fetch inventory counts' });
  }
});

app.post('/api/inventory-counts', async (req, res) => {
  const { ean_code, quantity } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO inventory_counts (id, ean_code, quantity, counted_at) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *',
      [ean_code, quantity, new Date().toISOString()]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding inventory count:', err);
    res.status(500).json({ error: 'Failed to add inventory count' });
  }
});

app.get('/api/inventory-counts/latest/:eanCode', async (req, res) => {
  const { eanCode } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM inventory_counts WHERE ean_code = $1 ORDER BY counted_at DESC LIMIT 1',
      [eanCode]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No inventory count found for this product' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching latest inventory count:', err);
    res.status(500).json({ error: 'Failed to fetch latest inventory count' });
  }
});

// Cash counts endpoints
app.get('/api/cash-counts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cash_counts ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching cash counts:', err);
    res.status(500).json({ error: 'Failed to fetch cash counts' });
  }
});

app.post('/api/cash-counts', async (req, res) => {
  const { date, notes, coins, total, comments } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO cash_counts (
        id, date, notes, coins, total, created_at, updated_at, comments
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        date,
        notes,
        coins,
        total,
        new Date().toISOString(),
        new Date().toISOString(),
        comments
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding cash count:', err);
    res.status(500).json({ error: 'Failed to add cash count' });
  }
});

app.get('/api/cash-counts/date/:date', async (req, res) => {
  const { date } = req.params;
  
  try {
    // Convert the date string to a Date object
    const searchDate = new Date(date);
    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(searchDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await pool.query(
      'SELECT * FROM cash_counts WHERE date >= $1 AND date <= $2 LIMIT 1',
      [startOfDay.toISOString(), endOfDay.toISOString()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No cash count found for this date' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching cash count by date:', err);
    res.status(500).json({ error: 'Failed to fetch cash count by date' });
  }
});

app.get('/api/cash-counts/history', async (req, res) => {
  const { startDate, endDate } = req.query;
  
  try {
    const result = await pool.query(
      'SELECT * FROM cash_counts WHERE date >= $1 AND date <= $2 ORDER BY date DESC',
      [startDate, endDate]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching cash count history:', err);
    res.status(500).json({ error: 'Failed to fetch cash count history' });
  }
});

app.patch('/api/cash-counts/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    // Add updated_at to the updates
    updates.updated_at = new Date().toISOString();
    
    // Build the SET part of the query dynamically based on the updates
    const setValues = [];
    const queryParams = [id];
    let paramIndex = 2;
    
    for (const [key, value] of Object.entries(updates)) {
      // Convert camelCase to snake_case for database column names
      const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setValues.push(`${columnName} = $${paramIndex}`);
      queryParams.push(value);
      paramIndex++;
    }
    
    if (setValues.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    const query = `
      UPDATE cash_counts 
      SET ${setValues.join(', ')} 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash count not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating cash count:', err);
    res.status(500).json({ error: 'Failed to update cash count' });
  }
});

// Cash count logs endpoints
app.get('/api/cash-count-logs/:cashCountId', async (req, res) => {
  const { cashCountId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM cash_count_logs WHERE cash_count_id = $1 ORDER BY date DESC',
      [cashCountId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching cash count logs:', err);
    res.status(500).json({ error: 'Failed to fetch cash count logs' });
  }
});

app.post('/api/cash-count-logs', async (req, res) => {
  const log = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO cash_count_logs (
        id, cash_count_id, date, type, previous_total, new_total,
        previous_date, new_date, notes, coins, comments
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        log.cash_count_id,
        log.date || new Date().toISOString(),
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
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding cash count log:', err);
    res.status(500).json({ error: 'Failed to add cash count log' });
  }
});

// Redirecionar todas as requisições para o index.html (para SPA)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});