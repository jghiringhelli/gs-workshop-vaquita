import express from 'express';
import Database from 'better-sqlite3';
import { config } from './config';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { createUserRoutes } from './routes/user.routes';

const app = express();

// Middleware
app.use(express.json());

// Initialize database
const db = new Database(config.DATABASE_PATH);
const userRepository = new UserRepository(db);
userRepository.init();

// Initialize services
const userService = new UserService(userRepository);

// Register routes
app.use('/api/users', createUserRoutes(userService));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`🫰 Tanda API running on http://localhost:${PORT}`);
});

export default app;
