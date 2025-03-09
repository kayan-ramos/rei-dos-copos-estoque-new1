# Guia de Implantação no DigitalOcean

Este guia explica como implantar o projeto de controle de inventário no DigitalOcean.

## 1. Preparação do Projeto

Antes de implantar, vamos criar um script de build e um arquivo de configuração para o servidor:

### Script de Build

```bash
#!/bin/bash
# build.sh

# Instalar dependências
npm ci

# Construir o projeto
npm run build

# Resultado: pasta ./dist com os arquivos estáticos
```

### Configuração do Servidor

```javascript
// server.js
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Compressão gzip para melhor performance
app.use(compression());

// Servir arquivos estáticos da pasta dist
app.use(express.static(join(__dirname, 'dist')));

// Redirecionar todas as requisições para o index.html (para SPA)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
```

## 2. Configuração do Droplet no DigitalOcean

1. Conecte-se ao seu Droplet via SSH:
   ```
   ssh root@24.144.105.125
   ```

2. Atualize o sistema:
   ```
   apt update && apt upgrade -y
   ```

3. Instale o Node.js e npm:
   ```
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   ```

4. Instale o PM2 (gerenciador de processos):
   ```
   npm install -g pm2
   ```

5. Configure o firewall:
   ```
   ufw allow OpenSSH
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

6. Instale o Nginx:
   ```
   apt install -y nginx
   ```

7. Configure o Nginx como proxy reverso:
   ```
   nano /etc/nginx/sites-available/default
   ```

   Substitua o conteúdo por:
   ```
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
   ```

8. Reinicie o Nginx:
   ```
   systemctl restart nginx
   ```

## 3. Implantação do Projeto

1. Crie uma pasta para o projeto:
   ```
   mkdir -p /var/www/inventory-control
   cd /var/www/inventory-control
   ```

2. Transfira os arquivos do projeto para o servidor usando SCP:
   
   Usando SCP (do seu computador local):
   ```
   scp -r ./* root@24.144.105.125:/var/www/inventory-control/
   ```

3. Instale as dependências e construa o projeto:
   ```
   npm ci
   npm run build
   ```

4. Instale as dependências de produção para o servidor:
   ```
   npm install express compression
   ```

5. Inicie a aplicação com PM2:
   ```
   pm2 start server.js --name "inventory-control"
   ```

6. Configure o PM2 para iniciar automaticamente após reinicialização:
   ```
   pm2 startup
   pm2 save
   ```

## 4. Usando os Scripts Automatizados

Para facilitar o processo, foram criados dois scripts:

1. **setup-server.sh**: Configura o servidor com todas as dependências necessárias
   ```
   ./setup-server.sh
   ```

2. **deploy.sh**: Implanta a aplicação no servidor
   ```
   ./deploy.sh
   ```

Estes scripts já estão configurados com o IP 24.144.105.125 e não precisam de parâmetros adicionais.

## 5. Manutenção e Atualizações

Para atualizar a aplicação:

1. Acesse a pasta do projeto:
   ```
   cd /var/www/inventory-control
   ```

2. Reconstrua a aplicação:
   ```
   npm ci
   npm run build
   ```

3. Reinicie o servidor:
   ```
   pm2 restart inventory-control
   ```

## 6. Monitoramento

- Verifique o status da aplicação:
  ```
  pm2 status
  ```

- Veja os logs:
  ```
  pm2 logs inventory-control
  ```

- Monitore o uso de recursos:
  ```
  pm2 monit
  ```