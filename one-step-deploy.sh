#!/bin/bash

# Script para configurar o servidor e implantar a aplicação em um único passo
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"
SENHA="DWS#142893b"

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
      PORT: 3000
    }
  }]
};
EOL

# Configurar o servidor
echo "Configurando o servidor..."
ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << 'ENDSSH'
# Atualizar o sistema
apt update && apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar PM2
npm install -g pm2

# Configurar firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Instalar Nginx
apt install -y nginx

# Configurar Nginx como proxy reverso
cat > /etc/nginx/sites-available/default << 'EOL'
server {
    listen 80;
    server_name _;

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

# Criar diretório para a aplicação
mkdir -p /var/www/inventory-control
ENDSSH

# Transferir arquivos para o servidor
echo "Transferindo arquivos para o servidor $IP_DROPLET..."
scp -o StrictHostKeyChecking=no -r deploy_temp/* root@$IP_DROPLET:/var/www/inventory-control/

# Executar comandos de instalação e inicialização no servidor
echo "Iniciando a aplicação no servidor..."
ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << 'ENDSSH'
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