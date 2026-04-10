import { createServer } from "node:http"
import { createApp } from "./app"
import { loadConfig } from "./config/env"

const config = loadConfig()
const app = createApp(config)
const server = createServer(app)

server.listen(config.port, () => {
  process.stdout.write(`Tanda API listening on http://localhost:${config.port}\n`)
})

process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0)
  })

  setTimeout(() => {
    process.exit(1)
  }, config.shutdownTimeoutMs).unref()
})
