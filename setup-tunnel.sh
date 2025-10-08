#!/bin/bash

# 🌐 Cloudflare Tunnel Setup Script for WebTerm
# Automatický setup pro Cloudflare Tunnel

set -e

echo "🚀 WebTerm Cloudflare Tunnel Setup"
echo "===================================="
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared není nainstalován!"
    echo ""
    echo "Instaluj pomocí:"
    echo "  macOS:  brew install cloudflare/cloudflare/cloudflared"
    echo "  Linux:  wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
    echo "          sudo dpkg -i cloudflared-linux-amd64.deb"
    exit 1
fi

echo "✅ cloudflared je nainstalován"
echo ""

# Check if already logged in
if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
    echo "📝 Přihlášení do Cloudflare..."
    cloudflared tunnel login
    echo ""
else
    echo "✅ Již jsi přihlášen do Cloudflare"
    echo ""
fi

# Check if tunnel exists
TUNNEL_NAME="webterm"
if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo "✅ Tunnel '$TUNNEL_NAME' již existuje"
else
    echo "🔨 Vytvářím tunnel '$TUNNEL_NAME'..."
    cloudflared tunnel create $TUNNEL_NAME
    echo ""
fi

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo "📋 Tunnel ID: $TUNNEL_ID"
echo ""

# Setup DNS records
echo "🌐 Nastavuji DNS záznamy..."

# Frontend
if cloudflared tunnel route dns list | grep -q "webterm.adamec.pro"; then
    echo "✅ DNS pro webterm.adamec.pro již existuje"
else
    echo "➕ Přidávám DNS záznam pro webterm.adamec.pro..."
    cloudflared tunnel route dns $TUNNEL_NAME webterm.adamec.pro
fi

# WebSocket
if cloudflared tunnel route dns list | grep -q "ws.webterm.adamec.pro"; then
    echo "✅ DNS pro ws.webterm.adamec.pro již existuje"
else
    echo "➕ Přidávám DNS záznam pro ws.webterm.adamec.pro..."
    cloudflared tunnel route dns $TUNNEL_NAME ws.webterm.adamec.pro
fi

echo ""
echo "✅ Setup dokončen!"
echo ""
echo "📝 Další kroky:"
echo "  1. Zkontroluj cloudflared.yml v root projektu"
echo "  2. Spusť tunnel pomocí: npm run tunnel"
echo "  3. Nebo pouze tunnel: npm run tunnel:only"
echo ""
echo "🌍 URL adresy:"
echo "  Frontend:  https://webterm.adamec.pro"
echo "  WebSocket: wss://ws.webterm.adamec.pro"
echo ""
echo "📚 Více info v TUNNEL.md"
