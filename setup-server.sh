#!/bin/bash

# Script para configurar o servidor DigitalOcean
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"

# Configurar o servidor
ssh root@$IP_DROPLET << 'ENDSSH'
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

echo "Servidor configurado com sucesso!"
ENDSSH

echo "Configuração do servidor concluída! Agora você pode implantar sua aplicação usando o script deploy.sh."