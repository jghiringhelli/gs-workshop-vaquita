import { createApp } from "./app";

const { app, config } = createApp();

app.listen(config.port, () => {
  console.log(`Tanda API listening on http://localhost:${config.port}`);
});
