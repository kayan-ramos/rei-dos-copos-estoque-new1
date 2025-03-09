# Inventory Control Server

This is the backend server for the Inventory Control application. It provides a REST API for managing products, inventory counts, cash counts, and cash count logs.

## Setup

1. Install PostgreSQL if not already installed
2. Create the database and tables:
   ```
   psql -U postgres -f setup.sql
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Health Check
- `GET /api/health` - Check if the server is running

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Add a new product
- `PATCH /api/products/:eanCode` - Update a product

### Inventory Counts
- `GET /api/inventory-counts` - Get all inventory counts
- `POST /api/inventory-counts` - Add a new inventory count
- `GET /api/inventory-counts/latest/:eanCode` - Get the latest inventory count for a product

### Cash Counts
- `GET /api/cash-counts` - Get all cash counts
- `POST /api/cash-counts` - Add a new cash count
- `GET /api/cash-counts/date/:date` - Get a cash count by date
- `GET /api/cash-counts/history` - Get cash count history
- `PATCH /api/cash-counts/:id` - Update a cash count

### Cash Count Logs
- `GET /api/cash-count-logs/:cashCountId` - Get all logs for a cash count
- `POST /api/cash-count-logs` - Add a new cash count log

## Deployment

### Setting up on DigitalOcean

1. Create a new Droplet on DigitalOcean
2. Install Node.js and PostgreSQL
3. Clone this repository
4. Set up the database using the setup.sql script
5. Install dependencies with `npm install`
6. Set up a process manager like PM2:
   ```
   npm install -g pm2
   pm2 start server.js
   ```
7. Configure Nginx as a reverse proxy:
   ```
   server {
       listen 80;
       server_name your_domain_or_ip;

       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location / {
           root /path/to/frontend/build;
           try_files $uri $uri/ /index.html;
       }
   }
   ```
8. Set up SSL with Let's Encrypt (optional but recommended)