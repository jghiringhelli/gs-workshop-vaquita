import { createApplication } from "./app";
import { loadAppConfig } from "./config/appConfig";

export interface StartedServer {
  readonly close: () => void;
}

/**
 * Start the HTTP server for the Tanda API.
 *
 * @returns A handle that can be used to stop the server.
 */
export function startServer(): StartedServer {
  const config = loadAppConfig();
  const applicationContext = createApplication({ config });
  const server = applicationContext.app.listen(config.port, (): void => {
    process.stdout.write(`Tanda API listening on port ${config.port}\n`);
  });

  const shutdown = (): void => {
    server.close((): void => {
      applicationContext.close();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return {
    close: (): void => {
      server.close();
      applicationContext.close();
    },
  };
}

if (process.env["NODE_ENV"] !== "test") {
  startServer();
}
