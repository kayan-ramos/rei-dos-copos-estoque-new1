#!/bin/bash

# Script para implantar o projeto no DigitalOcean
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"

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
      PORT: 3000
    }
  }]
};
EOL

# Transferir arquivos para o servidor
echo "Transferindo arquivos para o servidor $IP_DROPLET..."
scp -r deploy_temp/* root@$IP_DROPLET:/var/www/inventory-control/

# Executar comandos de instalação e inicialização no servidor
echo "Configurando o servidor..."
ssh root@$IP_DROPLET << 'ENDSSH'
cd /var/www/inventory-control
npm ci --production
pm2 delete inventory-control || true
pm2 start ecosystem.config.js
pm2 save
ENDSSH

# Limpar arquivos temporários
echo "Limpando arquivos temporários..."
rm -rf deploy_temp

echo "Implantação concluída! Acesse http://$IP_DROPLET para ver sua aplicação."