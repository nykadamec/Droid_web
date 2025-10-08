# 🚀 Jak spustit Factory Droid Web CLI

## Rychlý start

### 1. Instalace závislostí (poprvé)
```bash
npm run install:all
```

### 2. Spuštění aplikace

#### Pouze frontend (HTTPS)
```bash
npm start
```
- Frontend: **https://localhost:3000**
- Vyžaduje běžící MCP server na portu 8000

#### Celá aplikace (frontend + backend)
```bash
npm run dev
```
- Frontend (HTTPS): **https://localhost:3000**
- Backend (WebSocket): **ws://localhost:8000**

#### Pouze backend (MCP server)
```bash
npm run dev:server
```
- WebSocket: **ws://localhost:8000**

## 📦 Build pro produkci

```bash
npm run build
```

Builduje:
- Frontend → `frontend/dist/`
- Backend → `mcp-server/dist/`

## 🔒 HTTPS & SSL

Frontend běží na HTTPS s certifikáty:
- `/ssl/server.key` - Private key
- `/ssl/server.crt` - Certificate
- `/ssl/server.conf` - Config

Prohlížeč může varovat před self-signed certifikátem - klikni "Advanced" → "Proceed to localhost".

## 🌐 Porty

- **Frontend (HTTPS)**: 3000
- **WebSocket Server**: 8000

## 🛠️ Skripty

| Příkaz | Popis |
|--------|-------|
| `npm start` | Spustí frontend na HTTPS |
| `npm run dev` | Spustí frontend + backend paralelně |
| `npm run dev:frontend` | Pouze frontend |
| `npm run dev:server` | Pouze backend |
| `npm run build` | Build celé aplikace |
| `npm run install:all` | Instalace všech závislostí |

## ✨ Features

- ✅ HTTPS frontend s SSL
- ✅ WebSocket komunikace (WSS)
- ✅ Real-time command auto-completion
- ✅ File/directory completion
- ✅ PTY/TTY podpora (vim, nano, droid)
- ✅ Session persistence
- ✅ Ctrl+C handling
- ✅ PWA (Progressive Web App)
