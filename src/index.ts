import express, { NextFunction, Request, Response } from "express";
import { env } from "./config/env";
import { initDatabase } from "./db/database";
import { AppError } from "./errors/app-error";
import { tandasRouter, usersRouter } from "./routes";

initDatabase();

export const app = express();

app.use(express.json());

// Endpoint 1/15: lightweight health check.
app.get("/api/health", (_req, res) => {
	res.json({ ok: true });
});

// Endpoints 2-4/15.
app.use("/api/users", usersRouter);

// Endpoints 5-15/15.
app.use("/api/tandas", tandasRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
	if (error instanceof AppError) {
		res.status(error.statusCode).json({
			error: {
				code: error.code,
				message: error.message,
				details: error.details,
			},
		});
		return;
	}

	res.status(500).json({
		error: {
			code: "INTERNAL_SERVER_ERROR",
			message: "Unexpected error",
		},
	});
});

if (require.main === module) {
	app.listen(env.port, () => {
		// eslint-disable-next-line no-console
		console.log(`Tanda API listening on http://localhost:${env.port}`);
	});
}
