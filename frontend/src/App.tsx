import { useState, useEffect, useRef, useCallback } from 'react'
import Terminal, { TerminalHandle } from './components/Terminal'
import StatusBar from './components/StatusBar'
import { useWebSocket } from './hooks/useWebSocket'

function App() {
  const [isConnected, setIsConnected] = useState(false)
  const [currentDir, setCurrentDir] = useState('')
  const [sessionId, setSessionId] = useState<string>('')
  const terminalRef = useRef<TerminalHandle>(null)

  const handleMessage = useCallback((message: any) => {
    if (!terminalRef.current) return

    switch (message.type) {
      case 'restore-buffer':
        // Obnovit buffer po reconnectu
        if (message.payload.data && terminalRef.current) {
          // Vyčistit terminál před restore
          terminalRef.current.clear()
          
          // Zapsat buffer (už má správné \r\n z session manageru)
          terminalRef.current.writeOutput(message.payload.data)
          
          // Pokud buffer nekončí promptem, přidat ho
          if (!message.payload.data.endsWith('➜ ')) {
            terminalRef.current.writeOutput(`\r\n\x1b[1;36m${currentDir}\x1b[0m \x1b[1;32m➜\x1b[0m `)
          }
        }
        break
      case 'new-session':
        // Nová session - požádat o welcome zprávy
        console.log('New session started')
        sendCommand('', false) // prázdný příkaz jen pro získání promptu
        break
      case 'welcome':
        // Welcome zprávy od serveru
        if (message.payload.message) {
          terminalRef.current.writeOutput(message.payload.message)
        }
        break
      case 'session-ready':
        console.log('Session ready:', message.payload.sessionId)
        setSessionId(message.payload.sessionId)
        break
      case 'output':
        if (message.payload.data) {
          // Nahradit \n za \r\n pro správné zarovnání
          const formattedData = message.payload.data.replace(/\n/g, '\r\n')
          terminalRef.current.writeOutput(formattedData)
        }
        if (message.payload.error) {
          const formattedError = message.payload.error.replace(/\n/g, '\r\n')
          terminalRef.current.writeError(formattedError)
        }
        // Aktualizovat CWD pokud je v odpovědi
        let newDir = currentDir
        if (message.payload.cwd) {
          // Zobrazit plnou cestu
          setCurrentDir(message.payload.cwd)
          newDir = message.payload.cwd
        }
        terminalRef.current.writeOutput(`\r\n\x1b[1;36m${newDir}\x1b[0m \x1b[1;32m➜\x1b[0m `)
        break
      case 'pty-output':
        // PTY output už má správné \r\n
        terminalRef.current.writeOutput(message.payload.data)
        break
      case 'pty-started':
        console.log('PTY session started:', message.payload.sessionId)
        break
      case 'pty-exit':
        terminalRef.current.exitPTYMode()
        terminalRef.current.writeOutput('\r\n\x1b[90m[Process exited with code ' + message.payload.exitCode + ']\x1b[0m\r\n')
        terminalRef.current.writeOutput(`\x1b[1;36m${currentDir}\x1b[0m \x1b[1;32m➜\x1b[0m `)
        break
      case 'error':
        terminalRef.current.writeError(`\r\n${message.payload.message}\r\n\x1b[1;36m${currentDir}\x1b[0m \x1b[1;32m➜\x1b[0m `)
        break
    }
  }, [currentDir])

  const { status, connect, disconnect, sendCommand, sendPTYInput, sendPTYResize } = useWebSocket(handleMessage)

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  useEffect(() => {
    setIsConnected(status === 'connected')
  }, [status])

  return (
    <div className="flex flex-col h-screen bg-terminal-bg">
      <StatusBar status={status} sessionId={sessionId} />
      <main className="flex-1 overflow-hidden">
        <Terminal 
          ref={terminalRef}
          isConnected={isConnected}
          onCommand={sendCommand}
          onPTYInput={sendPTYInput}
          onPTYResize={sendPTYResize}
        />
      </main>
    </div>
  )
}

export default App
