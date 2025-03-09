#!/bin/bash

# Script simplificado para implantar a aplicação no DigitalOcean
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"
SENHA="DWS#142893b"

echo "=== Iniciando implantação simplificada no servidor $IP_DROPLET ==="

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

# Instalar sshpass se não estiver instalado
if ! command -v sshpass &> /dev/null; then
    echo "Instalando sshpass..."
    sudo apt-get update
    sudo apt-get install -y sshpass
fi

# Verificar conexão SSH
echo "Verificando conexão SSH..."
if ! sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@$IP_DROPLET "echo 'Conexão SSH bem-sucedida'" > /dev/null 2>&1; then
    echo "❌ Não foi possível estabelecer conexão SSH. Verifique se o servidor está online e se as credenciais estão corretas."
    exit 1
fi

# Configurar o servidor de forma simplificada
echo "Configurando o servidor..."
sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << 'ENDSSH'
# Instalar dependências essenciais
apt update
apt install -y nginx

# Instalar Node.js se não estiver instalado
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Instalar PM2 se não estiver instalado
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Configurar Nginx
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

# Criar diretório para a aplicação
mkdir -p /var/www/inventory-control
ENDSSH

# Transferir arquivos para o servidor
echo "Transferindo arquivos para o servidor $IP_DROPLET..."
sshpass -p "$SENHA" scp -o StrictHostKeyChecking=no -r deploy_temp/* root@$IP_DROPLET:/var/www/inventory-control/

# Iniciar a aplicação
echo "Iniciando a aplicação no servidor..."
sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << 'ENDSSH'
cd /var/www/inventory-control
npm ci --production
pm2 delete inventory-control || true
pm2 start server.js --name "inventory-control"
pm2 save
ENDSSH

# Limpar arquivos temporários
echo "Limpando arquivos temporários..."
rm -rf deploy_temp

echo "=== Implantação simplificada concluída! ==="
echo "Acesse http://$IP_DROPLET para ver sua aplicação."
echo "Se a aplicação não estiver acessível, execute o script troubleshoot-connection.sh para diagnosticar o problema."