import { useState, useEffect } from 'react'
import Terminal from './components/Terminal'
import StatusBar from './components/StatusBar'
import { useWebSocket } from './hooks/useWebSocket'

function App() {
  const { status, connect, disconnect, sendCommand } = useWebSocket()
  const [isConnected, setIsConnected] = useState(false)

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
          isConnected={isConnected}
          onCommand={sendCommand}
        />
      </main>
    </div>
  )
}

export default App
