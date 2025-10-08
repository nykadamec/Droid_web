# 🤖 Factory Droid Web CLI

Moderní mobilní webová aplikace pro vzdálené používání Factory Droid CLI přes prohlížeč s MCP (Model Context Protocol) integrací.

> **⚡ Rychlý start:** Pro okamžité spuštění se podívejte na [QUICKSTART.md](./QUICKSTART.md)

## 🎯 Vlastnosti

- **React 18** pro moderní UI
- **Vite 5** pro rychlý vývoj a build
- **TypeScript** pro type-safe kód
- **xterm.js** pro plnohodnotné terminálové rozhraní
- **PTY/TTY podpora** pro interaktivní příkazy (Droid CLI, vim, nano)
- **node-pty** pro real-time pseudo-terminal
- **WebSocket** real-time komunikace
- **PWA** podpora pro offline režim
- **Tailwind CSS** pro responsive design
- **Mobile-first** přístup

## 🏗️ Struktura projektu

```
/Droid_web
├── /frontend              # React 19 aplikace
│   ├── /src
│   │   ├── /components    # React komponenty
│   │   ├── /hooks         # Custom hooks
│   │   └── /services      # API služby
│   ├── vite.config.ts
│   └── package.json
│
├── /mcp-server           # MCP Server (Node.js/TypeScript)
│   ├── /src
│   │   ├── /websocket    # WebSocket server
│   │   ├── /droid        # Droid CLI bridge
│   │   └── /utils        # Utility funkce
│   ├── tsconfig.json
│   └── package.json
│
└── package.json          # Root package.json
```

## 🚀 Rychlý start

### Instalace

```bash
# Instalace všech dependencies
npm run install:all
```

### Vývoj

```bash
# Spustit obě služby současně (server + frontend)
npm run dev

# Nebo samostatně:
npm run dev:server    # MCP server na portu 8080
npm run dev:frontend  # Frontend na portu 3000
```

### Build

```bash
# Build obou projektů
npm run build

# Nebo samostatně:
npm run build:server
npm run build:frontend
```

### Produkce

```bash
# Spustit MCP server
npm start
```

## 🔧 Konfigurace

### MCP Server

Vytvořte `.env` soubor v `mcp-server/`:

```env
PORT=8080
NODE_ENV=development
LOG_LEVEL=info
```

### Frontend

Frontend se automaticky připojí k WebSocket serveru na `ws://localhost:8080/ws`.

## 📱 Použití

1. Otevřete prohlížeč na `http://localhost:3000`
2. Počkejte na připojení k MCP serveru
3. Zadejte příkazy do terminálu

### Full System Access

🔓 **Všechny systémové příkazy jsou povoleny** - žádný whitelist, plný přístup k shellu.

#### Klíčové funkce:

**Navigace:**
- `cd <dir>` - Změnit adresář (s podporou `~`, relativních a absolutních cest)
- `pwd` - Zobrazit aktuální adresář
- `ls` - Seznam souborů

**Interaktivní příkazy (PTY režim):**
- `droid` - **Factory Droid CLI** (plně funkční!)
- `vim`, `nano` - Textové editory
- `top`, `htop` - System monitoring

**Běžné příkazy:**
- Veškeré bash/zsh příkazy: `cat`, `grep`, `find`, `git`, atd.
- Skripty a programy
- Package managery: `npm`, `pip`, `brew`, atd.

💡 **Terminal podporuje:**
- ✅ Aktuální adresář v promptu (např. `~/Documents ➜`)
- ✅ Barevný výstup (ANSI colors)
- ✅ PTY režim pro interaktivní aplikace
- ✅ Persistentní working directory napříč příkazy

## 🔒 Bezpečnost

⚠️ **Full system access** - aplikace má plný přístup k systému přes shell.

**Doporučení pro produkční nasazení:**
- Spouštět v izolovaném Docker containeru
- Použít read-only file system kde je to možné
- Implementovat whitelist příkazů pro konkrétní use case
- Přidat autentizaci a autorizaci uživatelů
- Logovat všechny spuštěné příkazy

**Současná bezpečnostní opatření:**
- **Timeout** - příkazy jsou limitovány na 30 sekund
- **Validace zpráv** - WebSocket zprávy jsou validovány pomocí Zod
- **Isolated sessions** - každý WebSocket má vlastní PTY session

## 🛠️ Technologie

### Frontend
- React 19
- Vite 7
- TypeScript 5.6+
- xterm.js
- TanStack Query
- Tailwind CSS
- Vite PWA Plugin

### Backend
- Node.js 20+
- TypeScript 5.6+
- WebSocket (ws)
- **node-pty** (PTY/TTY support)
- Zod (validace)
- Pino (logging)

## 📝 API

### WebSocket Messages

**Client → Server:**
```typescript
{
  type: 'command',
  payload: { command: 'droid chat' }
}
```

**Server → Client:**
```typescript
{
  type: 'output',
  payload: { 
    data: 'Response...',
    error: '',
    exitCode: 0
  }
}
```

## 🎨 Přizpůsobení

### Přidat povolený příkaz

V `mcp-server/src/droid/bridge.ts`:

```typescript
this.allowedCommands = new Set([
  'droid',
  'your-command'  // přidat zde
])
```

### Změnit téma terminálu

V `frontend/src/components/Terminal.tsx` upravte `theme` objekt.

## 📄 Licence

MIT

## 🤝 Příspěvky

Příspěvky jsou vítány! Prosím otevřete issue nebo pull request.