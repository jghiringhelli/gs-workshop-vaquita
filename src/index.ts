// Punto de entrada principal de la aplicación.
// Inicializa el servidor Express importando la app y configurando el puerto.
import app from "./app";
import { config } from "./config";

const server = app.listen(config.port, () => {
  console.log(`Tanda API running on http://localhost:${config.port}`);
});

export default server;
