import { useState, useEffect, useRef, useCallback } from 'react'
import Terminal, { TerminalHandle } from './components/Terminal'
import StatusBar from './components/StatusBar'
import { useWebSocket } from './hooks/useWebSocket'

function App() {
  const [isConnected, setIsConnected] = useState(false)
  const terminalRef = useRef<TerminalHandle>(null)

  const handleMessage = useCallback((message: any) => {
    if (!terminalRef.current) return

    switch (message.type) {
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
        terminalRef.current.writeOutput('\r\n\x1b[1;32m➜\x1b[0m ')
        break
      case 'error':
        terminalRef.current.writeError(`\r\n${message.payload.message}\r\n\x1b[1;32m➜\x1b[0m `)
        break
    }
  }, [])

  const { status, connect, disconnect, sendCommand } = useWebSocket(handleMessage)

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  useEffect(() => {
    setIsConnected(status === 'connected')
  }, [status])

  return (
    <div className="flex flex-col h-screen bg-terminal-bg">
      <StatusBar status={status} />
      <main className="flex-1 overflow-hidden">
        <Terminal 
          ref={terminalRef}
          isConnected={isConnected}
          onCommand={sendCommand}
        />
      </main>
    </div>
  )
}

export default App
