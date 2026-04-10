import { createApp } from "./app";
import { getEnvironmentConfig } from "./config/env";

const config = getEnvironmentConfig();
const app = createApp();

app.listen(config.PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`Tanda API listening on port ${config.PORT}`);
});
