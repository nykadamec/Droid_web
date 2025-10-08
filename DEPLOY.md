# 🚀 Deployment Guide - Factory Droid Web CLI

## 🌐 Cloudflare Tunnel (Doporučeno)

### Výhody:
- ✅ Žádné otevřené porty v firewallu
- ✅ HTTPS/WSS automaticky
- ✅ DDoS ochrana zdarma
- ✅ Globální CDN
- ✅ Zero-trust security

### Quick Setup:

```bash
# 1. Spusť setup skript
./setup-tunnel.sh

# 2. Spusť aplikaci s tunnelem
npm run tunnel

# 3. Otevři v prohlížeči
# https://webterm.nykadamec.dev
```

### Manuální setup:

```bash
# Login
cloudflared tunnel login

# Vytvoř tunnel
cloudflared tunnel create webterm

# Nastav DNS
cloudflared tunnel route dns webterm webterm.nykadamec.dev
cloudflared tunnel route dns webterm ws.webterm.nykadamec.dev

# Spusť
npm run tunnel
```

Detaily v [TUNNEL.md](TUNNEL.md)

---

## 🐳 Docker (WIP)

```bash
# Build
docker-compose build

# Spusť
docker-compose up -d

# Logs
docker-compose logs -f
```

---

## 🖥️ VPS / Dedicated Server

### 1. Příprava serveru

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Instaluj Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instaluj dependencies
sudo apt install -y build-essential
```

### 2. Deploy aplikace

```bash
# Clone repo
git clone <your-repo> /opt/webterm
cd /opt/webterm

# Instaluj dependencies
npm run install:all

# Build
npm run build
```

### 3. Systemd služby

**Frontend service** (`/etc/systemd/system/webterm-frontend.service`):
```ini
[Unit]
Description=WebTerm Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/webterm/frontend
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Backend service** (`/etc/systemd/system/webterm-backend.service`):
```ini
[Unit]
Description=WebTerm MCP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/webterm/mcp-server
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Enable a start:**
```bash
sudo systemctl enable webterm-frontend webterm-backend
sudo systemctl start webterm-frontend webterm-backend
sudo systemctl status webterm-frontend webterm-backend
```

### 4. Nginx Reverse Proxy

```nginx
# Frontend
server {
    listen 443 ssl http2;
    server_name webterm.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass https://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# WebSocket
server {
    listen 443 ssl http2;
    server_name ws.webterm.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## 🔐 SSL Certifikáty

### Let's Encrypt (zdarma):

```bash
# Instaluj certbot
sudo apt install -y certbot python3-certbot-nginx

# Získej certifikát
sudo certbot --nginx -d webterm.yourdomain.com -d ws.webterm.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 🔒 Bezpečnost

### 1. Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 3. Environment Variables

Vytvoř `.env` soubory:

**Frontend:**
```bash
VITE_WS_URL=wss://ws.webterm.yourdomain.com
```

**Backend:**
```bash
PORT=8000
NODE_ENV=production
LOG_LEVEL=info
```

---

## 📊 Monitoring

### PM2 (Node.js Process Manager)

```bash
# Instaluj PM2
npm install -g pm2

# Start aplikace
cd /opt/webterm
pm2 start npm --name "webterm-frontend" -- run start
pm2 start npm --name "webterm-backend" -- run start:server

# Auto-start při restartu
pm2 startup
pm2 save

# Monitoring
pm2 monit
pm2 logs
```

---

## 🔄 CI/CD

### GitHub Actions Example:

```yaml
name: Deploy WebTerm

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm run install:all
      
      - name: Build
        run: npm run build
      
      - name: Deploy to server
        run: |
          # SSH deploy script
          rsync -avz --delete dist/ user@server:/opt/webterm/
```

---

## 🧪 Production Checklist

- [ ] SSL certifikáty nastaveny
- [ ] Environment variables nakonfigurovány
- [ ] Firewall pravidla nastavena
- [ ] Fail2Ban aktivní
- [ ] Systemd services enabled
- [ ] Logs rotace nastavena
- [ ] Monitoring aktivní
- [ ] Backup strategie připravena
- [ ] DNS záznamy propagovány
- [ ] Rate limiting nakonfigurován

---

## 🆘 Troubleshooting

### Aplikace nejde spustit
```bash
# Check logs
journalctl -u webterm-frontend -f
journalctl -u webterm-backend -f

# Check processes
ps aux | grep node
netstat -tulpn | grep -E '(3000|8000)'
```

### WebSocket connection failed
```bash
# Check backend
curl http://localhost:8000/ws

# Check nginx config
sudo nginx -t
sudo systemctl restart nginx
```

### SSL errors
```bash
# Verify certs
openssl x509 -in /path/to/cert.pem -text -noout

# Renew Let's Encrypt
sudo certbot renew --force-renewal
```
