// Inicialización de la aplicación Express.
// Configura middlewares globales, rutas principales y manejo de errores.
import express from "express";
import userRoutes from "./routes/userRoutes";
import tandaRoutes from "./routes/tandaRoutes";
import { AppError } from "./errors";

const app = express();

app.use(express.json());

// Registro de rutas principales
app.use("/api/users", userRoutes);
app.use("/api/tandas", tandaRoutes);

// Middleware de manejo de errores centralizado
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
