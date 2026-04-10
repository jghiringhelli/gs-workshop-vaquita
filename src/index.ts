import { createApp } from "./app";
import { getConfig } from "./config/env";

const app = createApp();
const config = getConfig();

app.listen(config.port, () => {
	console.log(`Tanda API listening on port ${config.port}`);
});
