import { logger } from '../utils/logger.js'

interface TerminalSession {
  sessionId: string
  buffer: string[]
  maxBufferSize: number
  createdAt: Date
  lastActivity: Date
}

export class SessionManager {
  private sessions = new Map<string, TerminalSession>()
  private readonly MAX_BUFFER_SIZE = 10000 // Maximum počet řádků v bufferu
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hodin

  constructor() {
    // Čistit staré sessions každou hodinu
    setInterval(() => this.cleanupOldSessions(), 60 * 60 * 1000)
  }

  getOrCreateSession(sessionId: string): TerminalSession {
    let session = this.sessions.get(sessionId)
    
    if (!session) {
      session = {
        sessionId,
        buffer: [],
        maxBufferSize: this.MAX_BUFFER_SIZE,
        createdAt: new Date(),
        lastActivity: new Date()
      }
      this.sessions.set(sessionId, session)
      logger.info(`Created new terminal session: ${sessionId}`)
    } else {
      session.lastActivity = new Date()
    }
    
    return session
  }

  appendToBuffer(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    // Převést \n na \r\n pro správné zarovnání v xterm.js
    // Ale pouze pokud už není \r\n
    const normalizedData = data.replace(/\r?\n/g, '\r\n')
    
    // Přidat data jako string (zachovat ANSI sekvence a formatting)
    session.buffer.push(normalizedData)

    // Omezit velikost bufferu (počet chunks, ne řádků)
    if (session.buffer.length > this.MAX_BUFFER_SIZE / 10) {
      session.buffer = session.buffer.slice(-(this.MAX_BUFFER_SIZE / 10))
    }

    session.lastActivity = new Date()
  }

  getBuffer(sessionId: string): string {
    const session = this.sessions.get(sessionId)
    if (!session) return ''
    
    // Spojit buffer bez extra newlines
    return session.buffer.join('')
  }

  clearBuffer(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.buffer = []
      logger.info(`Cleared buffer for session: ${sessionId}`)
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
    logger.info(`Deleted terminal session: ${sessionId}`)
  }

  private cleanupOldSessions(): void {
    const now = Date.now()
    const deleted: string[] = []

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId)
        deleted.push(sessionId)
      }
    }

    if (deleted.length > 0) {
      logger.info(`Cleaned up ${deleted.length} old sessions: ${deleted.join(', ')}`)
    }
  }

  getSessionCount(): number {
    return this.sessions.size
  }

  getAllSessions(): string[] {
    return Array.from(this.sessions.keys())
  }
}
