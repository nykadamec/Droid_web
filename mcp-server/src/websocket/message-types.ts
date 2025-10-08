// WebSocket message types pro lepší konzistenci

export const MessageTypes = {
  // Client -> Server
  INIT_SESSION: 'init-session',
  COMMAND: 'command',
  PTY_INPUT: 'pty-input',
  PTY_RESIZE: 'pty-resize',
  PING: 'ping',
  
  // Server -> Client
  STATUS: 'status',
  SESSION_READY: 'session-ready',
  NEW_SESSION: 'new-session',
  RESTORE_BUFFER: 'restore-buffer',
  OUTPUT: 'output',
  PTY_OUTPUT: 'pty-output',
  PTY_STARTED: 'pty-started',
  PTY_EXIT: 'pty-exit',
  ERROR: 'error',
  PONG: 'pong'
} as const
