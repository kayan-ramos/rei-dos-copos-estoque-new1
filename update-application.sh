#!/bin/bash

# Script para atualizar a aplicação no servidor sem reconfigurar todo o ambiente
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"
SENHA="DWS#142893b"

echo "=== Iniciando atualização da aplicação no servidor $IP_DROPLET ==="

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

# Transferir arquivos para o servidor usando sshpass
echo "Transferindo arquivos para o servidor $IP_DROPLET..."
sshpass -p "$SENHA" scp -o StrictHostKeyChecking=no -r deploy_temp/* root@$IP_DROPLET:/var/www/inventory-control/

# Executar comandos de instalação e reinicialização no servidor
echo "Atualizando a aplicação no servidor..."
sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << 'ENDSSH'
cd /var/www/inventory-control
npm ci --production
pm2 restart inventory-control
ENDSSH

# Limpar arquivos temporários
echo "Limpando arquivos temporários..."
rm -rf deploy_temp

echo "=== Atualização concluída! ==="
echo "Acesse http://$IP_DROPLET para ver sua aplicação atualizada."