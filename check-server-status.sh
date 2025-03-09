#!/bin/bash

# Script para verificar o status do servidor e da aplicação
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"
SENHA="DWS#142893b"

# Instalar sshpass se não estiver instalado
if ! command -v sshpass &> /dev/null; then
    echo "Instalando sshpass..."
    sudo apt-get update
    sudo apt-get install -y sshpass
fi

echo "=== Verificando status do servidor $IP_DROPLET ==="

# Verificar status do sistema
echo "Status do sistema:"
sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << 'ENDSSH'
echo "Uso de CPU e memória:"
top -b -n 1 | head -n 5

echo -e "\nEspaço em disco:"
df -h | grep -v tmpfs

echo -e "\nStatus do Nginx:"
systemctl status nginx | grep Active

echo -e "\nStatus do PM2:"
pm2 list

echo -e "\nLogs recentes da aplicação:"
pm2 logs inventory-control --lines 10
ENDSSH

# Verificar se a aplicação está acessível
echo -e "\nVerificando se a aplicação está acessível..."
if curl -s --head --request GET http://$IP_DROPLET | grep "200 OK" > /dev/null; then
    echo "✅ Aplicação está online e respondendo!"
else
    echo "❌ Aplicação não está respondendo corretamente."
fi

echo "=== Verificação concluída ==="