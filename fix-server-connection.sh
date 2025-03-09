#!/bin/bash

# Script para corrigir problemas comuns de conexão com o servidor
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"
SENHA="DWS#142893b"

echo "=== Iniciando correção de problemas de conexão com o servidor $IP_DROPLET ==="

# Instalar sshpass se não estiver instalado
if ! command -v sshpass &> /dev/null; then
    echo "Instalando sshpass..."
    sudo apt-get update
    sudo apt-get install -y sshpass
fi

# Tentar conexão SSH
echo "Tentando conexão SSH..."
if sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@$IP_DROPLET "echo 'Conexão SSH bem-sucedida'" > /dev/null 2>&1; then
    echo "✅ Conexão SSH bem-sucedida. Corrigindo configurações do servidor..."
    
    # Corrigir configurações do servidor
    sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << 'ENDSSH'
    # Reiniciar Nginx
    echo "Reiniciando Nginx..."
    systemctl restart nginx
    
    # Verificar e corrigir configuração do firewall
    echo "Verificando e corrigindo configuração do firewall..."
    ufw status | grep "Status: active" > /dev/null
    if [ $? -eq 0 ]; then
        echo "Firewall está ativo. Garantindo que as portas necessárias estejam abertas..."
        ufw allow OpenSSH
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 3000/tcp
        ufw allow 5432/tcp
    else
        echo "Firewall não está ativo. Ativando e configurando..."
        ufw allow OpenSSH
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 3000/tcp
        ufw allow 5432/tcp
        ufw --force enable
    fi
    
    # Verificar se a pasta da aplicação existe
    if [ ! -d "/var/www/inventory-control" ]; then
        echo "Criando pasta para a aplicação..."
        mkdir -p /var/www/inventory-control
    fi
    
    # Verificar e corrigir configuração do Nginx
    echo "Verificando e corrigindo configuração do Nginx..."
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
    
    # Reiniciar Nginx novamente após correções
    systemctl restart nginx
    
    # Verificar se o Node.js está instalado
    echo "Verificando se o Node.js está instalado..."
    if ! command -v node &> /dev/null; then
        echo "Instalando Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
    fi
    
    # Verificar se o PM2 está instalado
    echo "Verificando se o PM2 está instalado..."
    if ! command -v pm2 &> /dev/null; then
        echo "Instalando PM2..."
        npm install -g pm2
    fi
    
    # Verificar se o PostgreSQL está instalado
    echo "Verificando se o PostgreSQL está instalado..."
    if ! command -v psql &> /dev/null; then
        echo "PostgreSQL não está instalado. Execute o script setup-postgres.sh para configurá-lo."
    else
        echo "Reiniciando PostgreSQL..."
        systemctl restart postgresql
    fi
    
    # Verificar se a aplicação está rodando
    echo "Verificando se a aplicação está rodando..."
    if pm2 list | grep inventory-control > /dev/null; then
        echo "Reiniciando a aplicação..."
        pm2 restart inventory-control
    else
        echo "A aplicação não está rodando. Execute o script deploy-with-db.sh para implantá-la."
    fi
    
    echo "Correções concluídas no servidor."
ENDSSH

    echo "✅ Configurações do servidor corrigidas."
    
    # Perguntar se deseja implantar a aplicação
    read -p "Deseja implantar a aplicação agora? (s/n): " deploy_now
    if [[ $deploy_now == "s" || $deploy_now == "S" ]]; then
        echo "Implantando a aplicação..."
        bash deploy-with-db.sh
    else
        echo "Você pode implantar a aplicação mais tarde usando o comando: bash deploy-with-db.sh"
    fi
else
    echo "❌ Não foi possível estabelecer conexão SSH. Possíveis problemas:"
    echo "   - O servidor pode estar desligado"
    echo "   - O endereço IP pode estar incorreto"
    echo "   - A porta SSH pode estar bloqueada"
    echo "   - As credenciais SSH podem estar incorretas"
    
    echo -e "\nVerificando se o servidor responde a ping..."
    if ping -c 3 $IP_DROPLET > /dev/null 2>&1; then
        echo "✅ Servidor responde a ping, mas a conexão SSH falhou."
        echo "   Verifique as credenciais SSH ou se a porta 22 está aberta."
    else
        echo "❌ Servidor não responde a ping."
        echo "   Verifique se o servidor está ligado e se o IP está correto."
    fi
fi

echo -e "\n=== Recomendações adicionais ==="
echo "1. Verifique no painel do DigitalOcean se o Droplet está ativo"
echo "2. Confirme se o endereço IP $IP_DROPLET está correto"
echo "3. Se você acabou de criar o Droplet, aguarde alguns minutos para que ele inicialize completamente"
echo "4. Verifique se você pode acessar o console do Droplet pelo painel do DigitalOcean"
echo "5. Se necessário, reinicie o Droplet pelo painel do DigitalOcean"

echo -e "\n=== Processo de correção concluído ==="