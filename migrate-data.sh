#!/bin/bash

# Script para migrar dados do Supabase para o PostgreSQL no DigitalOcean
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"
SENHA="DWS#142893b"
DB_NAME="inventory"
DB_USER="postgres"
DB_PASSWORD="DWS#142893b"

echo "=== Iniciando migração de dados do Supabase para o PostgreSQL ==="

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
    echo "PostgreSQL não está instalado. Execute o script setup-postgres.sh primeiro."
    exit 1
fi

# Verificar se o banco de dados existe
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "Banco de dados $DB_NAME não existe. Execute o script setup-postgres.sh primeiro."
    exit 1
fi

echo "PostgreSQL está configurado corretamente."
ENDSSH

# Exportar dados do Supabase usando a API
echo "Exportando dados do Supabase..."
node -e "
const fs = require('fs');
const https = require('https');

// Função para fazer requisição HTTP
function httpRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Carregar variáveis de ambiente
require('dotenv').config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não definidas');
  process.exit(1);
}

// Configurar opções da requisição
const options = {
  headers: {
    'apikey': supabaseKey,
    'Authorization': 'Bearer ' + supabaseKey
  }
};

// Exportar dados
async function exportData() {
  try {
    // Exportar produtos
    console.log('Exportando produtos...');
    const products = await httpRequest(supabaseUrl + '/rest/v1/products?select=*', options);
    fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
    console.log('Exportados ' + products.length + ' produtos');
    
    // Exportar contagens de inventário
    console.log('Exportando contagens de inventário...');
    const inventoryCounts = await httpRequest(supabaseUrl + '/rest/v1/inventory_counts?select=*', options);
    fs.writeFileSync('inventory_counts.json', JSON.stringify(inventoryCounts, null, 2));
    console.log('Exportadas ' + inventoryCounts.length + ' contagens de inventário');
    
    // Exportar contagens de caixa
    console.log('Exportando contagens de caixa...');
    const cashCounts = await httpRequest(supabaseUrl + '/rest/v1/cash_counts?select=*', options);
    fs.writeFileSync('cash_counts.json', JSON.stringify(cashCounts, null, 2));
    console.log('Exportadas ' + cashCounts.length + ' contagens de caixa');
    
    // Exportar logs de contagens de caixa
    console.log('Exportando logs de contagens de caixa...');
    const cashCountLogs = await httpRequest(supabaseUrl + '/rest/v1/cash_count_logs?select=*', options);
    fs.writeFileSync('cash_count_logs.json', JSON.stringify(cashCountLogs, null, 2));
    console.log('Exportados ' + cashCountLogs.length + ' logs de contagens de caixa');
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    process.exit(1);
  }
}

exportData();
"

# Transferir os dados para o servidor
echo "Transferindo dados para o servidor..."
sshpass -p "$SENHA" scp -o StrictHostKeyChecking=no *.json root@$IP_DROPLET:/tmp/

# Importar dados para o PostgreSQL
echo "Importando dados para o PostgreSQL..."
sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << ENDSSH
# Converter JSON para SQL
cd /tmp
cat > import_data.js << 'EOF'
const fs = require('fs');

// Função para escapar strings para SQL
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// Função para converter JSON para SQL INSERT
function jsonToSql(data, tableName, primaryKey) {
  if (!data || data.length === 0) return '';
  
  const columns = Object.keys(data[0]);
  let sql = '';
  
  data.forEach(row => {
    const values = columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'object') return escapeSql(JSON.stringify(value));
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
      if (typeof value === 'number') return value;
      return escapeSql(value);
    });
    
    sql += \`INSERT INTO \${tableName} (\${columns.join(', ')}) VALUES (\${values.join(', ')});\n\`;
  });
  
  return sql;
}

// Processar cada arquivo JSON
try {
  // Produtos
  if (fs.existsSync('products.json')) {
    const products = JSON.parse(fs.readFileSync('products.json', 'utf8'));
    const productsSql = jsonToSql(products, 'products', 'ean_code');
    fs.writeFileSync('products.sql', productsSql);
    console.log('Convertidos ' + products.length + ' produtos para SQL');
  }
  
  // Contagens de inventário
  if (fs.existsSync('inventory_counts.json')) {
    const inventoryCounts = JSON.parse(fs.readFileSync('inventory_counts.json', 'utf8'));
    const inventoryCountsSql = jsonToSql(inventoryCounts, 'inventory_counts', 'id');
    fs.writeFileSync('inventory_counts.sql', inventoryCountsSql);
    console.log('Convertidas ' + inventoryCounts.length + ' contagens de inventário para SQL');
  }
  
  // Contagens de caixa
  if (fs.existsSync('cash_counts.json')) {
    const cashCounts = JSON.parse(fs.readFileSync('cash_counts.json', 'utf8'));
    const cashCountsSql = jsonToSql(cashCounts, 'cash_counts', 'id');
    fs.writeFileSync('cash_counts.sql', cashCountsSql);
    console.log('Convertidas ' + cashCounts.length + ' contagens de caixa para SQL');
  }
  
  // Logs de contagens de caixa
  if (fs.existsSync('cash_count_logs.json')) {
    const cashCountLogs = JSON.parse(fs.readFileSync('cash_count_logs.json', 'utf8'));
    const cashCountLogsSql = jsonToSql(cashCountLogs, 'cash_count_logs', 'id');
    fs.writeFileSync('cash_count_logs.sql', cashCountLogsSql);
    console.log('Convertidos ' + cashCountLogs.length + ' logs de contagens de caixa para SQL');
  }
} catch (error) {
  console.error('Erro ao converter dados:', error);
  process.exit(1);
}
EOF

node import_data.js

# Importar dados para o PostgreSQL
echo "Importando dados para o PostgreSQL..."
if [ -f products.sql ]; then
  sudo -u postgres psql -d $DB_NAME -f products.sql
  echo "Produtos importados com sucesso."
fi

if [ -f inventory_counts.sql ]; then
  sudo -u postgres psql -d $DB_NAME -f inventory_counts.sql
  echo "Contagens de inventário importadas com sucesso."
fi

if [ -f cash_counts.sql ]; then
  sudo -u postgres psql -d $DB_NAME -f cash_counts.sql
  echo "Contagens de caixa importadas com sucesso."
fi

if [ -f cash_count_logs.sql ]; then
  sudo -u postgres psql -d $DB_NAME -f cash_count_logs.sql
  echo "Logs de contagens de caixa importados com sucesso."
fi

# Limpar arquivos temporários
rm -f *.json *.sql import_data.js
ENDSSH

echo "=== Migração de dados concluída! ==="
echo "Os dados foram migrados do Supabase para o PostgreSQL no servidor $IP_DROPLET"