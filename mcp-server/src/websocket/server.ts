import { WebSocketServer as WSServer, WebSocket } from 'ws'
import { createServer, IncomingMessage } from 'http'
import { z } from 'zod'
import { DroidBridge } from '../droid/bridge.js'
import { PTYSession } from '../droid/pty-session.js'
import { logger } from '../utils/logger.js'

const MessageSchema = z.object({
  type: z.enum(['command', 'ping', 'pty-input', 'pty-resize']),
  payload: z.any()
})

export class WebSocketServer {
  private wss: WSServer | null = null
  private httpServer: ReturnType<typeof createServer> | null = null
  private clients = new Set<WebSocket>()
  private ptySessions = new Map<WebSocket, PTYSession>()

  constructor(
    private port: number,
    private droidBridge: DroidBridge
  ) {}

  async start(): Promise<void> {
    this.httpServer = createServer()
    
    this.wss = new WSServer({
      server: this.httpServer,
      path: '/ws'
    })

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req)
    })

    return new Promise((resolve) => {
      this.httpServer!.listen(this.port, () => {
        logger.info(`WebSocket server listening on port ${this.port}`)
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    for (const client of this.clients) {
      client.close()
    }
    this.clients.clear()

    if (this.wss) {
      this.wss.close()
    }

    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.close(() => resolve())
      })
    }
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`
    logger.info(`Client connected: ${clientId}`)

    this.clients.add(ws)

    this.sendMessage(ws, {
      type: 'status',
      payload: { status: 'connected', message: 'Připojeno k Droid MCP serveru' }
    })

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())
        const validated = MessageSchema.parse(message)
        
        await this.handleMessage(ws, validated)
      } catch (error) {
        logger.error({ err: error }, 'Invalid message')
        this.sendMessage(ws, {
          type: 'error',
          payload: { message: 'Neplatná zpráva' }
        })
      }
    })

    ws.on('close', () => {
      logger.info(`Client disconnected: ${clientId}`)
      this.cleanupPTYSession(ws)
      this.clients.delete(ws)
    })

    ws.on('error', (error) => {
      logger.error({ err: error }, `WebSocket error for ${clientId}`)
      this.clients.delete(ws)
    })
  }

  private async handleMessage(ws: WebSocket, message: z.infer<typeof MessageSchema>) {
    switch (message.type) {
      case 'command':
        await this.handleCommand(ws, message.payload.command, message.payload.usePTY)
        break
      case 'pty-input':
        this.handlePTYInput(ws, message.payload.data)
        break
      case 'pty-resize':
        this.handlePTYResize(ws, message.payload.cols, message.payload.rows)
        break
      case 'ping':
        this.sendMessage(ws, { type: 'pong', payload: {} })
        break
    }
  }

  private async handleCommand(ws: WebSocket, command: string, usePTY: boolean = true) {
    logger.info(`Executing command: ${command} (PTY: ${usePTY})`)

    const [cmd, ...args] = command.trim().split(' ')

    // Zkontrolovat, zda příkaz vyžaduje PTY
    const needsPTY = usePTY && this.droidBridge.needsPTY(cmd)

    if (needsPTY) {
      // Použít PTY pro interaktivní příkazy
      this.startPTYSession(ws, cmd, args)
    } else {
      // Použít normální spawn pro jednoduché příkazy
      try {
        const result = await this.droidBridge.executeCommand(command)
        
        const cwd = result.cwd || this.droidBridge.getCurrentWorkingDirectory()
        this.sendMessage(ws, {
          type: 'output',
          payload: {
            data: result.stdout,
            error: result.stderr,
            exitCode: result.exitCode,
            cwd: cwd
          }
        })
      } catch (error: any) {
        logger.error({ err: error }, 'Command execution failed')
        this.sendMessage(ws, {
          type: 'error',
          payload: { message: error.message || 'Příkaz selhal' }
        })
      }
    }
  }

  private startPTYSession(ws: WebSocket, command: string, args: string[]): void {
    // Ukončit existující session
    this.cleanupPTYSession(ws)

    const sessionId = `session-${Date.now()}`
    const ptySession = new PTYSession(sessionId)

    try {
      ptySession.start(command, args, {
        cols: 80,
        rows: 24
      })

      ptySession.onData((data) => {
        this.sendMessage(ws, {
          type: 'pty-output',
          payload: { data }
        })
      })

      ptySession.onExit((exitCode) => {
        this.sendMessage(ws, {
          type: 'pty-exit',
          payload: { exitCode }
        })
        this.ptySessions.delete(ws)
      })

      this.ptySessions.set(ws, ptySession)
      
      this.sendMessage(ws, {
        type: 'pty-started',
        payload: { sessionId }
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to start PTY session')
      this.sendMessage(ws, {
        type: 'error',
        payload: { message: `Nepodařilo se spustit PTY: ${error.message}` }
      })
    }
  }

  private handlePTYInput(ws: WebSocket, data: string): void {
    const session = this.ptySessions.get(ws)
    if (session) {
      session.write(data)
    }
  }

  private handlePTYResize(ws: WebSocket, cols: number, rows: number): void {
    const session = this.ptySessions.get(ws)
    if (session) {
      session.resize(cols, rows)
    }
  }

  private cleanupPTYSession(ws: WebSocket): void {
    const session = this.ptySessions.get(ws)
    if (session) {
      session.kill()
      this.ptySessions.delete(ws)
    }
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }
}
