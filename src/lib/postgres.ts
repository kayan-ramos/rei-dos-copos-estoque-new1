import { Pool } from 'pg';

// Configuration for PostgreSQL connection
const pool = new Pool({
  host: import.meta.env.VITE_PG_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_PG_PORT || '5432'),
  database: import.meta.env.VITE_PG_DATABASE || 'inventory',
  user: import.meta.env.VITE_PG_USER || 'postgres',
  password: import.meta.env.VITE_PG_PASSWORD || 'postgres',
  ssl: import.meta.env.VITE_PG_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('Connected to PostgreSQL at:', res.rows[0].now);
  }
});

export default pool;