#!/bin/bash

# Script para implantar a aplicação com banco de dados no DigitalOcean
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"
SENHA="DWS#142893b"
DB_NAME="inventory"
DB_USER="postgres"
DB_PASSWORD="DWS#142893b"

echo "=== Iniciando implantação completa no servidor $IP_DROPLET ==="

# Construir o projeto
echo "Construindo o projeto..."
npm run build

# Criar pasta temporária para arquivos de implantação
echo "Preparando arquivos para implantação..."
mkdir -p deploy_temp
cp -r dist deploy_temp/
cp server.js deploy_temp/
cp package.json deploy_temp/
cp package-lock.json deploy_temp/
cp .env deploy_temp/

# Criar arquivo de configuração do PM2
cat > deploy_temp/ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: "inventory-control",
    script: "server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      VITE_PG_HOST: "localhost",
      VITE_PG_PORT: 5432,
      VITE_PG_DATABASE: "$DB_NAME",
      VITE_PG_USER: "$DB_USER",
      VITE_PG_PASSWORD: "$DB_PASSWORD",
      VITE_PG_SSL: "false"
    }
  }]
};
EOL

# Instalar sshpass se não estiver instalado
if ! command -v sshpass &> /dev/null; then
    echo "Instalando sshpass..."
    sudo apt-get update
    sudo apt-get install -y sshpass
fi

# Verificar se o PostgreSQL está configurado no servidor
echo "Verificando configuração do PostgreSQL no servidor..."
sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << ENDSSH
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL não está instalado. Instalando..."
    apt update
    apt install -y postgresql postgresql-contrib
    
    # Iniciar e habilitar o serviço
    systemctl start postgresql
    systemctl enable postgresql
    
    # Configurar o PostgreSQL para aceitar conexões remotas
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf
    echo "host    all             all             0.0.0.0/0               md5" >> /etc/postgresql/*/main/pg_hba.conf
    
    # Reiniciar o PostgreSQL para aplicar as alterações
    systemctl restart postgresql
    
    # Configurar o firewall para permitir conexões PostgreSQL
    ufw allow 5432/tcp
    
    # Criar o banco de dados e configurar o usuário
    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
    
    # Criar as tabelas necessárias
    sudo -u postgres psql -d $DB_NAME << EOF
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
  previous_purchase_price decimal(10,2),
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- Create inventory_counts table
CREATE TABLE IF NOT EXISTS inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean_code text NOT NULL REFERENCES products(ean_code),
  quantity integer NOT NULL,
  counted_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
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
  comments text,
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
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
  comments text,
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_counted_at ON inventory_counts(counted_at);
CREATE INDEX IF NOT EXISTS idx_cash_counts_date ON cash_counts(date);
EOF
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Node.js não está instalado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Verificar se o PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "PM2 não está instalado. Instalando..."
    npm install -g pm2
fi

# Verificar se o Nginx está instalado
if ! command -v nginx &> /dev/null; then
    echo "Nginx não está instalado. Instalando..."
    apt install -y nginx
    
    # Configurar Nginx como proxy reverso
    cat > /etc/nginx/sites-available/default << 'EOL'
server {
    listen 80;
    server_name _;

    location /api {
        proxy_pass http://localhost:3000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL
    
    # Reiniciar Nginx
    systemctl restart nginx
fi

# Criar diretório para a aplicação
mkdir -p /var/www/inventory-control
ENDSSH

# Transferir arquivos para o servidor
echo "Transferindo arquivos para o servidor $IP_DROPLET..."
sshpass -p "$SENHA" scp -o StrictHostKeyChecking=no -r deploy_temp/* root@$IP_DROPLET:/var/www/inventory-control/

# Executar comandos de instalação e inicialização no servidor
echo "Iniciando a aplicação no servidor..."
sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << 'ENDSSH'
cd /var/www/inventory-control
npm ci --production
pm2 delete inventory-control || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup
ENDSSH

# Limpar arquivos temporários
echo "Limpando arquivos temporários..."
rm -rf deploy_temp

echo "=== Implantação completa concluída! ==="
echo "Acesse http://$IP_DROPLET para ver sua aplicação."
echo "O banco de dados PostgreSQL está configurado e pronto para uso."