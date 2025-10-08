# 🚀 Rychlý start

## Instalace a spuštění za 3 minuty

### 1. Instalace dependencies

```bash
# Nainstalovat všechny dependencies
npm run install:all
```

Tento příkaz nainstaluje:
- Root dependencies (concurrently)
- Frontend dependencies (React, Vite, xterm.js, atd.)
- MCP Server dependencies (Node.js, WebSocket, atd.)

### 2. Spuštění dev serveru

```bash
# Spustit obě služby současně
npm run dev
```

Tento příkaz spustí:
- **MCP Server** na `http://localhost:8080`
- **Frontend** na `http://localhost:3000`

### 3. Otevřít aplikaci

Otevřete prohlížeč na:
```
http://localhost:3000
```

## ✅ Co očekávat

1. **Status bar** nahoře zobrazí "Připojeno" (zelená tečka)
2. **Terminál** zobrazí přivítací zprávu
3. Můžete zadávat **příkazy**:
   - `droid` - Factory Droid CLI
   - `ls` - seznam souborů
   - `pwd` - aktuální adresář
   - `date` - datum a čas
   - `whoami` - aktuální uživatel

## 🔧 Samostatné spouštění

### MCP Server (Backend)

```bash
# Dev režim s hot reload
npm run dev:server

# Production build
npm run build:server

# Spuštění production buildu
npm run start
```

### Frontend

```bash
# Dev režim s hot reload
npm run dev:frontend

# Production build
npm run build:frontend

# Preview production buildu
cd frontend && npm run preview
```

## 📱 Instalace jako PWA

1. Otevřete aplikaci v **Chrome/Edge** na mobilu
2. Klikněte na menu (tři tečky)
3. Vyberte **"Přidat na plochu"**
4. Aplikace bude fungovat offline!

## 🐛 Řešení problémů

### Frontend se nemůže připojit k MCP serveru

```bash
# Zkontrolujte, že MCP server běží
curl http://localhost:8080

# Zkontrolujte logy serveru
npm run dev:server
```

### Port už je obsazený

Upravte porty v `.env`:
```bash
cp .env.example .env
# Editujte .env a změňte porty
```

### Příkaz "droid" nefunguje

```bash
# Zkontrolujte, že máte Factory Droid CLI nainstalovaný
droid --version

# Pokud ne, nainstalujte ho:
npm install -g @factory-ai/droid-cli
```

## 📝 Další kroky

- Přečtěte si [README.md](./README.md) pro kompletní dokumentaci
- Podívejte se na konfiguraci v [mcp-server/.env.example](./mcp-server/.env.example)
- Prozkoumejte kód v `/frontend/src` a `/mcp-server/src`

Užívejte si Factory Droid Web CLI! 🤖
