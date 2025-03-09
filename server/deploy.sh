#!/bin/bash

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install PM2
npm install -g pm2

# Create directory for the application
mkdir -p /var/www/inventory-control
cd /var/www/inventory-control

# Clone the repository (replace with your actual repository)
# git clone https://github.com/yourusername/inventory-control.git .

# Copy server files
mkdir -p server
cp -r /path/to/server/* server/

# Set up the database
sudo -u postgres psql -f server/setup.sql

# Install server dependencies
cd server
npm install

# Start the server with PM2
pm2 start server.js
pm2 save
pm2 startup

# Configure Nginx
cp nginx.conf /etc/nginx/sites-available/inventory-control
ln -s /etc/nginx/sites-available/inventory-control /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Set up firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable

echo "Deployment completed!"