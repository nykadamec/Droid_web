import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  isConnected: boolean
  onCommand: (command: string) => void
}

export default function Terminal({ isConnected, onCommand }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const commandBufferRef = useRef<string>('')

  useEffect(() => {
    if (!terminalRef.current) return

    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      theme: {
        background: '#0f172a',
        foreground: '#e2e8f0',
        cursor: '#22d3ee',
        selectionBackground: '#334155',
        black: '#1e293b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#22d3ee',
        white: '#e2e8f0',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#67e8f9',
        brightWhite: '#f1f5f9'
      },
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    xterm.loadAddon(fitAddon)
    xterm.loadAddon(webLinksAddon)
    xterm.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    xterm.writeln('🤖 Factory Droid Web CLI')
    xterm.writeln('Připojování k MCP serveru...\n')

    xterm.onData((data) => {
      const code = data.charCodeAt(0)
      
      if (code === 13) { // Enter
        xterm.write('\r\n')
        const command = commandBufferRef.current.trim()
        if (command && isConnected) {
          onCommand(command)
        }
        commandBufferRef.current = ''
        xterm.write('$ ')
      } else if (code === 127) { // Backspace
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1)
          xterm.write('\b \b')
        }
      } else if (code >= 32) { // Printable characters
        commandBufferRef.current += data
        xterm.write(data)
      }
    })

    const handleResize = () => {
      fitAddon.fit()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      xterm.dispose()
    }
  }, [])

  useEffect(() => {
    if (!xtermRef.current) return

    if (isConnected) {
      xtermRef.current.writeln('✅ Připojeno k MCP serveru\n')
      xtermRef.current.write('$ ')
    } else {
      xtermRef.current.writeln('❌ Odpojeno od MCP serveru')
    }
  }, [isConnected])

  return (
    <div className="terminal-container">
      <div 
        ref={terminalRef} 
        className="w-full h-full"
      />
    </div>
  )
}
