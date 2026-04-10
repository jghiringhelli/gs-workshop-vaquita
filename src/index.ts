import { createApp } from "./app";
import { loadConfig } from "./config/env";

const config = loadConfig();
const app = createApp({ config });

if (require.main === module) {
  app.listen(config.port, () => {
    process.stdout.write(`Tanda API listening on port ${config.port}\n`);
  });
}

export { app };
