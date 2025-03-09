#!/bin/bash

# Script para fazer backup da aplicação no servidor
# IP do servidor: 24.144.105.125

IP_DROPLET="24.144.105.125"
SENHA="DWS#142893b"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "=== Iniciando backup da aplicação no servidor $IP_DROPLET ==="

# Criar diretório de backup local se não existir
mkdir -p $BACKUP_DIR

# Instalar sshpass se não estiver instalado
if ! command -v sshpass &> /dev/null; then
    echo "Instalando sshpass..."
    sudo apt-get update
    sudo apt-get install -y sshpass
fi

# Criar backup no servidor
echo "Criando backup no servidor..."
sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET << ENDSSH
cd /var/www
tar -czf inventory-control-backup.tar.gz inventory-control
ENDSSH

# Transferir backup para máquina local
echo "Transferindo backup para máquina local..."
sshpass -p "$SENHA" scp -o StrictHostKeyChecking=no root@$IP_DROPLET:/var/www/inventory-control-backup.tar.gz "$BACKUP_DIR/inventory-control-$TIMESTAMP.tar.gz"

# Remover arquivo de backup temporário no servidor
echo "Limpando arquivo temporário no servidor..."
sshpass -p "$SENHA" ssh -o StrictHostKeyChecking=no root@$IP_DROPLET "rm /var/www/inventory-control-backup.tar.gz"

echo "=== Backup concluído! ==="
echo "Backup salvo em: $BACKUP_DIR/inventory-control-$TIMESTAMP.tar.gz"