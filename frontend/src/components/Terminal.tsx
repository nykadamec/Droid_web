import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import CommandSuggestions from './CommandSuggestions'

interface TerminalProps {
  isConnected: boolean
  currentDir: string
  onCommand: (command: string, usePTY?: boolean) => void
  onPTYInput?: (data: string) => void
  onPTYResize?: (cols: number, rows: number) => void
  onRequestFiles?: (path: string) => void
}

export interface TerminalHandle {
  writeOutput: (data: string) => void
  writeError: (data: string) => void
  exitPTYMode: () => void
  clear: () => void
}

const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ isConnected, currentDir, onCommand, onPTYInput, onPTYResize, onRequestFiles }, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const commandBufferRef = useRef<string>('')
  const ptyModeRef = useRef<boolean>(false)
  const showSuggestionsRef = useRef<boolean>(false)
  const suggestionIndexRef = useRef<number>(0)
  const [commandInput, setCommandInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionIndex, setSuggestionIndex] = useState(0)

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

      // Ctrl+C - smazat aktuální input a nový řádek
      if (data === '\x03') { // Ctrl+C
        commandBufferRef.current = ''
        setCommandInput('')
        setShowSuggestions(false)
        showSuggestionsRef.current = false
        setSuggestionIndex(0)
        suggestionIndexRef.current = 0
        xterm.write('^C\r\n')
        // Zobrazit nový prompt - příkaz se neprovede
        xterm.write('\x1b[1;36m' + (currentDir || '~') + '\x1b[0m \x1b[1;32m➜\x1b[0m ')
        return
      }

      // Detekce ANSI escape sekvencí pro šipky PŘED normálním zpracováním
      if (data === '\x1b[A') { // Arrow Up
        if (showSuggestionsRef.current) {
          const suggestions = (window as any).__commandSuggestions || []
          if (suggestions.length > 0) {
            const newIndex = (suggestionIndexRef.current - 1 + suggestions.length) % suggestions.length
            suggestionIndexRef.current = newIndex
            setSuggestionIndex(newIndex)
          }
          return
        }
      } else if (data === '\x1b[B') { // Arrow Down
        if (showSuggestionsRef.current) {
          const suggestions = (window as any).__commandSuggestions || []
          if (suggestions.length > 0) {
            const newIndex = (suggestionIndexRef.current + 1) % suggestions.length
            suggestionIndexRef.current = newIndex
            setSuggestionIndex(newIndex)
          }
          return
        }
      } else if (data === '\t' || data === '\x09') { // Tab
        if (showSuggestionsRef.current) {
          const suggestions = (window as any).__commandSuggestions || []
          if (suggestions.length > 0 && suggestionIndexRef.current < suggestions.length) {
            handleSuggestionSelect(suggestions[suggestionIndexRef.current])
          }
          return
        }
        
        // File/directory completion pro argumenty
        const currentCmd = commandBufferRef.current || ''
        const cmdTokens = currentCmd.split(' ')
        if (cmdTokens.length > 1 && onRequestFiles) {
          // Druhé+ slovo = argument (soubor/složka)
          const finalToken = cmdTokens.slice(-1)[0] || ''
          // Uložit aktuální buffer pro pozdější re-print
          const win: any = window
          win.__currentCommandBuffer = currentCmd
          onRequestFiles(finalToken)
          return
        }
      }

      // Normální režim - lokální zpracování
      const code = data.charCodeAt(0)
      
      // DŮLEŽITÉ: Zkontrolovat buffer updates PŘED zpracováním jakéhokoli inputu!
      const win = window as any
      
      // Force update z file completion (více matches)
      if (win.__forceUpdateBuffer) {
        commandBufferRef.current = win.__forceUpdateBuffer
        win.__forceUpdateBuffer = null
        win.__currentCommandBuffer = null
        win.__updatedCommandBuffer = null
      }
      
      // Single match update z file completion
      if (win.__updatedCommandBuffer) {
        commandBufferRef.current = win.__updatedCommandBuffer
        win.__updatedCommandBuffer = null
        win.__currentCommandBuffer = null
      }
      
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
          // Prázdný příkaz - zobrazit prompt (cesta se načte ze serveru)
          xterm.write('$ ')
        }
        commandBufferRef.current = ''
        setCommandInput('')
        setShowSuggestions(false)
        showSuggestionsRef.current = false
        setSuggestionIndex(0)
        suggestionIndexRef.current = 0
      } else if (code === 127) { // Backspace
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1)
          xterm.write('\b \b')
          
          // Aktualizovat suggestions
          const cmdParts2 = (commandBufferRef.current || '').split(' ')
          const firstWord = cmdParts2[0] || ''
          const isCommand = cmdParts2.length === 1
          
          if (isCommand) {
            setCommandInput(firstWord)
            setShowSuggestions(firstWord.length > 0)
            showSuggestionsRef.current = firstWord.length > 0
          } else {
            setShowSuggestions(false)
            showSuggestionsRef.current = false
          }
          setSuggestionIndex(0)
          suggestionIndexRef.current = 0
        }
      } else if (code >= 32) { // Printable characters
        // Buffer updates už byly zpracovány výše
        commandBufferRef.current += data
        xterm.write(data)
        
        // Aktualizovat suggestions - pouze pro první slovo (samotný příkaz)
        const parts = (commandBufferRef.current || '').split(' ')
        const firstWord = parts[0] || ''
        const isCommand = parts.length === 1
        
        if (isCommand) {
          setCommandInput(firstWord)
          const shouldShow = firstWord.length > 0
          setShowSuggestions(shouldShow)
          showSuggestionsRef.current = shouldShow
        } else {
          setShowSuggestions(false)
          showSuggestionsRef.current = false
        }
        setSuggestionIndex(0)
        suggestionIndexRef.current = 0
      }
    })

    const handleResize = () => {
      try {
        fitAddon.fit()
        if (onPTYResize && xtermRef.current) {
          onPTYResize(xterm.cols, xterm.rows)
        }
      } catch (error) {
        console.warn('Fit addon resize error:', error)
      }
    }

    window.addEventListener('resize', handleResize)
    
    // Initial fit s mírným zpožděním aby se DOM stihl naloadovat
    setTimeout(() => handleResize(), 100)

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
    },
    clear: () => {
      if (xtermRef.current) {
        xtermRef.current.clear()
      }
    }
  }))

  useEffect(() => {
    if (!xtermRef.current) return

    if (isConnected) {
      // Welcome zprávy se zobrazí pouze pro novou session
      // Pro restore session se zobrazí buffer místo tohoto
    } else {
      xtermRef.current.writeln('\x1b[31m❌ Odpojeno od MCP serveru\x1b[0m')
    }
  }, [isConnected])

  const handleSuggestionSelect = (command: string) => {
    if (!xtermRef.current) return
    
    // Vymazat aktuální input (pouze to co bylo napsáno)
    const currentInput = commandBufferRef.current.split(' ')[0]
    for (let i = 0; i < currentInput.length; i++) {
      xtermRef.current.write('\b \b')
    }
    
    // Zapsat vybraný příkaz
    xtermRef.current.write(command)
    commandBufferRef.current = command
    setCommandInput('')
    setShowSuggestions(false)
    showSuggestionsRef.current = false
    setSuggestionIndex(0)
    suggestionIndexRef.current = 0
  }

  return (
    <div className="terminal-container relative">
      <div 
        ref={terminalRef} 
        className="w-full h-full"
      />
      <CommandSuggestions 
        input={commandInput}
        onSelect={handleSuggestionSelect}
        visible={showSuggestions && !ptyModeRef.current}
        selectedIndex={suggestionIndex}
      />
    </div>
  )
})

Terminal.displayName = 'Terminal'

export default Terminal
