import { createServer, type Server } from "node:http";

import { createApp, createApplicationContext, disposeApplicationContext } from "./app";
import { loadConfig } from "./config/env";

const config = loadConfig();
const context = createApplicationContext(config);
const app = createApp(context);
const server = createServer(app);

server.listen(config.port, () => {
	writeInfo(`API listening on http://localhost:${config.port}`);
});

registerShutdownHandlers(server);

function registerShutdownHandlers(serverInstance: Server): void {
	const shutdownSignals: ReadonlyArray<NodeJS.Signals> = ["SIGINT", "SIGTERM"];

	for (const signal of shutdownSignals) {
		process.once(signal, () => {
			shutdown(serverInstance, signal);
		});
	}
}

function shutdown(serverInstance: Server, signal: NodeJS.Signals): void {
	writeInfo(`Received ${signal}. Shutting down.`);
	serverInstance.close((error?: Error) => {
		disposeApplicationContext(context);

		if (error) {
			writeError(`Shutdown failed. ${error.message}`);
			process.exitCode = 1;
			return;
		}

		process.exitCode = 0;
	});
}

function writeInfo(message: string): void {
	process.stdout.write(`${message}\n`);
}

function writeError(message: string): void {
	process.stderr.write(`${message}\n`);
}
