#!/bin/bash

# Script para configurar o PostgreSQL no servidor DigitalOcean
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"
SENHA="DWS#142893b"
DB_NAME="inventory"
DB_USER="postgres"
DB_PASSWORD="DWS#142893b"

echo "=== Iniciando configuração do PostgreSQL no servidor $IP_DROPLET ==="

# Instalar sshpass se não estiver instalado
if ! command -v sshpass &> /dev/null; then
    echo "Instalando sshpass..."
    sudo apt-get update
    sudo apt-get install -y sshpass
fi

# Configurar o PostgreSQL no servidor
echo "Configurando o PostgreSQL..."
sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << ENDSSH
# Instalar PostgreSQL
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

echo "PostgreSQL configurado com sucesso!"
ENDSSH

echo "=== Configuração do PostgreSQL concluída! ==="
echo "Banco de dados '$DB_NAME' criado no servidor $IP_DROPLET"
echo "Usuário: $DB_USER"
echo "Senha: $DB_PASSWORD"
echo "Porta: 5432"