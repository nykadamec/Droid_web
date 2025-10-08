import * as pty from 'node-pty'
import { logger } from '../utils/logger.js'

export interface PTYSessionOptions {
  cols: number
  rows: number
  cwd?: string
  env?: Record<string, string>
}

export class PTYSession {
  private ptyProcess: pty.IPty | null = null
  private sessionId: string

  constructor(sessionId: string) {
    this.sessionId = sessionId
  }

  start(command: string, args: string[], options: PTYSessionOptions): void {
    if (this.ptyProcess) {
      throw new Error('PTY session already started')
    }
    
    // Přidat ~/.local/bin do PATH
    const enhancedPath = `${process.env.HOME}/.local/bin:${process.env.PATH}`

    this.ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: options.cwd || process.cwd(),
      env: {
        ...process.env,
        ...options.env,
        PATH: enhancedPath,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      }
    })

    logger.info(`PTY session ${this.sessionId} started: ${command} ${args.join(' ')}`)
  }

  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data)
    }
  }

  resize(cols: number, rows: number): void {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows)
      logger.info(`PTY session ${this.sessionId} resized to ${cols}x${rows}`)
    }
  }

  onData(callback: (data: string) => void): void {
    if (this.ptyProcess) {
      this.ptyProcess.onData(callback)
    }
  }

  onExit(callback: (exitCode: number, signal?: number) => void): void {
    if (this.ptyProcess) {
      this.ptyProcess.onExit(({ exitCode, signal }) => {
        logger.info(`PTY session ${this.sessionId} exited with code ${exitCode}`)
        callback(exitCode, signal)
      })
    }
  }

  kill(signal?: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill(signal)
      this.ptyProcess = null
      logger.info(`PTY session ${this.sessionId} killed`)
    }
  }

  isRunning(): boolean {
    return this.ptyProcess !== null
  }
}
