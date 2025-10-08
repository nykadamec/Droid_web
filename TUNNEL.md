# 🌐 Cloudflare Tunnel Setup - WebTerm

## Předpoklady

1. **Cloudflared nainstalován:**
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

2. **Cloudflare účet** s doménou

## 🚀 První setup (jednorázově)

### 1. Login do Cloudflare
```bash
cloudflared tunnel login
```
→ Otevře prohlížeč, vyber doménu

### 2. Vytvoř tunnel
```bash
cloudflared tunnel create webterm
```
→ Vytvoří credentials: `~/.cloudflared/webterm.json`

### 3. Nastav DNS záznamy
```bash
# Frontend
cloudflared tunnel route dns webterm webterm.adamec.pro

# WebSocket
cloudflared tunnel route dns webterm ws.webterm.adamec.pro
```

### 4. Zkopíruj config
```bash
cp cloudflared.yml ~/.cloudflared/config.yml
```

## 🏃 Spuštění

### Celá aplikace + tunnel
```bash
npm run tunnel
```

### Pouze tunnel (app už běží)
```bash
npm run tunnel:only
```

### Manuální spuštění
```bash
cloudflared tunnel --config cloudflared.yml run webterm
```

## 🌍 URL adresy

Po spuštění tunnelu:

- **Frontend**: https://webterm.adamec.pro
- **WebSocket**: wss://ws.webterm.adamec.pro

## 📝 Konfigurace

### cloudflared.yml
```yaml
tunnel: webterm
credentials-file: ~/.cloudflared/webterm.json

ingress:
  - hostname: webterm.adamec.pro
    service: https://localhost:3000
    originRequest:
      noTLSVerify: true
  
  - hostname: ws.webterm.adamec.pro
    service: http://localhost:8000
    originRequest:
      noTLSVerify: true
  
  - service: http_status:404
```

## 🔧 Troubleshooting

### Tunnel nejde spustit
```bash
# Zkontroluj existující tunnely
cloudflared tunnel list

# Smaž starý tunnel
cloudflared tunnel delete webterm
```

### DNS nefunguje
```bash
# Zkontroluj DNS
cloudflared tunnel route dns list

# Přidej chybějící záznam
cloudflared tunnel route dns webterm <hostname>
```

### Connection refused
1. Zkontroluj že app běží na správných portech
2. Zkontroluj firewall
3. Zkontroluj SSL certifikáty

## 🛑 Zastavení

```bash
# Ctrl+C v terminálu kde běží cloudflared
# Nebo:
pkill cloudflared
```

## 📦 Jako služba (Linux/macOS)

### Install jako služba
```bash
sudo cloudflared service install
```

### Start/Stop služby
```bash
sudo cloudflared service start
sudo cloudflared service stop
```

## 🔐 Bezpečnost

- ✅ HTTPS/WSS end-to-end encryption
- ✅ Žádné otevřené porty v firewallu
- ✅ Cloudflare Access pro authentication (optional)
- ✅ DDoS protection zdarma

## 🌟 Produkční doporučení

1. **Použij vlastní doménu** místo `.trycloudflare.com`
2. **Nastav Cloudflare Access** pro ochranu přístupu
3. **Zapni Rate Limiting** v Cloudflare Dashboard
4. **Monitoring** přes Cloudflare Analytics
5. **SSL/TLS** mode na "Full (strict)" v Cloudflare
