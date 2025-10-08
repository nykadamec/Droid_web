import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  isConnected: boolean
  onCommand: (command: string, usePTY?: boolean) => void
  onPTYInput?: (data: string) => void
  onPTYResize?: (cols: number, rows: number) => void
}

export interface TerminalHandle {
  writeOutput: (data: string) => void
  writeError: (data: string) => void
  exitPTYMode: () => void
}

const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ isConnected, onCommand, onPTYInput, onPTYResize }, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const commandBufferRef = useRef<string>('')
  const ptyModeRef = useRef<boolean>(false)

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

    xterm.writeln('\x1b[1;36m╭─────────────────────────────────────╮\x1b[0m')
    xterm.writeln('\x1b[1;36m│  🤖 Factory Droid Web CLI          │\x1b[0m')
    xterm.writeln('\x1b[1;36m╰─────────────────────────────────────╯\x1b[0m')
    xterm.writeln('')
    xterm.writeln('Připojování k MCP serveru...')
    xterm.writeln('')

    xterm.onData((data) => {
      // PTY režim - přeposlat vše na server
      if (ptyModeRef.current && onPTYInput) {
        onPTYInput(data)
        return
      }

      // Normální režim - lokální zpracování
      const code = data.charCodeAt(0)
      
      if (code === 13) { // Enter
        xterm.write('\r\n')
        const command = commandBufferRef.current.trim()
        if (command && isConnected) {
          // Detekce PTY příkazů
          const needsPTY = ['droid', 'vim', 'nano', 'top', 'htop'].some(cmd => 
            command.startsWith(cmd)
          )
          if (needsPTY) {
            ptyModeRef.current = true
          }
          onCommand(command)
        } else if (!command) {
          xterm.write('\x1b[1;36m~\x1b[0m \x1b[1;32m➜\x1b[0m ')
        }
        commandBufferRef.current = ''
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
      if (onPTYResize && xtermRef.current) {
        onPTYResize(xterm.cols, xterm.rows)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      xterm.dispose()
    }
  }, [isConnected, onCommand])

  useImperativeHandle(ref, () => ({
    writeOutput: (data: string) => {
      if (xtermRef.current && data) {
        xtermRef.current.write(data)
      }
    },
    writeError: (data: string) => {
      if (xtermRef.current && data) {
        xtermRef.current.write(`\x1b[31m${data}\x1b[0m`)
      }
    },
    exitPTYMode: () => {
      ptyModeRef.current = false
    }
  }))

  useEffect(() => {
    if (!xtermRef.current) return

    if (isConnected) {
      xtermRef.current.writeln('\x1b[32m✅ Připojeno k MCP serveru\x1b[0m')
      xtermRef.current.writeln('')
      xtermRef.current.writeln('\x1b[90mZadejte příkaz nebo "help" pro nápovědu\x1b[0m')
      xtermRef.current.writeln('')
      xtermRef.current.write('\x1b[1;36m~\x1b[0m \x1b[1;32m➜\x1b[0m ')
    } else {
      xtermRef.current.writeln('\x1b[31m❌ Odpojeno od MCP serveru\x1b[0m')
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
})

Terminal.displayName = 'Terminal'

export default Terminal
