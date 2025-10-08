import { spawn, ChildProcess } from 'child_process'
import { logger } from '../utils/logger.js'

interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

export class DroidBridge {
  private allowedCommands = new Set([
    'droid',
    'help',
    'ls',
    'pwd',
    'whoami',
    'date',
    'echo',
    'cat'
  ])

  // Příkazy které vyžadují TTY/interaktivní režim
  private ttyRequiredCommands = new Set(['droid', 'vim', 'nano', 'top', 'htop'])

  async executeCommand(command: string): Promise<CommandResult> {
    const [cmd, ...args] = command.trim().split(' ')

    if (!cmd) {
      throw new Error('Prázdný příkaz')
    }

    if (!this.isCommandAllowed(cmd)) {
      throw new Error(`Příkaz "${cmd}" není povolen. Povolené: ${Array.from(this.allowedCommands).join(', ')}`)
    }

    // Speciální příkaz: help
    if (cmd === 'help') {
      return {
        stdout: this.getHelpText(),
        stderr: '',
        exitCode: 0
      }
    }

    logger.info(`Executing: ${cmd} ${args.join(' ')}`)

    // Přidat ~/.local/bin do PATH pro droid CLI
    const enhancedPath = `${process.env.HOME}/.local/bin:${process.env.PATH}`

    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn(cmd, args, {
        shell: true,
        env: {
          ...process.env,
          PATH: enhancedPath,
          FORCE_COLOR: '1',
          TERM: 'xterm-256color'
        }
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      child.on('error', (error) => {
        logger.error({ err: error }, 'Process error')
        reject(error)
      })

      child.on('close', (exitCode) => {
        logger.info(`Command exited with code ${exitCode}`)
        resolve({
          stdout,
          stderr,
          exitCode
        })
      })

      const timeout = setTimeout(() => {
        child.kill()
        reject(new Error('Příkaz vypršel (timeout)'))
      }, 30000)

      child.on('close', () => clearTimeout(timeout))
    })
  }

  private isCommandAllowed(cmd: string): boolean {
    return this.allowedCommands.has(cmd)
  }

  addAllowedCommand(cmd: string): void {
    this.allowedCommands.add(cmd)
    logger.info(`Added allowed command: ${cmd}`)
  }

  removeAllowedCommand(cmd: string): void {
    this.allowedCommands.delete(cmd)
    logger.info(`Removed allowed command: ${cmd}`)
  }

  getAllowedCommands(): string[] {
    return Array.from(this.allowedCommands)
  }

  needsPTY(cmd: string): boolean {
    return this.ttyRequiredCommands.has(cmd)
  }

  private getHelpText(): string {
    return `
╭─ Dostupné příkazy ──────────────────────────────╮

\x1b[1;33mSystémové příkazy:\x1b[0m
  ls           Seznam souborů a složek
  pwd          Zobrazit aktuální adresář
  whoami       Zobrazit aktuálního uživatele
  date         Zobrazit datum a čas
  echo         Vypsat text
  cat          Zobrazit obsah souboru

\x1b[1;33mInformace:\x1b[0m
  help         Zobrazit tuto nápovědu

\x1b[1;33mInteraktivní příkazy:\x1b[0m
  droid        Factory Droid CLI (plná TTY podpora)
  vim, nano    Textové editory
  top, htop    System monitoring

\x1b[90m💡 Interaktivní příkazy běží v PTY režimu pro plnou podporu.\x1b[0m

╰─────────────────────────────────────────────────╯
`
  }
}
