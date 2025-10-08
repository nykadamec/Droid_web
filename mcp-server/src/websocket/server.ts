import { WebSocketServer as WSServer, WebSocket } from 'ws'
import { createServer, IncomingMessage } from 'http'
import { z } from 'zod'
import { DroidBridge } from '../droid/bridge.js'
import { PTYSession } from '../droid/pty-session.js'
import { SessionManager } from '../session/session-manager.js'
import { logger } from '../utils/logger.js'

const MessageSchema = z.object({
  type: z.enum(['command', 'ping', 'pty-input', 'pty-resize', 'init-session', 'request-welcome', 'request-files']),
  payload: z.any()
})

export class WebSocketServer {
  private wss: WSServer | null = null
  private httpServer: ReturnType<typeof createServer> | null = null
  private clients = new Set<WebSocket>()
  private ptySessions = new Map<WebSocket, PTYSession>()
  private sessionManager = new SessionManager()
  private clientSessions = new Map<WebSocket, string>()

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

    // Připravit session - klient pošle session ID v první zprávě
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
      this.clientSessions.delete(ws)
      this.clients.delete(ws)
    })

    ws.on('error', (error) => {
      logger.error({ err: error }, `WebSocket error for ${clientId}`)
      this.clients.delete(ws)
    })
  }

  private async handleMessage(ws: WebSocket, message: z.infer<typeof MessageSchema>) {
    switch (message.type) {
      case 'init-session':
        this.handleInitSession(ws, message.payload.sessionId)
        break
      case 'request-welcome':
        // Poslat welcome zprávy pro novou session
        const initialCwd = this.droidBridge.getCurrentWorkingDirectory()
        this.sendMessage(ws, {
          type: 'welcome',
          payload: {
            message: `\x1b[32m✅ Připojeno k MCP serveru\x1b[0m\r\n\r\n\x1b[90mZadejte příkaz nebo "help" pro nápovědu\x1b[0m\r\n\r\n\x1b[1;36m${initialCwd}\x1b[0m \x1b[1;32m➜\x1b[0m `
          }
        })
        break
      case 'request-files':
        await this.handleRequestFiles(ws, message.payload.prefix || '')
        break
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

  private handleInitSession(ws: WebSocket, sessionId: string): void {
    logger.info(`Initializing session: ${sessionId}`)
    
    // Přiřadit session k tomuto WebSocket
    this.clientSessions.set(ws, sessionId)
    
    // Získat nebo vytvořit session
    this.sessionManager.getOrCreateSession(sessionId)
    
    // Poslat existující buffer klientovi
    const buffer = this.sessionManager.getBuffer(sessionId)
    if (buffer && buffer.trim().length > 0) {
      this.sendMessage(ws, {
        type: 'restore-buffer',
        payload: { data: buffer }
      })
      logger.info(`Restored ${buffer.length} characters of terminal history`)
    } else {
      // Nový session - poslat welcome zprávu
      this.sendMessage(ws, {
        type: 'new-session',
        payload: {}
      })
    }
    
    this.sendMessage(ws, {
      type: 'session-ready',
      payload: { sessionId }
    })
  }

  private async handleCommand(ws: WebSocket, command: string, usePTY: boolean = true) {
    // Ignorovat prázdné příkazy
    if (!command || command.trim() === '') {
      return
    }
    
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
        
        // Uložit output do session bufferu (SessionManager normalizuje \n -> \r\n)
        const sessionId = this.clientSessions.get(ws)
        if (sessionId) {
          if (result.stdout) {
            this.sessionManager.appendToBuffer(sessionId, result.stdout)
          }
          if (result.stderr) {
            this.sessionManager.appendToBuffer(sessionId, result.stderr)
          }
          // Uložit i prompt s CWD (plná cesta)
          this.sessionManager.appendToBuffer(sessionId, `\r\n\x1b[1;36m${cwd}\x1b[0m \x1b[1;32m➜\x1b[0m `)
        }
        
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
        // Uložit PTY output do bufferu
        const sessionId = this.clientSessions.get(ws)
        if (sessionId) {
          this.sessionManager.appendToBuffer(sessionId, data)
        }
        
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

  private async handleRequestFiles(ws: WebSocket, prefix: string) {
    try {
      const { readdirSync, statSync } = await import('fs')
      const { join } = await import('path')
      
      const cwd = this.droidBridge.getCurrentWorkingDirectory()
      
      // Získat všechny soubory/složky v CWD
      const entries = readdirSync(cwd)
      
      // Filtrovat podle prefixu
      const matches = entries.filter(entry => {
        return entry.toLowerCase().startsWith(prefix.toLowerCase())
      })
      
      // Přidat '/' za složky
      const filesWithType = matches.map(entry => {
        const fullPath = join(cwd, entry)
        try {
          const stats = statSync(fullPath)
          return stats.isDirectory() ? entry + '/' : entry
        } catch {
          return entry
        }
      })
      
      this.sendMessage(ws, {
        type: 'file-completion',
        payload: {
          prefix,
          files: filesWithType
        }
      })
    } catch (error) {
      logger.error({ err: error }, 'Error getting file list')
      this.sendMessage(ws, {
        type: 'file-completion',
        payload: {
          prefix,
          files: []
        }
      })
    }
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }
}
