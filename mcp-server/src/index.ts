import { WebSocketServer } from './websocket/server.js'
import { DroidBridge } from './droid/bridge.js'
import { logger } from './utils/logger.js'

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080

async function main() {
  logger.info('🚀 Starting Droid MCP Server...')

  const droidBridge = new DroidBridge()
  const wsServer = new WebSocketServer(PORT, droidBridge)

  await wsServer.start()

  logger.info(`✅ Server is running on port ${PORT}`)
  logger.info('📡 WebSocket endpoint: ws://localhost:' + PORT + '/ws')

  process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...')
    await wsServer.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    logger.info('Shutting down gracefully...')
    await wsServer.stop()
    process.exit(0)
  })
}

main().catch((error) => {
  logger.error('Failed to start server:', error)
  process.exit(1)
})
