import { spawn, ChildProcess } from 'child_process'
import { resolve } from 'path'
import { existsSync, statSync } from 'fs'
import { logger } from '../utils/logger.js'

interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number | null
  cwd?: string
}

export class DroidBridge {
  // Příkazy které vyžadují TTY/interaktivní režim
  private ttyRequiredCommands = new Set(['droid', 'vim', 'nano', 'top', 'htop'])
  
  // Aktuální pracovní adresář  
  private currentWorkingDirectory: string = process.cwd()

  async executeCommand(command: string): Promise<CommandResult> {
    const [cmd, ...args] = command.trim().split(' ')

    if (!cmd) {
      throw new Error('Prázdný příkaz')
    }

    // Speciální příkaz: cd
    if (cmd === 'cd') {
      return this.handleCd(args)
    }

    // Speciální příkaz: help
    if (cmd === 'help') {
      return {
        stdout: this.getHelpText(),
        stderr: '',
        exitCode: 0,
        cwd: this.currentWorkingDirectory
      }
    }

    logger.info(`Executing: ${cmd} ${args.join(' ')}`)

    // Přidat ~/.local/bin do PATH pro droid CLI
    const enhancedPath = `${process.env.HOME}/.local/bin:${process.env.PATH}`

    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn(cmd, args, {
        shell: true,
        cwd: this.currentWorkingDirectory,
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
          exitCode,
          cwd: this.currentWorkingDirectory
        })
      })

      const timeout = setTimeout(() => {
        child.kill()
        reject(new Error('Příkaz vypršel (timeout)'))
      }, 30000)

      child.on('close', () => clearTimeout(timeout))
    })
  }

  getCurrentWorkingDirectory(): string {
    return this.currentWorkingDirectory
  }

  private handleCd(args: string[]): CommandResult {
    const targetDir = args[0] || process.env.HOME || '~'
    
    try {
      // Expandovat ~ na home directory
      const expandedDir = targetDir.startsWith('~') 
        ? targetDir.replace('~', process.env.HOME || '')
        : targetDir
      
      // Resolve relative paths
      const resolvedDir = expandedDir.startsWith('/')
        ? expandedDir
        : `${this.currentWorkingDirectory}/${expandedDir}`
      
      // Normalize path
      const normalizedPath = resolve(resolvedDir)
      
      // Zkontrolovat, že adresář existuje
      if (!existsSync(normalizedPath)) {
        return {
          stdout: '',
          stderr: `cd: no such file or directory: ${targetDir}\n`,
          exitCode: 1,
          cwd: this.currentWorkingDirectory
        }
      }
      
      if (!statSync(normalizedPath).isDirectory()) {
        return {
          stdout: '',
          stderr: `cd: not a directory: ${targetDir}\n`,
          exitCode: 1,
          cwd: this.currentWorkingDirectory
        }
      }
      
      // Změnit aktuální adresář
      this.currentWorkingDirectory = normalizedPath
      logger.info(`Changed directory to: ${this.currentWorkingDirectory}`)
      
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        cwd: this.currentWorkingDirectory
      }
    } catch (error: any) {
      return {
        stdout: '',
        stderr: `cd: ${error.message}\n`,
        exitCode: 1,
        cwd: this.currentWorkingDirectory
      }
    }
  }

  needsPTY(cmd: string): boolean {
    return this.ttyRequiredCommands.has(cmd)
  }

  private getHelpText(): string {
    return `
╭─ Dostupné příkazy ──────────────────────────────╮

\x1b[1;33mNavigace:\x1b[0m
  cd <dir>     Změnit adresář
  pwd          Zobrazit aktuální adresář
  ls           Seznam souborů a složek

\x1b[1;33mSystémové příkazy:\x1b[0m
  whoami       Zobrazit aktuálního uživatele
  date         Zobrazit datum a čas
  echo         Vypsat text
  cat          Zobrazit obsah souboru
  
\x1b[1;33mInformace:\x1b[0m
  help         Zobrazit tuto nápovědu
  
\x1b[32m✅ Full system access - všechny příkazy jsou povoleny\x1b[0m

\x1b[1;33mInteraktivní příkazy:\x1b[0m
  droid        Factory Droid CLI (plná TTY podpora)
  vim, nano    Textové editory
  top, htop    System monitoring

\x1b[90m💡 Interaktivní příkazy běží v PTY režimu pro plnou podporu.\x1b[0m

╰─────────────────────────────────────────────────╯
`
  }
}
