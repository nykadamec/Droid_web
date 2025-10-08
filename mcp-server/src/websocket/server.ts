import { WebSocketServer as WSServer, WebSocket } from 'ws'
import { createServer, IncomingMessage } from 'http'
import { z } from 'zod'
import { DroidBridge } from '../droid/bridge.js'
import { logger } from '../utils/logger.js'

const MessageSchema = z.object({
  type: z.enum(['command', 'ping']),
  payload: z.any()
})

export class WebSocketServer {
  private wss: WSServer | null = null
  private httpServer: ReturnType<typeof createServer> | null = null
  private clients = new Set<WebSocket>()

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
        await this.handleCommand(ws, message.payload.command)
        break
      case 'ping':
        this.sendMessage(ws, { type: 'pong', payload: {} })
        break
    }
  }

  private async handleCommand(ws: WebSocket, command: string) {
    logger.info(`Executing command: ${command}`)

    try {
      const result = await this.droidBridge.executeCommand(command)
      
      this.sendMessage(ws, {
        type: 'output',
        payload: {
          data: result.stdout,
          error: result.stderr,
          exitCode: result.exitCode
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

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }
}
