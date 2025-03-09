#!/bin/bash

# Script para diagnosticar problemas de conexão com o servidor
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"
SENHA="DWS#142893b"

echo "=== Iniciando diagnóstico de conexão com o servidor $IP_DROPLET ==="

# Verificar se o servidor está acessível via ping
echo "Verificando se o servidor responde a ping..."
if ping -c 3 $IP_DROPLET > /dev/null 2>&1; then
    echo "✅ Servidor responde a ping."
else
    echo "❌ Servidor não responde a ping. Possíveis problemas:"
    echo "   - O servidor pode estar desligado"
    echo "   - O endereço IP pode estar incorreto"
    echo "   - Pode haver um firewall bloqueando ICMP"
fi

# Verificar se as portas principais estão abertas
echo -e "\nVerificando portas principais..."

echo "Verificando porta SSH (22)..."
if nc -z -w 5 $IP_DROPLET 22 > /dev/null 2>&1; then
    echo "✅ Porta SSH (22) está aberta."
else
    echo "❌ Porta SSH (22) está fechada. Não é possível conectar via SSH."
fi

echo "Verificando porta HTTP (80)..."
if nc -z -w 5 $IP_DROPLET 80 > /dev/null 2>&1; then
    echo "✅ Porta HTTP (80) está aberta."
else
    echo "❌ Porta HTTP (80) está fechada. Nginx pode não estar rodando."
fi

echo "Verificando porta da aplicação (3000)..."
if nc -z -w 5 $IP_DROPLET 3000 > /dev/null 2>&1; then
    echo "✅ Porta da aplicação (3000) está aberta."
else
    echo "❌ Porta da aplicação (3000) está fechada. A aplicação pode não estar rodando."
fi

echo "Verificando porta do PostgreSQL (5432)..."
if nc -z -w 5 $IP_DROPLET 5432 > /dev/null 2>&1; then
    echo "✅ Porta do PostgreSQL (5432) está aberta."
else
    echo "❌ Porta do PostgreSQL (5432) está fechada. O PostgreSQL pode não estar rodando ou configurado corretamente."
fi

# Tentar conexão SSH para verificar status do servidor
echo -e "\nTentando conexão SSH para verificar status do servidor..."

# Instalar sshpass se não estiver instalado
if ! command -v sshpass &> /dev/null; then
    echo "Instalando sshpass..."
    sudo apt-get update
    sudo apt-get install -y sshpass
fi

if sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@$IP_DROPLET "echo 'Conexão SSH bem-sucedida'" > /dev/null 2>&1; then
    echo "✅ Conexão SSH bem-sucedida. Verificando serviços..."
    
    # Verificar status dos serviços
    sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << 'ENDSSH'
    echo "Status do Nginx:"
    systemctl status nginx | grep Active
    
    echo -e "\nStatus do PM2:"
    if command -v pm2 &> /dev/null; then
        pm2 list
    else
        echo "PM2 não está instalado"
    fi
    
    echo -e "\nStatus do PostgreSQL:"
    systemctl status postgresql | grep Active
    
    echo -e "\nVerificando se a pasta da aplicação existe:"
    if [ -d "/var/www/inventory-control" ]; then
        echo "✅ Pasta /var/www/inventory-control existe"
        ls -la /var/www/inventory-control
    else
        echo "❌ Pasta /var/www/inventory-control não existe"
    fi
    
    echo -e "\nVerificando configuração do Nginx:"
    cat /etc/nginx/sites-available/default | grep -A 10 "location /"
    
    echo -e "\nVerificando logs da aplicação:"
    if command -v pm2 &> /dev/null; then
        pm2 logs inventory-control --lines 10
    fi
    
    echo -e "\nVerificando conexão com o banco de dados:"
    if command -v psql &> /dev/null; then
        sudo -u postgres psql -c "SELECT 'Conexão com o PostgreSQL bem-sucedida' as status;"
    else
        echo "PostgreSQL não está instalado"
    fi
ENDSSH
else
    echo "❌ Não foi possível estabelecer conexão SSH. Possíveis problemas:"
    echo "   - O servidor pode estar desligado"
    echo "   - O endereço IP pode estar incorreto"
    echo "   - A porta SSH pode estar bloqueada"
    echo "   - As credenciais SSH podem estar incorretas"
fi

echo -e "\n=== Recomendações para resolver problemas de conexão ==="
echo "1. Verifique se o servidor está ligado no painel do DigitalOcean"
echo "2. Confirme se o endereço IP está correto"
echo "3. Verifique se o firewall do DigitalOcean permite conexões nas portas 22, 80, 3000 e 5432"
echo "4. Se o servidor estiver acessível via SSH, execute o script setup-postgres.sh para configurar o banco de dados"
echo "5. Após configurar o banco de dados, execute o script deploy-with-db.sh para implantar a aplicação"
echo "6. Verifique os logs da aplicação com: ssh root@$IP_DROPLET 'pm2 logs inventory-control'"

echo -e "\n=== Diagnóstico concluído ==="