import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';
import pg from 'pg';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

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

// PostgreSQL connection with connection pooling
const pool = new pg.Pool({
  host: process.env.VITE_PG_HOST || env.VITE_PG_HOST || 'app-f14da2d1-1e66-4d01-8cbd-f776f61f6cbf-do-user-3985658-0.e.db.ondigitalocean.com',
  port: parseInt(process.env.VITE_PG_PORT || env.VITE_PG_PORT || '25060'),
  database: process.env.VITE_PG_DATABASE || env.VITE_PG_DATABASE || 'db-rei-dos-copos-sistema-estoque',
  user: process.env.VITE_PG_USER || env.VITE_PG_USER || 'db-rei-dos-copos-sistema-estoque',
  password: process.env.VITE_PG_PASSWORD || env.VITE_PG_PASSWORD || 'AVNS_4x1aD__uTLcPKKjT_CN',
  ssl: {
    rejectUnauthorized: false // Required for DigitalOcean managed databases
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
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

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files with caching
app.use(express.static(join(__dirname, 'dist'), {
  maxAge: '1h',
  etag: true,
  lastModified: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
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

// Handle all other routes - Important for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server with graceful shutdown
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});