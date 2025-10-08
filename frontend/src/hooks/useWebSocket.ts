import { useState, useCallback, useRef, useEffect } from 'react'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WebSocketMessage {
  type: 'command' | 'output' | 'error' | 'status'
  payload: any
}

type MessageHandler = (message: WebSocketMessage) => void

// Generovat nebo získat session ID z localStorage
function getSessionId(): string {
  let sessionId = localStorage.getItem('terminal-session-id')
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('terminal-session-id', sessionId)
  }
  return sessionId
}

export function useWebSocket(onMessage?: MessageHandler) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number>()
  const reconnectAttemptsRef = useRef(0)
  const messageHandlerRef = useRef<MessageHandler | undefined>(onMessage)
  const sessionIdRef = useRef<string>(getSessionId())

  useEffect(() => {
    messageHandlerRef.current = onMessage
  }, [onMessage])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:8080/ws`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setStatus('connected')
        reconnectAttemptsRef.current = 0
        console.log('WebSocket connected')
        
        // Inicializovat session
        ws.send(JSON.stringify({
          type: 'init-session',
          payload: { sessionId: sessionIdRef.current }
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setStatus('error')
      }

      ws.onclose = () => {
        setStatus('disconnected')
        console.log('WebSocket disconnected')
        
        if (reconnectAttemptsRef.current < 5) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000))
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setStatus('error')
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setStatus('disconnected')
  }, [])

  const sendCommand = useCallback((command: string, usePTY: boolean = true) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'command',
        payload: { command, usePTY }
      }
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  const sendPTYInput = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'pty-input',
        payload: { data }
      }
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const sendPTYResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'pty-resize',
        payload: { cols, rows }
      }
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const handleMessage = (message: WebSocketMessage) => {
    if (messageHandlerRef.current) {
      messageHandlerRef.current(message)
    }
    
    switch (message.type) {
      case 'output':
        console.log('Output:', message.payload)
        break
      case 'error':
        console.error('Error:', message.payload)
        break
      case 'status':
        console.log('Status:', message.payload)
        break
    }
  }

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    status,
    connect,
    disconnect,
    sendCommand,
    sendPTYInput,
    sendPTYResize
  }
}
